// Data Model per AI Collaboration Canvas

export interface Workflow {
  id: string;                    // Auto-generato: "W001", "W002", etc.
  fase: string;                  // Fase personalizzabile (es: "Analisi", "Produzione", etc.)
  titolo: string;                // Titolo breve dello step
  descrizione: string;           // Descrizione dettagliata
  tool: string[];                // Tool/strumenti attualmente usati (multipli)
  input: string[];               // Input necessari (multipli)
  output: string[];              // Output prodotti (multipli)
  tempoMedio: number;            // Tempo medio in minuti
  frequenza: number;             // Quante volte al mese
  tempoTotale: number;           // AUTO: tempoMedio × frequenza
  csat?: number;                 // Customer Satisfaction 1-5 (opzionale)
  errori?: number;               // % errori (opzionale)
  painPoints: string;            // Problemi principali (opzionale)
  pii: boolean;                  // Contiene dati personali?
  hitl: boolean;                 // Richiede supervisione umana?
  citazioni: boolean;            // Necessita citazioni fonti?
  owner: string;                 // Responsabile (opzionale)
  note: string;                  // Note aggiuntive (opzionale)
}

export interface Strategy {
  name: string;                  // Nome strategia con emoji
  color: string;                 // Colore per UI
  desc: string;                  // Descrizione breve
}

export interface Evaluation {
  workflowId: string;            // Riferimento a Workflow.id

  // AUTOMAZIONE (4 domande × score 0-2)
  a1: number;                    // Segui sempre stessi passaggi?
  a2: number;                    // Risultato ha sempre stessa struttura?
  a3: number;                    // Istruzioni chiare scrivibili?
  a4: number;                    // Senza decisioni contestuali?

  // CARICO COGNITIVO (4 domande × score 0-2)
  c1: number;                    // Meccanico o cognitivo?
  c2: number;                    // Lavoro con testi?
  c3: number;                    // Volume informazioni?
  c4: number;                    // Esplorare prospettive?

  // CALCOLI AUTOMATICI
  autoScore: number;             // a1 + a2 + a3 + a4 (0-8)
  cogScore: number;              // c1 + c2 + c3 + c4 (0-8)
  strategy: Strategy;            // calcolata da matrice 2×2

  // PRIORITIZZAZIONE (opzionale)
  impatto: number;               // Workflow.tempoTotale
  complessita?: number;          // Manuale: 1-5
  priorita?: number;             // impatto / complessita
}

export interface AppState {
  currentStep: number;           // 1-4
  workflows: Workflow[];
  evaluations: Record<string, Evaluation>;
  stats: {
    totalSteps: number;
    totalTime: number;
    strategyCounts: {
      partner: number;
      assistant: number;
      tool: number;
      out: number;
    };
  };
}

export interface QuestionOption {
  value: number;
  label: string;
}

export interface Question {
  key: string;
  question: string;
  options: QuestionOption[];
}
