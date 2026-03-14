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

// 8. Export PDF
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

  // Helper: add new page if needed
  const checkPageBreak = (requiredSpace: number = 20) => {
    if (yPosition + requiredSpace > pageHeight - 20) {
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

  // === HEADER ===
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Workflow AI Analyzer', marginLeft, yPosition);
  yPosition += 10;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Azienda: ${nomeAzienda}`, marginLeft, yPosition);
  yPosition += 7;
  doc.text(`Data: ${new Date().toLocaleDateString('it-IT')}`, marginLeft, yPosition);
  yPosition += 15;

  // === STATISTICHE OVERVIEW ===
  const stats = calculateStats(workflows, evaluations);
  const totalTime = stats.totalTime;
  const totalSavings = costoOrario ? calculateMonthlySavings(totalTime, costoOrario) : null;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Statistiche Overview', marginLeft, yPosition);
  yPosition += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Workflow totali: ${workflows.length}`, marginLeft, yPosition);
  yPosition += 7;
  doc.text(`Tempo mensile totale: ${totalTime} minuti`, marginLeft, yPosition);
  yPosition += 7;
  if (totalSavings) {
    doc.text(`Risparmio potenziale: €${totalSavings.toFixed(2)}/mese`, marginLeft, yPosition);
    yPosition += 7;
  }
  doc.text(`Strategie: ${stats.strategyCounts.assistant} Assistente AI, ${stats.strategyCounts.tool} Strumenti, ${stats.strategyCounts.partner} Brainstorming, ${stats.strategyCounts.out} Manuale`, marginLeft, yPosition);
  yPosition += 15;

  // === TABELLA PRIORITÀ DI IMPLEMENTAZIONE ===
  const evaluatedWorkflows = workflows
    .filter(w => evaluations[w.id])
    .sort((a, b) => evaluations[b.id].priorita - evaluations[a.id].priorita);

  if (evaluatedWorkflows.length > 0) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Tabella Priorita di Implementazione', marginLeft, yPosition);
    yPosition += 8;

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
    doc.text('min/mese', colX[4], yPosition);
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
      doc.text(`${workflow.tempoTotale}`, colX[4], yPosition);
      doc.text(`${evaluation.complessita}/5`, colX[5], yPosition);
      doc.setFont('helvetica', 'bold');
      doc.text(`${evaluation.priorita.toFixed(1)}`, colX[6], yPosition);
      doc.setFont('helvetica', 'normal');

      if (costoOrario) {
        const savings = calculateMonthlySavings(workflow.tempoTotale, costoOrario);
        const roi = calculateROI(savings, evaluation.complessita);
        doc.text(`${savings.toFixed(0)}€/m  ROI:${roi.toFixed(0)}`, colX[6] + 18, yPosition);
      }

      yPosition += 6;
    });
    yPosition += 10;
  }

  // === MAPPA DELLE OPPORTUNITÀ AI ===
  checkPageBreak(40);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Mappa delle Opportunita AI', marginLeft, yPosition);
  yPosition += 10;

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
      doc.text(`- [${w.id}] ${w.titolo}`, marginLeft + 5, yPosition);
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
    checkPageBreak(30);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Raccomandazioni Personalizzate', marginLeft, yPosition);
    yPosition += 10;

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
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Workflow Dettagliati', marginLeft, yPosition);
  yPosition += 10;

  workflows.forEach((workflow) => {
    const evaluation = evaluations[workflow.id];

    checkPageBreak(50);

    // ID e Titolo
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`[${workflow.id}] ${workflow.titolo}`, marginLeft, yPosition);
    yPosition += 7;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    // Dettagli workflow
    doc.text(`Fase: ${workflow.fase}`, marginLeft + 5, yPosition);
    yPosition += 6;
    doc.text(`Tempo: ${workflow.tempoMedio} min x ${workflow.frequenza}/mese = ${workflow.tempoTotale} min/mese`, marginLeft + 5, yPosition);
    yPosition += 6;

    if (workflow.owner) {
      doc.text(`Owner: ${workflow.owner}`, marginLeft + 5, yPosition);
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
      doc.text(`Complessita: ${evaluation.complessita}/5, Priorita: ${evaluation.priorita.toFixed(1)}`, marginLeft + 5, yPosition);
      yPosition += 6;

      if (costoOrario) {
        const savings = calculateMonthlySavings(workflow.tempoTotale, costoOrario);
        const roi = calculateROI(savings, evaluation.complessita);
        doc.text(`Risparmio: ${savings.toFixed(0)} euro/mese, ROI: ${roi.toFixed(0)}`, marginLeft + 5, yPosition);
        yPosition += 6;
      }
    }

    if (workflow.painPoints) {
      addWrappedText(`Pain points: ${workflow.painPoints}`, marginLeft + 5, contentWidth - 10, 9);
    }

    // Tags
    const tags: string[] = [];
    if (workflow.pii) tags.push('PII');
    if (workflow.hitl) tags.push('HITL');
    if (workflow.citazioni) tags.push('Citazioni');
    if (tags.length > 0) {
      doc.text(`Flag: ${tags.join(', ')}`, marginLeft + 5, yPosition);
      yPosition += 6;
    }

    yPosition += 5;
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
        const text = trimmedLine.replace(/^\s+[-*]\s*/, '  ◦ ');
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
      // Remove any remaining markdown (bold, etc)
      const cleanText = trimmedLine.replace(/\*\*/g, '').replace(/\*/g, '');
      const lines = doc.splitTextToSize(cleanText, contentWidth - 10);
      lines.forEach((l: string) => {
        checkPageBreak();
        doc.text(l, marginLeft + 5, yPosition);
        yPosition += 5.5;
      });
    });
  }

  // === DOWNLOAD ===
  const sanitizedName = nomeAzienda
    .replace(/[^a-zA-Z0-9]/g, '-')
    .toLowerCase();
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `workflow-ai-${sanitizedName}-${timestamp}.pdf`;

  doc.save(filename);
}

// 9. Get color for time (conditional formatting)
export function getTimeColor(timeInMinutes: number): string {
  if (timeInMinutes < 60) return '#28a745'; // verde
  if (timeInMinutes <= 120) return '#ffc107'; // giallo
  return '#dc3545'; // rosso
}
