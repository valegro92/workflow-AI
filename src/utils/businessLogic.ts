import { Strategy, Workflow, Evaluation, AppState } from '../types';
import jsPDF from 'jspdf';

// 1. Calcolo Tempo Totale
export function calculateTotalTime(tempoMedio: number, frequenza: number): number {
  return tempoMedio * frequenza; // minuti al mese
}

// 2. Calcolo Score Automazione
export function calculateAutomationScore(a1: number, a2: number, a3: number, a4: number): number {
  return a1 + a2 + a3 + a4; // Range: 0-8
}

// 3. Calcolo Score Carico Cognitivo
export function calculateCognitiveScore(c1: number, c2: number, c3: number, c4: number): number {
  return c1 + c2 + c3 + c4; // Range: 0-8
}

// 4. Calcolo Strategia AI (CORE LOGIC) - Matrice 2×2
export function calculateStrategy(autoScore: number, cogScore: number): Strategy {
  if (autoScore <= 4 && cogScore <= 4) {
    return {
      name: "🔴 Mantienilo umano",
      color: "#dc3545",
      desc: "Non delegare all'IA, rimane gestione manuale"
    };
  }

  if (autoScore >= 5 && cogScore <= 4) {
    return {
      name: "🔧 Strumento automatizzato",
      color: "#17a2b8",
      desc: "Trova un tool specifico che automatizza completamente"
    };
  }

  if (autoScore <= 4 && cogScore >= 5) {
    return {
      name: "💡 Brainstorming con l'intelligenza artificiale",
      color: "#9c27b0",
      desc: "Usa l'IA come partner di pensiero per esplorare idee"
    };
  }

  // autoScore >= 5 && cogScore >= 5
  return {
    name: "🤝 Assistente AI",
    color: "#28a745",
    desc: "Crea un prompt riutilizzabile per delegare sistematicamente"
  };
}

// 5. Calcolo Priorità
export function calculatePriority(impatto: number, complessita: number): number {
  if (complessita === 0) return 0;
  return impatto / complessita; // Higher = più prioritario
}

// 5b. Calcolo Risparmio Mensile (in €)
export function calculateMonthlySavings(timeInMinutes: number, costoOrario: number): number {
  if (!costoOrario || costoOrario === 0) return 0;
  return (timeInMinutes / 60) * costoOrario;
}

// 5c. Calcolo ROI percentuale
export function calculateROI(savings: number, complessita: number): number {
  if (complessita === 0) return 0;
  // ROI semplificato: risparmio diviso per sforzo (1-5)
  // Moltiplicato per 20 per avere una scala più leggibile (%)
  return (savings / complessita) * 20;
}

// 6. Genera ID workflow progressivo
export function generateWorkflowId(workflows: Workflow[]): string {
  const maxId = workflows.reduce((max, w) => {
    const num = parseInt(w.id.substring(1));
    return num > max ? num : max;
  }, 0);

  const nextNum = maxId + 1;
  return `W${String(nextNum).padStart(3, '0')}`;
}

/**
 * Riassegna ID univoci e progressivi ai workflow con ID duplicati.
 * Aggiorna anche le chiavi delle evaluations di conseguenza.
 */
export function fixDuplicateWorkflowIds(
  workflows: Workflow[],
  evaluations: Record<string, any>
): { workflows: Workflow[]; evaluations: Record<string, any>; changed: boolean } {
  const seen = new Set<string>();
  let changed = false;
  const idMap: Record<number, string> = {}; // index -> new id (only for changed ones)
  const fixedWorkflows: Workflow[] = [];
  const assigned: Workflow[] = []; // track already-assigned for generateWorkflowId

  for (let i = 0; i < workflows.length; i++) {
    const w = workflows[i];
    if (seen.has(w.id)) {
      // Duplicato: genera un nuovo ID progressivo
      const newId = generateWorkflowId(assigned);
      idMap[i] = newId;
      const fixed = { ...w, id: newId };
      fixedWorkflows.push(fixed);
      assigned.push(fixed);
      changed = true;
    } else {
      seen.add(w.id);
      fixedWorkflows.push(w);
      assigned.push(w);
    }
  }

  if (!changed) return { workflows, evaluations, changed: false };

  // Aggiorna evaluations: mappa vecchio ID -> nuovo ID
  const newEvaluations = { ...evaluations };
  for (let i = 0; i < workflows.length; i++) {
    if (idMap[i]) {
      const oldId = workflows[i].id;
      if (newEvaluations[oldId]) {
        const eval_ = { ...newEvaluations[oldId], workflowId: idMap[i] };
        newEvaluations[idMap[i]] = eval_;
        // Non cancellare il vecchio se altri workflow lo usano ancora
        const stillUsed = fixedWorkflows.some(w => w.id === oldId);
        if (!stillUsed) delete newEvaluations[oldId];
      }
    }
  }

  return { workflows: fixedWorkflows, evaluations: newEvaluations, changed: true };
}

