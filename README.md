# AI Collaboration Canvas 🎯

Web application interattiva per mappare i tuoi workflow e scoprire come l'AI può aiutarti, basata sul framework di **Nicola Mattina**.

## 🚀 Demo e Funzionalità

Questa applicazione ti aiuta a:
1. **Mappare i workflow** - Descrivi ogni step del tuo processo con dettagli su tempi, input e output
2. **Valutare gli step** - Rispondi a 8 domande scientifiche su automazione e carico cognitivo
3. **Ottenere strategia AI** - Ricevi automaticamente la strategia ottimale (AI Partner, AI Assistant, AI Tool, o Fuori Perimetro)
4. **Visualizzare risultati** - Dashboard completa con KPI, matrice 2×2 e priorità di implementazione

## 🏗️ Tech Stack

- **React 18** con TypeScript
- **Vite** - Build tool velocissimo
- **Tailwind CSS** - Styling responsive
- **LocalStorage** - Persistenza dati client-side
- Nessun backend necessario - 100% client-side

## 📦 Installazione e Avvio

```bash
# Installa dipendenze
npm install

# Avvia in modalità sviluppo
npm run dev

# Build per produzione
npm run build

# Preview build di produzione
npm run preview
```

L'applicazione sarà disponibile su `http://localhost:5173`

## 🎨 Struttura Progetto

```
workflow-AI/
├── src/
│   ├── components/          # Componenti React
│   │   ├── ProgressIndicator.tsx
│   │   ├── Step1Welcome.tsx
│   │   ├── Step2Mapping.tsx
│   │   ├── Step3Evaluation.tsx
│   │   └── Step4Results.tsx
│   ├── context/            # State management
│   │   └── AppContext.tsx
│   ├── data/               # Configurazioni
│   │   └── questions.ts    # Le 8 domande
│   ├── types/              # TypeScript interfaces
│   │   └── index.ts
│   ├── utils/              # Business logic
│   │   └── businessLogic.ts
│   ├── App.tsx             # Componente principale
│   ├── main.tsx           # Entry point
│   └── index.css          # Stili globali
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── vite.config.ts
```

## 📊 La Matrice 2×2

L'algoritmo classifica ogni step in base a due dimensioni:

### Automazione (0-8)
- Quanto è ripetibile e standardizzato?
- 4 domande con punteggio 0-2 ciascuna

### Carico Cognitivo (0-8)
- Quanto pensiero e linguaggio richiede?
- 4 domande con punteggio 0-2 ciascuna

### Strategie AI

| Carico Cognitivo | Automazione BASSA (0-4) | Automazione ALTA (5-8) |
|------------------|-------------------------|------------------------|
| **ALTO (5-8)**   | 🤝 **AI Assistant**<br/>Prompt ripetibili | 💡 **AI Partner**<br/>Conversazioni approfondite |
| **BASSO (0-4)**  | 🔴 **Fuori Perimetro**<br/>Non delegabile | 🔧 **AI Tool**<br/>Tool specifici |

## 🎯 Esempio di Utilizzo

### 1. Mappatura
```
Fase: Produzione
Titolo: Report settimanale vendite
Descrizione: Raccolgo dati da Jira, Analytics e CRM,
             creo pivot table e scrivo executive summary
Tempo medio: 120 minuti
Frequenza: 4 volte/mese
→ Tempo totale: 480 min/mese
```

### 2. Valutazione (esempio)
```
AUTOMAZIONE:
- Passaggi sempre uguali? → Sempre (2)
- Struttura output uguale? → Sì (2)
- Istruzioni scrivibili? → Sì (2)
- Senza decisioni contestuali? → In parte (1)
Score: 7/8

CARICO COGNITIVO:
- Meccanico o cognitivo? → Misto (1)
- Lavoro con testi? → Sì (2)
- Volume informazioni? → Molte (2)
- Esplorare prospettive? → No (0)
Score: 5/8
```

### 3. Risultato
```
Strategia: 💡 AI PARTNER
Perché: Automazione ≥ 5 AND Carico Cognitivo ≥ 5

Raccomandazione:
Usa Claude/ChatGPT per aggregare dati,
generare summary e suggerire insights
```

## 💾 Persistenza Dati

L'applicazione salva automaticamente i dati in **localStorage**:
- Tutti i workflow creati
- Tutte le valutazioni
- Stato della sessione

I dati persistono tra le sessioni del browser. Usa "Nuova Analisi" per reset completo.

## 📥 Export

Esporta tutti i dati in formato JSON con:
- Timestamp
- Workflows completi
- Valutazioni e strategie
- Statistiche aggregate

## 👤 Autore e Framework

**Framework**: AI Collaboration Canvas
**Autore**: Nicola Mattina
**Website**: [radicalcuriosity.xyz](https://radicalcuriosity.xyz)
**LinkedIn**: [linkedin.com/in/nicolamattina](https://linkedin.com/in/nicolamattina)
**Email**: ciao@nicolamattina.it

## 📝 Licenza

Questo progetto implementa il framework "AI Collaboration Canvas" di Nicola Mattina.

## 🤝 Contributing

1. Fork del progetto
2. Crea un branch per la feature (`git checkout -b feature/AmazingFeature`)
3. Commit delle modifiche (`git commit -m 'Add some AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Apri una Pull Request

## 🐛 Bug Report

Per segnalare bug o richiedere feature, apri un issue su GitHub.

---

Sviluppato con ❤️ seguendo il framework AI Collaboration Canvas
# Updated Sat Nov  8 22:34:08 UTC 2025
