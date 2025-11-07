import { Question } from '../types';

// LE 8 DOMANDE - TESTO ESATTO E OPZIONI

export const automationQuestions: Question[] = [
  {
    key: 'a1',
    question: 'Segui sempre gli stessi passaggi?',
    options: [
      { value: 0, label: 'Mai' },
      { value: 1, label: 'Spesso' },
      { value: 2, label: 'Sempre' }
    ]
  },
  {
    key: 'a2',
    question: 'Il risultato ha sempre la stessa struttura?',
    options: [
      { value: 0, label: 'No' },
      { value: 1, label: 'Parzialmente' },
      { value: 2, label: 'Sì' }
    ]
  },
  {
    key: 'a3',
    question: 'Potresti scrivere istruzioni chiare e dettagliate?',
    options: [
      { value: 0, label: 'No' },
      { value: 1, label: 'In parte' },
      { value: 2, label: 'Sì' }
    ]
  },
  {
    key: 'a4',
    question: 'Puoi farlo senza prendere decisioni contestuali?',
    options: [
      { value: 0, label: 'No' },
      { value: 1, label: 'In parte' },
      { value: 2, label: 'Sì' }
    ]
  }
];

export const cognitiveQuestions: Question[] = [
  {
    key: 'c1',
    question: 'È meccanico o richiede concentrazione?',
    options: [
      { value: 0, label: 'Meccanico' },
      { value: 1, label: 'Misto' },
      { value: 2, label: 'Cognitivo' }
    ]
  },
  {
    key: 'c2',
    question: 'Lavori principalmente con i testi?',
    options: [
      { value: 0, label: 'No' },
      { value: 1, label: 'In parte' },
      { value: 2, label: 'Sì' }
    ]
  },
  {
    key: 'c3',
    question: 'Quante informazioni devi processare?',
    options: [
      { value: 0, label: 'Poche' },
      { value: 1, label: 'Moderate' },
      { value: 2, label: 'Molte' }
    ]
  },
  {
    key: 'c4',
    question: 'È utile esplorare diverse possibilità e prospettive?',
    options: [
      { value: 0, label: 'No' },
      { value: 1, label: 'In parte' },
      { value: 2, label: 'Sì' }
    ]
  }
];
