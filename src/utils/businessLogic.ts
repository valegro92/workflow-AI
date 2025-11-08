import { Strategy, Workflow, Evaluation, AppState } from '../types';

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

// 8. Export JSON
export function exportToJSON(workflows: Workflow[], evaluations: Record<string, Evaluation>): string {
  const stats = calculateStats(workflows, evaluations);

  const exportData = {
    timestamp: new Date().toISOString(),
    version: "1.0",
    workflows,
    evaluations: Object.values(evaluations),
    stats
  };

  return JSON.stringify(exportData, null, 2);
}

// 9. Download file
export function downloadJSON(data: string, filename: string = 'ai-collaboration-canvas.json'): void {
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// 10. Get color for time (conditional formatting)
export function getTimeColor(timeInMinutes: number): string {
  if (timeInMinutes < 60) return '#28a745'; // verde
  if (timeInMinutes <= 120) return '#ffc107'; // giallo
  return '#dc3545'; // rosso
}
