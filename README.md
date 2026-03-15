<div align="center">

# Workflow AI Analyzer

**Mappa i tuoi workflow. Scopri dove l'AI fa la differenza.**

Applicazione web per analizzare i processi aziendali e identificare le migliori strategie di collaborazione con l'Intelligenza Artificiale.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/import/project)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

</div>

---

## Panoramica

Workflow AI Analyzer guida l'utente in un percorso strutturato in **4 step** per trasformare workflow complessi in strategie AI concrete e misurabili.

| Step | Cosa fa |
|------|---------|
| **1. Dashboard** | Panoramica dei workflow, configurazione azienda e costo orario |
| **2. Mappatura** | Descrizione dettagliata di ogni processo: fasi, tempi, input/output, criticita |
| **3. Valutazione** | Scoring su 2 assi (Automazione e Carico Cognitivo) con 8 domande scientifiche |
| **4. Risultati** | Matrice 2x2, diagrammi BPMN, roadmap 30/60/90 giorni, calcolo ROI |

## Funzionalita principali

- **Mappatura workflow** con supporto a fasi, tool, input/output, tempi e frequenze
- **Assistente AI integrato** con chat contestuale per guidare l'analisi
- **Estrazione intelligente** da testo libero, documenti Word (.docx) e input vocale
- **Import/Export** in formato JSON, CSV, Excel
- **Diagrammi BPMN** generati automaticamente con AI
- **Roadmap di implementazione** con piano a 30, 60 e 90 giorni
- **Calcolo ROI** automatico basato su costo orario e tempo risparmiato
- **100% client-side** — i dati restano nel browser (localStorage)

## La Matrice 2x2

L'algoritmo classifica ogni step su due dimensioni (0-8 ciascuna):

```
                        AUTOMAZIONE
                   Bassa (0-4)    Alta (5-8)
                 +--------------+--------------+
   Alto (5-8)    |  AI Assistant |  AI Partner   |
  CARICO         |  Prompt       |  Conversazioni|
  COGNITIVO      |  ripetibili   |  approfondite |
                 +--------------+--------------+
   Basso (0-4)   |  Fuori        |  AI Tool      |
                 |  Perimetro    |  Automazione  |
                 |  (keep human) |  completa     |
                 +--------------+--------------+
```

## Tech Stack

| Layer | Tecnologia |
|-------|-----------|
| **Frontend** | React 18, TypeScript 5.2, React Router 7 |
| **Build** | Vite 5 |
| **Styling** | Tailwind CSS 3.4 (dark theme custom) |
| **BPMN** | bpmn-js 18 |
| **PDF** | jsPDF 3 |
| **File parsing** | mammoth (docx), papaparse (csv), xlsx |
| **AI** | OpenRouter API (modelli free, chiave utente) |
| **Backend** | Vercel Serverless Functions |
| **State** | React Context + localStorage |

## Quick Start

### Prerequisiti

- **Node.js** >= 18
- **npm** >= 9

### Installazione

```bash
# Clona il repository
git clone https://github.com/valegro92/workflow-AI.git
cd workflow-AI

# Installa le dipendenze
npm install

# Avvia il server di sviluppo
npm run dev
```

L'app sara disponibile su `http://localhost:5173`

### Build di produzione

```bash
npm run build
npm run preview
```

### Deploy su Vercel

Il progetto include `vercel.json` preconfigurato. Basta collegare il repository a Vercel e il deploy avviene automaticamente.

## Configurazione AI

L'app utilizza **OpenRouter** per le funzionalita AI. Non serve nessuna configurazione server-side.