// 7. Calcola statistiche aggregate
export function calculateStats(workflows: Workflow[], evaluations: Record<string, Evaluation>): AppState['stats'] {
  const totalSteps = workflows.length;
  const totalTime = workflows.reduce((sum, w) => sum + w.tempoTotale, 0);

  const strategyCounts = {
    partner: 0,
    assistant: 0,
    tool: 0,
    out: 0
  };

  Object.values(evaluations).forEach(evaluation => {
    const strategyName = evaluation.strategy.name;
    if (strategyName.includes('Brainstorming')) {
      strategyCounts.partner++;
    } else if (strategyName.includes('Assistente AI')) {
      strategyCounts.assistant++;
    } else if (strategyName.includes('Strumento')) {
      strategyCounts.tool++;
    } else if (strategyName.includes('umano')) {
      strategyCounts.out++;
    }
  });

  return {
    totalSteps,
    totalTime,
    strategyCounts
  };
}

// 8. Helper: formatta minuti in formato leggibile
export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

// 9a. Calcolo AI Readiness Score (0-100)
export function calculateAIReadinessScore(
  workflows: Workflow[],
  evaluations: Record<string, Evaluation>
): { score: number; label: string; color: string } {
  const evaluated = workflows.filter(w => evaluations[w.id]);
  if (evaluated.length === 0) return { score: 0, label: 'Non calcolabile', color: '#6b7280' };

  let totalScore = 0;
  evaluated.forEach(w => {
    const ev = evaluations[w.id];
    // Combina automation + cognitive scores normalizzati a 0-100
    const workflowScore = ((ev.autoScore + ev.cogScore) / 16) * 100;
    // Peso per priorità
    const priorityWeight = Math.min(ev.priorita / 100, 1);
    totalScore += workflowScore * (0.7 + 0.3 * priorityWeight);
  });

  const avgScore = Math.round(totalScore / evaluated.length);
  const clamped = Math.min(100, Math.max(0, avgScore));

  if (clamped >= 70) return { score: clamped, label: 'Alto potenziale AI', color: '#28a745' };
  if (clamped >= 40) return { score: clamped, label: 'Potenziale moderato', color: '#ffc107' };
  return { score: clamped, label: 'Serve analisi approfondita', color: '#dc3545' };
}

