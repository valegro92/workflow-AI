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
      { value: 1, label: 'Simile' },
      { value: 2, label: 'Identico' }
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
      { value: 1, label: 'Poche' },
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
      { value: 1, label: 'Moderato' },
      { value: 2, label: 'Ragionamento' }
    ]
  },
  {
    key: 'c2',
    question: 'Lavoro principalmente con il linguaggio?',
    options: [
      { value: 0, label: 'Poco' },
      { value: 1, label: 'Un po\'' },
      { value: 2, label: 'Molto' }
    ]
  },
  {
    key: 'c3',
    question: 'Quante informazioni devo processare?',
    options: [
      { value: 0, label: 'Poche' },
      { value: 1, label: 'Moderate' },
      { value: 2, label: 'Molte' }
    ]
  },
  {
    key: 'c4',
    question: 'Esistono più modi per svolgere il compito?',
    options: [
      { value: 0, label: 'No' },
      { value: 1, label: 'In qualche modo' },
      { value: 2, label: 'Moltissimo' }
    ]
  }
];