1. Registrati gratuitamente su [openrouter.ai](https://openrouter.ai)
2. Genera una API key
3. Inseriscila nell'app al primo utilizzo del chatbot (il modal si apre automaticamente)

Tutti i modelli utilizzati sono **gratuiti**. La fallback chain include 10 modelli ordinati per capability:

| # | Modello | Provider |
|---|---------|----------|
| 1 | Qwen3 235B (MoE) | Alibaba |
| 2 | DeepSeek R1 | DeepSeek |
| 3 | Llama 4 Maverick | Meta |
| 4 | Nemotron 3 Super 120B | NVIDIA |
| 5 | DeepSeek V3.1 | DeepSeek |
| 6 | Llama 3.3 70B | Meta |
| 7 | Qwen3 32B | Alibaba |
| 8 | Mistral Small 3.1 24B | Mistral |
| 9 | Gemma 3 27B | Google |
| 10 | Arcee Trinity Large 400B | Arcee AI |

### Variabili d'ambiente (opzionali)

| Variabile | Descrizione | Default |
|-----------|-------------|---------|
| `ALLOWED_ORIGINS` | Origini consentite per CSRF protection (comma-separated) | `*` |

## Struttura del progetto

```
workflow-AI/
├── api/                          # Vercel Serverless Functions
│   ├── middleware/                # CSRF, rate limiting, timeout, headers
│   ├── ai-chat.ts                # Chat assistant endpoint
│   ├── ai-generate-bpmn.ts       # Generazione diagrammi BPMN
│   ├── ai-suggestions.ts         # Suggerimenti implementazione
│   ├── ai-workflow-extract.ts    # Estrazione workflow da testo
│   ├── process-audio.ts          # Elaborazione audio/voce
│   └── health.ts                 # Health check
├── src/
│   ├── components/               # Componenti React
│   │   ├── Step1Welcome.tsx      # Dashboard iniziale
│   │   ├── Step2Mapping.tsx      # Mappatura workflow
│   │   ├── Step3Evaluation.tsx   # Valutazione scoring
│   │   ├── Step4Results.tsx      # Risultati e roadmap
│   │   ├── AIChat.tsx            # Chat assistant
│   │   ├── SmartImport.tsx       # Import intelligente multi-workflow
│   │   └── ProgressIndicator.tsx # Barra di progressione
│   ├── context/
│   │   └── AppContext.tsx        # State management globale
│   ├── data/
│   │   └── questions.ts          # Le 8 domande di valutazione
│   ├── integrations/
│   │   └── bpmn/                 # Viewer e generatore BPMN
│   ├── types/
│   │   └── index.ts              # Interfacce TypeScript
│   ├── utils/
│   │   └── businessLogic.ts      # Logica di scoring e strategie
│   ├── App.tsx                   # Root component
│   ├── main.tsx                  # Entry point
│   └── index.css                 # Stili globali Tailwind
├── vercel.json                   # Configurazione deploy
├── tailwind.config.js            # Theme customization
├── tsconfig.json                 # Configurazione TypeScript
└── package.json
```

## API Endpoints

Tutti gli endpoint sono serverless functions su Vercel con middleware di sicurezza (CSRF, rate limiting, timeout).

| Endpoint | Metodo | Timeout | Descrizione |
|----------|--------|---------|-------------|
| `/api/health` | GET | 10s | Health check |
| `/api/ai-chat` | POST | 25s | Chat assistant contestuale |
| `/api/ai-workflow-extract` | POST | 30s | Estrazione workflow da testo/voce |
| `/api/ai-suggestions` | POST | 30s | Piano di implementazione AI |
| `/api/ai-generate-bpmn` | POST | 30s | Generazione diagramma BPMN |
| `/api/process-audio` | POST | 30s | Trascrizione e analisi audio |

## Persistenza dati

Tutti i dati sono salvati in **localStorage** sotto la chiave `ai-collaboration-canvas-data`:

- Workflow e relative valutazioni
- Configurazione azienda (nome, costo orario)
- Chiave API OpenRouter
- Stato della sessione

I dati restano nel browser tra le sessioni. Utilizza la funzione "Nuova Analisi" per un reset completo.

## Contributing

1. Fai il fork del repository
2. Crea un branch per la tua feature (`git checkout -b feature/nome-feature`)
3. Committa le modifiche (`git commit -m 'Aggiungi nome-feature'`)
4. Pusha il branch (`git push origin feature/nome-feature`)
5. Apri una Pull Request

## Autore

**Valentino Grossi** — [valentinogrossi.it](https://valentinogrossi.it)

## Licenza

MIT