// 9. Export PDF
export function exportToPDF(
  workflows: Workflow[],
  evaluations: Record<string, Evaluation>,
  nomeAzienda: string,
  costoOrario?: number,
  implementationPlan?: string
): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 20;
  const lineHeight = 7;
  const marginLeft = 15;
  const marginRight = 15;
  const contentWidth = pageWidth - marginLeft - marginRight;

  // Helper: branded footer on every page
  const addBrandedFooter = () => {
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      // Teal line
      doc.setDrawColor(45, 212, 168);
      doc.setLineWidth(0.5);
      doc.line(marginLeft, pageHeight - 18, pageWidth - marginRight, pageHeight - 18);
      // Branding text
      doc.setFontSize(7);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(140, 140, 140);
      doc.text('Creato con Workflow AI Analyzer | valentinogrossi.it', marginLeft, pageHeight - 13);
      doc.text('La Cassetta degli AI-trezzi - Tool gratuiti per l\'automazione AI', marginLeft, pageHeight - 9);
      // Page number
      doc.text(`${i} / ${totalPages}`, pageWidth - marginRight - 10, pageHeight - 13);
      doc.setTextColor(0, 0, 0);
    }
  };

  // Helper: add new page if needed
  const checkPageBreak = (requiredSpace: number = 20) => {
    if (yPosition + requiredSpace > pageHeight - 25) {
      doc.addPage();
      yPosition = 20;
      return true;
    }
    return false;
  };

  // Helper: wrap text
  const addWrappedText = (text: string, x: number, maxWidth: number, fontSize: number = 10) => {
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(text, maxWidth);
    lines.forEach((line: string) => {
      checkPageBreak();
      doc.text(line, x, yPosition);
      yPosition += lineHeight;
    });
  };

  // Helper: section title
  const addSectionTitle = (title: string) => {
    checkPageBreak(30);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(title, marginLeft, yPosition);
    yPosition += 10;
  };

  // === COVER PAGE ===
  const readiness = calculateAIReadinessScore(workflows, evaluations);
  const stats = calculateStats(workflows, evaluations);

  // Background accent bar
  doc.setFillColor(45, 212, 168);
  doc.rect(0, 0, pageWidth, 6, 'F');

  // Title block
  yPosition = 50;
  doc.setFontSize(32);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(45, 212, 168);
  doc.text('Workflow AI', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 14;
  doc.text('Analyzer', pageWidth / 2, yPosition, { align: 'center' });
  doc.setTextColor(0, 0, 0);
  yPosition += 20;

  // Subtitle
  doc.setFontSize(12);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(120, 120, 120);
  doc.text('Report di Analisi AI dei Processi Aziendali', pageWidth / 2, yPosition, { align: 'center' });
  doc.setTextColor(0, 0, 0);
  yPosition += 25;

  // Company info box
  doc.setDrawColor(45, 212, 168);
  doc.setLineWidth(1);
  doc.roundedRect(pageWidth / 2 - 60, yPosition, 120, 35, 3, 3, 'S');
  yPosition += 12;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(nomeAzienda, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Data: ${new Date().toLocaleDateString('it-IT')}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 30;

  // AI Readiness Score circle
  const scoreX = pageWidth / 2;
  const scoreY = yPosition + 15;
  const r = parseInt(readiness.color.slice(1, 3), 16);
  const g = parseInt(readiness.color.slice(3, 5), 16);
  const b = parseInt(readiness.color.slice(5, 7), 16);
  doc.setFillColor(r, g, b);
  doc.circle(scoreX, scoreY, 22, 'F');
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(`${readiness.score}`, scoreX, scoreY + 3, { align: 'center' });
  doc.setTextColor(0, 0, 0);
  yPosition = scoreY + 30;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('AI Readiness Score', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 7;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(r, g, b);
  doc.text(readiness.label, pageWidth / 2, yPosition, { align: 'center' });
  doc.setTextColor(0, 0, 0);
  yPosition += 20;

  // Quick stats on cover
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const coverStats = [
    `${workflows.length} workflow analizzati`,
    `${Object.keys(evaluations).length} valutati`,
    `${formatMinutes(stats.totalTime)} di tempo mensile`,
  ];
  coverStats.forEach(s => {
    doc.text(s, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 6;
  });

  // Cover footer
  yPosition = pageHeight - 40;
  doc.setDrawColor(45, 212, 168);
  doc.setLineWidth(0.5);
  doc.line(50, yPosition, pageWidth - 50, yPosition);
  yPosition += 8;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(120, 120, 120);
  doc.text('La Cassetta degli AI-trezzi', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 5;
  doc.text('by Valentino Grossi | valentinogrossi.it', pageWidth / 2, yPosition, { align: 'center' });
  doc.setTextColor(0, 0, 0);

  // Bottom accent bar
  doc.setFillColor(45, 212, 168);
  doc.rect(0, pageHeight - 6, pageWidth, 6, 'F');

  // === PAGE 2: Content starts ===
  doc.addPage();
  yPosition = 20;

  // === EXECUTIVE SUMMARY ===
  const totalTime = stats.totalTime;
  const totalSavings = costoOrario ? calculateMonthlySavings(totalTime, costoOrario) : null;
  const evaluatedCount = Object.keys(evaluations).length;

  doc.setDrawColor(45, 212, 168);
  doc.setLineWidth(0.5);
  doc.line(marginLeft, yPosition, pageWidth - marginRight, yPosition);
  yPosition += 8;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const summaryText = `Questo report analizza ${workflows.length} workflow aziendali${evaluatedCount > 0 ? ` (${evaluatedCount} valutati)` : ''} per identificare opportunita di automazione e integrazione con strumenti di Intelligenza Artificiale. L'analisi e basata su 8 criteri di valutazione raggruppati in due dimensioni: Automazione (ripetitivita, struttura output, istruzioni chiare, assenza decisioni contestuali) e Carico Cognitivo (tipo di lavoro, testi, volume informazioni, esplorazione prospettive). Ogni workflow viene classificato in una matrice 2x2 che suggerisce la strategia AI ottimale.`;
  addWrappedText(summaryText, marginLeft, contentWidth, 9);
  yPosition += 5;

  // === STATISTICHE OVERVIEW ===
  addSectionTitle('Statistiche Overview');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Workflow totali: ${workflows.length}`, marginLeft, yPosition);
  yPosition += 7;
  doc.text(`Workflow valutati: ${evaluatedCount}`, marginLeft, yPosition);
  yPosition += 7;
  doc.text(`Tempo mensile totale: ${formatMinutes(totalTime)} (${totalTime} min)`, marginLeft, yPosition);
  yPosition += 7;
  if (totalSavings) {
    doc.setFont('helvetica', 'bold');
    doc.text(`Risparmio potenziale: ${totalSavings.toFixed(0)} euro/mese (costo orario: ${costoOrario} euro)`, marginLeft, yPosition);
    doc.setFont('helvetica', 'normal');
    yPosition += 7;
  }
  doc.text(`Strategie: ${stats.strategyCounts.assistant} Assistente AI, ${stats.strategyCounts.tool} Strumenti, ${stats.strategyCounts.partner} Brainstorming, ${stats.strategyCounts.out} Manuale`, marginLeft, yPosition);
  yPosition += 15;

  // === TABELLA PRIORITÀ DI IMPLEMENTAZIONE ===
  const evaluatedWorkflows = workflows
    .filter(w => evaluations[w.id])
    .sort((a, b) => evaluations[b.id].priorita - evaluations[a.id].priorita);

  if (evaluatedWorkflows.length > 0) {
    addSectionTitle('Tabella Priorita di Implementazione');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('(Ordinata per priorita decrescente - inizia dai valori piu alti)', marginLeft, yPosition);
    yPosition += 8;

    // Table header
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    const colX = [marginLeft, marginLeft + 8, marginLeft + 20, marginLeft + 80, marginLeft + 115, marginLeft + 135, marginLeft + 155];
    doc.text('#', colX[0], yPosition);
    doc.text('ID', colX[1], yPosition);
    doc.text('Titolo', colX[2], yPosition);
    doc.text('Strategia', colX[3], yPosition);
    doc.text('Tempo', colX[4], yPosition);
    doc.text('Compl.', colX[5], yPosition);
    doc.text('Priorita', colX[6], yPosition);
    yPosition += 2;
    doc.setDrawColor(100);
    doc.line(marginLeft, yPosition, pageWidth - marginRight, yPosition);
    yPosition += 5;

    doc.setFont('helvetica', 'normal');
    evaluatedWorkflows.forEach((workflow, index) => {
      checkPageBreak(10);
      const evaluation = evaluations[workflow.id];
      const strategyClean = evaluation.strategy.name.replace(/[^\w\s]/gi, '').trim();

      doc.text(`${index + 1}`, colX[0], yPosition);
      doc.text(workflow.id, colX[1], yPosition);
      const titleTrunc = workflow.titolo.length > 35 ? workflow.titolo.substring(0, 33) + '...' : workflow.titolo;
      doc.text(titleTrunc, colX[2], yPosition);
      const stratTrunc = strategyClean.length > 20 ? strategyClean.substring(0, 18) + '...' : strategyClean;
      doc.text(stratTrunc, colX[3], yPosition);
      doc.text(formatMinutes(workflow.tempoTotale), colX[4], yPosition);
      doc.text(`${evaluation.complessita}/5`, colX[5], yPosition);
      doc.setFont('helvetica', 'bold');
      doc.text(`${evaluation.priorita.toFixed(1)}`, colX[6], yPosition);
      doc.setFont('helvetica', 'normal');

      if (costoOrario) {
        const savings = calculateMonthlySavings(workflow.tempoTotale, costoOrario);
        const roi = calculateROI(savings, evaluation.complessita);
        doc.text(`${savings.toFixed(0)}E/m  ROI:${roi.toFixed(0)}`, colX[6] + 18, yPosition);
      }

      yPosition += 6;
    });
    yPosition += 10;
  }

  // === MATRICE VISUALE 2x2 ===
  if (evaluatedWorkflows.length > 0) {
    checkPageBreak(130);
    addSectionTitle('Matrice Strategica 2x2');

    const matrixX = marginLeft + 15;
    const matrixY = yPosition;
    const matrixW = 120;
    const matrixH = 100;
    const midX = matrixX + matrixW / 2;
    const midY = matrixY + matrixH / 2;

    // Draw grid
    doc.setDrawColor(180);
    doc.setLineWidth(0.3);
    doc.rect(matrixX, matrixY, matrixW, matrixH);
    doc.setDrawColor(200);
    doc.setLineWidth(0.2);
    doc.line(midX, matrixY, midX, matrixY + matrixH);
    doc.line(matrixX, midY, matrixX + matrixW, midY);
    doc.setLineWidth(0.3);

    // Axis labels
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Score Automazione (0-8)', matrixX + matrixW / 2 - 20, matrixY + matrixH + 8);
    doc.text('0', matrixX - 3, matrixY + matrixH + 3);
    doc.text('8', matrixX + matrixW + 1, matrixY + matrixH + 3);

    // Y axis label (rotated text not supported easily, use simple labels)
    doc.text('Cogn.', matrixX - 13, matrixY + matrixH / 2);
    doc.text('8', matrixX - 5, matrixY + 3);
    doc.text('0', matrixX - 5, matrixY + matrixH + 3);

    // Quadrant labels
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(156, 39, 176); // purple
    doc.text('Brainstorming AI', matrixX + 2, matrixY + 6);
    doc.setTextColor(40, 167, 69); // green
    doc.text('Assistente AI', midX + 2, matrixY + 6);
    doc.setTextColor(220, 53, 69); // red
    doc.text('Mantieni Umano', matrixX + 2, midY + 6);
    doc.setTextColor(23, 162, 184); // cyan
    doc.text('Strumento Auto', midX + 2, midY + 6);
    doc.setTextColor(0, 0, 0);

    // Plot workflow points
    const strategyColors: Record<string, [number, number, number]> = {
      'Brainstorming': [156, 39, 176],
      'Assistente AI': [40, 167, 69],
      'Strumento': [23, 162, 184],
      'umano': [220, 53, 69],
    };

    evaluatedWorkflows.forEach((w) => {
      const ev = evaluations[w.id];
      // Map scores to position: autoScore on X (0-8 → matrixX to matrixX+matrixW), cogScore on Y (0-8 → matrixY+matrixH to matrixY, inverted)
      const px = matrixX + (ev.autoScore / 8) * matrixW;
      const py = matrixY + matrixH - (ev.cogScore / 8) * matrixH;

      // Find color
      let dotColor: [number, number, number] = [100, 100, 100];
      for (const [key, color] of Object.entries(strategyColors)) {
        if (ev.strategy.name.includes(key)) {
          dotColor = color;
          break;
        }
      }

      doc.setFillColor(dotColor[0], dotColor[1], dotColor[2]);
      doc.circle(px, py, 2, 'F');
      doc.setFontSize(6);
      doc.setTextColor(dotColor[0], dotColor[1], dotColor[2]);
      doc.text(w.id, px + 3, py + 1);
    });

    doc.setTextColor(0, 0, 0);
    yPosition = matrixY + matrixH + 15;
  }

  // === MAPPA DELLE OPPORTUNITÀ AI (testuale) ===
  addSectionTitle('Mappa delle Opportunita AI');

  const strategyGroups: { label: string; desc: string; filter: string }[] = [
    { label: 'Brainstorming (Auto BASSA / Cogn. ALTO)', desc: 'Partner di pensiero per esplorare idee', filter: 'Brainstorming' },
    { label: 'Assistente AI (Auto ALTA / Cogn. ALTO)', desc: 'Prompt riutilizzabile per delegare', filter: 'Assistente AI' },
    { label: 'Strumento Automatizzato (Auto ALTA / Cogn. BASSO)', desc: 'Tool specifico per automatizzare', filter: 'Strumento' },
    { label: 'Mantieni Umano (Auto BASSA / Cogn. BASSO)', desc: 'Gestione manuale, non delegare', filter: 'umano' },
  ];

  strategyGroups.forEach(group => {
    const groupWorkflows = workflows.filter(w => {
      const ev = evaluations[w.id];
      return ev && ev.strategy.name.includes(group.filter);
    });

    if (groupWorkflows.length === 0) return;

    checkPageBreak(20);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`${group.label} (${groupWorkflows.length})`, marginLeft, yPosition);
    yPosition += 5;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text(group.desc, marginLeft + 3, yPosition);
    yPosition += 5;
    doc.setFont('helvetica', 'normal');
    groupWorkflows.forEach(w => {
      checkPageBreak(8);
      doc.text(`- [${w.id}] ${w.titolo} (${formatMinutes(w.tempoTotale)}/mese)`, marginLeft + 5, yPosition);
      yPosition += 5;
    });
    yPosition += 3;
  });
  yPosition += 5;

  // === RACCOMANDAZIONI PERSONALIZZATE ===
  const recs: { label: string; filter: string; text: string }[] = [
    { label: 'Brainstorming con AI', filter: 'Brainstorming', text: 'Non standardizzabili ma richiedono ragionamento e creativita. Usa l\'IA come partner di pensiero: contesto ben definito, domande aperte, valuta le proposte e itera.' },
    { label: 'Assistente AI', filter: 'Assistente AI', text: 'Cognitivamente impegnativi ma ripetitivi. Crea un prompt strutturato come risorsa riutilizzabile: definisci ruolo, input, output e regole con precisione.' },
    { label: 'Strumento Automatizzato', filter: 'Strumento', text: 'Cosi operativi e ripetitivi che non richiedono intervento umano. Identifica uno strumento specializzato, configuralo, testalo e lascialo eseguire.' },
  ];

  const hasRecs = recs.some(r => workflows.some(w => evaluations[w.id]?.strategy.name.includes(r.filter)));
  if (hasRecs) {
    addSectionTitle('Raccomandazioni Personalizzate');

    recs.forEach(rec => {
      const recWorkflows = workflows.filter(w => evaluations[w.id]?.strategy.name.includes(rec.filter));
      if (recWorkflows.length === 0) return;

      checkPageBreak(20);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`${rec.label} (${recWorkflows.length} step)`, marginLeft, yPosition);
      yPosition += 6;
      addWrappedText(rec.text, marginLeft + 3, contentWidth - 6, 9);
      yPosition += 3;
    });
    yPosition += 5;
  }

  // === WORKFLOW DETTAGLIATI ===
  addSectionTitle('Workflow Dettagliati');

  workflows.forEach((workflow) => {
    const evaluation = evaluations[workflow.id];

    checkPageBreak(70);

    // ID e Titolo
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`[${workflow.id}] ${workflow.titolo}`, marginLeft, yPosition);
    yPosition += 7;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    // Descrizione
    if (workflow.descrizione) {
      addWrappedText(workflow.descrizione, marginLeft + 5, contentWidth - 10, 8);
      yPosition += 2;
    }

    // Dettagli workflow
    doc.setFontSize(9);
    doc.text(`Fase: ${workflow.fase}`, marginLeft + 5, yPosition);
    yPosition += 6;
    doc.text(`Tempo: ${workflow.tempoMedio} min x ${workflow.frequenza}/mese = ${formatMinutes(workflow.tempoTotale)}/mese`, marginLeft + 5, yPosition);
    yPosition += 6;

    if (workflow.owner) {
      doc.text(`Owner: ${workflow.owner}`, marginLeft + 5, yPosition);
      yPosition += 6;
    }

    if (workflow.csat !== undefined && workflow.csat > 0) {
      doc.text(`CSAT: ${workflow.csat}/5`, marginLeft + 5, yPosition);
      yPosition += 6;
    }

    if (workflow.errori !== undefined && workflow.errori > 0) {
      doc.text(`Tasso errori: ${workflow.errori}%`, marginLeft + 5, yPosition);
      yPosition += 6;
    }

    if (workflow.tool.length > 0 && workflow.tool[0] !== '') {
      addWrappedText(`Tool: ${workflow.tool.join(', ')}`, marginLeft + 5, contentWidth - 10, 9);
    }

    if (workflow.input.length > 0 && workflow.input[0] !== '') {
      addWrappedText(`Input: ${workflow.input.join(', ')}`, marginLeft + 5, contentWidth - 10, 9);
    }

    if (workflow.output.length > 0 && workflow.output[0] !== '') {
      addWrappedText(`Output: ${workflow.output.join(', ')}`, marginLeft + 5, contentWidth - 10, 9);
    }

    if (evaluation) {
      doc.text(`Strategia: ${evaluation.strategy.name.replace(/[^\w\s]/gi, '')}`, marginLeft + 5, yPosition);
      yPosition += 6;
      doc.text(`Score: Automazione ${evaluation.autoScore}/8, Carico Cognitivo ${evaluation.cogScore}/8`, marginLeft + 5, yPosition);
      yPosition += 6;

      // Breakdown valutazione individuale
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      doc.text(`  Auto: a1=${evaluation.a1} a2=${evaluation.a2} a3=${evaluation.a3} a4=${evaluation.a4}  |  Cogn: c1=${evaluation.c1} c2=${evaluation.c2} c3=${evaluation.c3} c4=${evaluation.c4}`, marginLeft + 8, yPosition);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(9);
      yPosition += 5;

      doc.text(`Complessita: ${evaluation.complessita}/5, Priorita: ${evaluation.priorita.toFixed(1)}`, marginLeft + 5, yPosition);
      yPosition += 6;

      if (costoOrario) {
        const savings = calculateMonthlySavings(workflow.tempoTotale, costoOrario);
        const roi = calculateROI(savings, evaluation.complessita);
        doc.setFont('helvetica', 'bold');
        doc.text(`Risparmio: ${savings.toFixed(0)} euro/mese, ROI: ${roi.toFixed(0)}%`, marginLeft + 5, yPosition);
        doc.setFont('helvetica', 'normal');
        yPosition += 6;
      }
    }

    if (workflow.painPoints) {
      addWrappedText(`Pain points: ${workflow.painPoints}`, marginLeft + 5, contentWidth - 10, 9);
    }

    if (workflow.note) {
      addWrappedText(`Note: ${workflow.note}`, marginLeft + 5, contentWidth - 10, 8);
    }

    // Tags
    const tags: string[] = [];
    if (workflow.pii) tags.push('Dati Personali (PII)');
    if (workflow.hitl) tags.push('Supervisione Umana (HITL)');
    if (workflow.citazioni) tags.push('Citazioni Fonti');
    if (tags.length > 0) {
      doc.text(`Flag: ${tags.join(' | ')}`, marginLeft + 5, yPosition);
      yPosition += 6;
    }

    // Separator line
    doc.setDrawColor(220);
    doc.setLineWidth(0.2);
    doc.line(marginLeft + 5, yPosition, pageWidth - marginRight - 5, yPosition);
    yPosition += 8;
  });

  // === PIANO DI IMPLEMENTAZIONE AI ===
  if (implementationPlan) {
    checkPageBreak(30);

    // Parse markdown e renderizza con formattazione
    const lines = implementationPlan.split('\n');

    lines.forEach((line) => {
      const trimmedLine = line.trim();

      // Skip empty lines (add small space)
      if (!trimmedLine) {
        yPosition += 3;
        return;
      }

      checkPageBreak(15);

      // H2 headers (## Title)
      if (trimmedLine.startsWith('## ')) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        const text = trimmedLine.replace(/^##\s*/, '');
        doc.text(text, marginLeft, yPosition);
        yPosition += 10;
        return;
      }

      // H3 headers (### Title)
      if (trimmedLine.startsWith('### ')) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        const text = trimmedLine.replace(/^###\s*/, '');
        doc.text(text, marginLeft + 3, yPosition);
        yPosition += 8;
        return;
      }

      // Bold lines (starts with **)
      if (trimmedLine.startsWith('**') || trimmedLine.match(/^\*\*\[/)) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        const text = trimmedLine.replace(/\*\*/g, '');
        const lines = doc.splitTextToSize(text, contentWidth - 10);
        lines.forEach((l: string) => {
          checkPageBreak();
          doc.text(l, marginLeft + 5, yPosition);
          yPosition += 6;
        });
        return;
      }

      // List items (- item or * item)
      if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        const text = trimmedLine.replace(/^[-*]\s*/, '• ');
        const lines = doc.splitTextToSize(text, contentWidth - 15);
        lines.forEach((l: string) => {
          checkPageBreak();
          doc.text(l, marginLeft + 8, yPosition);
          yPosition += 5.5;
        });
        return;
      }

      // Sub-items (  - item or indented)
      if (trimmedLine.match(/^\s{2,}[-*]/)) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        const text = trimmedLine.replace(/^\s+[-*]\s*/, '  - ');
        const lines = doc.splitTextToSize(text, contentWidth - 20);
        lines.forEach((l: string) => {
          checkPageBreak();
          doc.text(l, marginLeft + 12, yPosition);
          yPosition += 5.5;
        });
        return;
      }

      // Regular paragraphs
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const cleanText = trimmedLine.replace(/\*\*/g, '').replace(/\*/g, '');
      const lines = doc.splitTextToSize(cleanText, contentWidth - 10);
      lines.forEach((l: string) => {
        checkPageBreak();
        doc.text(l, marginLeft + 5, yPosition);
        yPosition += 5.5;
      });
    });
  }

  // === COME USARE QUESTO REPORT ===
  checkPageBreak(60);
  addSectionTitle('Come Usare Questo Report');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  const guideItems = [
    '1. Inizia dai workflow con priorita piu alta nella tabella (alto impatto, bassa complessita).',
    '2. Per "Assistente AI": crea un prompt strutturato con ruolo, input, output e regole. Testalo e iteralo.',
    '3. Per "Strumento Automatizzato": cerca un tool dedicato (Zapier, Make, n8n), configuralo e automatizza.',
    '4. Per "Brainstorming AI": usa ChatGPT/Claude come partner di pensiero con contesto ben definito.',
    '5. Per "Mantieni Umano": non forzare l\'automazione, concentra le risorse altrove.',
    '6. Rivedi l\'analisi ogni 3-6 mesi: nuovi strumenti AI emergono continuamente.',
    '7. Misura i risultati: confronta tempo risparmiato vs tempo stimato per validare le priorita.',
  ];

  guideItems.forEach(item => {
    checkPageBreak(10);
    addWrappedText(item, marginLeft + 3, contentWidth - 6, 9);
    yPosition += 1;
  });

  // === CTA PAGE (for low readiness scores) ===
  if (readiness.score < 50) {
    doc.addPage();
    yPosition = 50;

    doc.setFillColor(45, 212, 168);
    doc.rect(0, 0, pageWidth, 6, 'F');

    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Hai bisogno di supporto?', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    const ctaLines = [
      'Il tuo AI Readiness Score indica che i tuoi processi potrebbero',
      'beneficiare di un\'analisi approfondita con un esperto.',
      '',
      'Prenota una consulenza gratuita di 30 minuti per:',
    ];
    ctaLines.forEach(line => {
      doc.text(line, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 7;
    });
    yPosition += 3;

    doc.setFont('helvetica', 'bold');
    const bullets = [
      'Identificare le quick wins nascoste nei tuoi workflow',
      'Costruire una roadmap di automazione personalizzata',
      'Scegliere gli strumenti AI giusti per il tuo caso',
    ];
    bullets.forEach(b => {
      doc.text(`• ${b}`, 40, yPosition);
      yPosition += 8;
    });

    yPosition += 15;
    doc.setFontSize(12);
    doc.setTextColor(45, 212, 168);
    doc.text('Prenota qui: calendar.app.google/5ows3q4UNPKwEkCdA', pageWidth / 2, yPosition, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    yPosition += 15;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(120, 120, 120);
    doc.text('Valentino Grossi | valentinogrossi.it', pageWidth / 2, yPosition, { align: 'center' });
    doc.text('La Cassetta degli AI-trezzi', pageWidth / 2, yPosition + 5, { align: 'center' });
    doc.setTextColor(0, 0, 0);

    doc.setFillColor(45, 212, 168);
    doc.rect(0, pageHeight - 6, pageWidth, 6, 'F');
  }

  // === BRANDED FOOTER ON ALL PAGES ===
  addBrandedFooter();

  // === DOWNLOAD ===
  const sanitizedName = nomeAzienda
    .replace(/[^a-zA-Z0-9]/g, '-')
    .toLowerCase();
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `workflow-ai-${sanitizedName}-${timestamp}.pdf`;

  doc.save(filename);
}

// 10. Get color for time (conditional formatting)
export function getTimeColor(timeInMinutes: number): string {
  if (timeInMinutes < 60) return '#28a745'; // verde
  if (timeInMinutes <= 120) return '#ffc107'; // giallo
  return '#dc3545'; // rosso
}

// 11. Genera piano di implementazione client-side (fallback quando API non disponibile)
export function generateLocalImplementationPlan(
  workflows: Workflow[],
  evaluations: Record<string, Evaluation>,
  costoOrario?: number
): string {
  const evaluated = workflows
    .filter(w => evaluations[w.id])
    .sort((a, b) => evaluations[b.id].priorita - evaluations[a.id].priorita);

  if (evaluated.length === 0) return '';

  const stats = calculateStats(workflows, evaluations);
  const totalTime = stats.totalTime;
  const totalSavings = costoOrario ? calculateMonthlySavings(totalTime, costoOrario) : null;

  const strategyName = (ev: Evaluation) => ev.strategy.name.replace(/[^\w\sà-ú]/gi, '').trim();

  // Quick wins: alta priorità, bassa complessità
  const quickWins = evaluated.filter(w => evaluations[w.id].complessita <= 2 && evaluations[w.id].priorita > 50).slice(0, 3);
  // Medium: complessità media
  const medium = evaluated.filter(w => evaluations[w.id].complessita > 2 && evaluations[w.id].complessita <= 3).slice(0, 3);
  // Long term: alta complessità
  const longTerm = evaluated.filter(w => evaluations[w.id].complessita > 3).slice(0, 3);

  // Se i bucket sono vuoti, distribuiamo per posizione
  const allSorted = [...evaluated];
  const quickWinsFinal = quickWins.length > 0 ? quickWins : allSorted.slice(0, Math.min(2, allSorted.length));
  const mediumFinal = medium.length > 0 ? medium : allSorted.slice(quickWinsFinal.length, quickWinsFinal.length + 2);
  const longTermFinal = longTerm.length > 0 ? longTerm : allSorted.slice(quickWinsFinal.length + mediumFinal.length, quickWinsFinal.length + mediumFinal.length + 2);

  const piiWorkflows = evaluated.filter(w => workflows.find(wf => wf.id === w.id)?.pii);
  const hitlFalse = evaluated.filter(w => !workflows.find(wf => wf.id === w.id)?.hitl);
  const manualWorkflows = evaluated.filter(w => evaluations[w.id].strategy.name.includes('umano'));

  let plan = `## Analisi Overview\n`;
  plan += `- Workflow totali analizzati: ${evaluated.length}\n`;
  plan += `- Tempo mensile totale: ${formatMinutes(totalTime)}\n`;
  if (totalSavings) {
    plan += `- Risparmio mensile potenziale: ${totalSavings.toFixed(0)} euro\n`;
  }
  plan += `- Distribuzione: ${stats.strategyCounts.assistant} Assistente AI, ${stats.strategyCounts.tool} Strumenti, ${stats.strategyCounts.partner} Brainstorming, ${stats.strategyCounts.out} Manuale\n\n`;

  // Quick Wins
  plan += `## Quick Wins (0-30 giorni)\n`;
  if (quickWinsFinal.length > 0) {
    quickWinsFinal.forEach(w => {
      const ev = evaluations[w.id];
      const savings = costoOrario ? calculateMonthlySavings(w.tempoTotale, costoOrario) : null;
      plan += `\n**[${w.id}] ${w.titolo}** (Priorita: ${ev.priorita.toFixed(1)})\n`;
      plan += `- Strategia: ${strategyName(ev)}\n`;
      plan += `- Perche e un quick win: complessita ${ev.complessita}/5 con impatto di ${formatMinutes(w.tempoTotale)}/mese\n`;
      if (ev.strategy.name.includes('Assistente')) {
        plan += `- Azione: Crea un prompt strutturato con ruolo, input attesi, formato output e regole. Testalo su 5-10 casi reali.\n`;
      } else if (ev.strategy.name.includes('Strumento')) {
        plan += `- Azione: Cerca un tool dedicato (Zapier, Make, n8n) che integri ${w.tool.join(', ') || 'i tool attuali'}. Configura e testa.\n`;
      } else if (ev.strategy.name.includes('Brainstorming')) {
        plan += `- Azione: Prepara un contesto dettagliato e usa AI come partner di pensiero. Definisci domande aperte e itera.\n`;
      }
      if (savings) {
        plan += `- ROI atteso: ${savings.toFixed(0)} euro/mese\n`;
      }
    });
  } else {
    plan += `Nessun quick win identificato con i criteri attuali.\n`;
  }

  // Medium Term
  plan += `\n## Medium Term (30-60 giorni)\n`;
  if (mediumFinal.length > 0) {
    mediumFinal.forEach(w => {
      const ev = evaluations[w.id];
      plan += `\n**[${w.id}] ${w.titolo}** (Priorita: ${ev.priorita.toFixed(1)})\n`;
      plan += `- Strategia: ${strategyName(ev)}\n`;
      plan += `- Complessita: ${ev.complessita}/5 - richiede preparazione e test\n`;
      if (w.painPoints) plan += `- Pain points da risolvere: ${w.painPoints}\n`;
    });
  } else {
    plan += `Tutti i workflow sono gia stati classificati come quick win o long term.\n`;
  }

  // Long Term
  plan += `\n## Long Term (60-90 giorni)\n`;
  if (longTermFinal.length > 0) {
    longTermFinal.forEach(w => {
      const ev = evaluations[w.id];
      plan += `\n**[${w.id}] ${w.titolo}** (Complessita: ${ev.complessita}/5)\n`;
      plan += `- Strategia: ${strategyName(ev)}\n`;
      plan += `- Valore strategico: ${formatMinutes(w.tempoTotale)}/mese di tempo liberato\n`;
    });
  }

  // Attenzioni
  plan += `\n## Attenzioni Critiche\n`;
  if (piiWorkflows.length > 0) {
    plan += `- **Workflow con dati personali (PII)**: ${piiWorkflows.map(w => w.id).join(', ')} - Richiede compliance GDPR prima dell'automazione\n`;
  }
  if (hitlFalse.length > 0) {
    plan += `- **Workflow senza supervisione umana**: ${hitlFalse.map(w => w.id).join(', ')} - Valuta se aggiungere controllo umano per workflow critici\n`;
  }
  if (manualWorkflows.length > 0) {
    plan += `- **Workflow "Mantieni umano"**: ${manualWorkflows.map(w => w.id).join(', ')} - Rivaluta periodicamente se nuovi tool AI li rendono automatizzabili\n`;
  }

  // Raccomandazioni
  plan += `\n## Raccomandazioni Strategiche\n`;
  plan += `- Inizia dai quick wins per costruire momentum e dimostrare valore\n`;
  plan += `- Misura il tempo risparmiato dopo ogni implementazione per validare le stime\n`;
  plan += `- Rivedi questa analisi ogni 3-6 mesi: il panorama AI evolve rapidamente\n`;
  plan += `- Forma il team sull'uso degli strumenti AI selezionati\n`;
  if (costoOrario) {
    plan += `- Con un costo orario di ${costoOrario} euro, il risparmio totale stimato e di ${totalSavings?.toFixed(0)} euro/mese\n`;
  }

  plan += `\n---\n*Piano generato automaticamente dal Workflow AI Analyzer - La Cassetta degli AI-trezzi*\n`;

  return plan;
}
