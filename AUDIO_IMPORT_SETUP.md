# 🎙️ Setup Audio Import Feature

Questa guida spiega come attivare la funzionalità di import automatico da audio workshop.

## Prerequisiti: API Keys Gratuite

### 1. **Groq API** (per Whisper - Audio → Text)

**Costo**: Gratuito con free tier generoso

**Come ottenere la chiave**:
1. Vai su [https://console.groq.com](https://console.groq.com)
2. Crea un account (gratis)
3. Vai su [https://console.groq.com/keys](https://console.groq.com/keys)
4. Clicca "Create API Key"
5. Copia la chiave (inizia con `gsk_...`)

### 2. **OpenRouter API** (per LLM - Text → Workflows JSON)

**Costo**: Gratuito con modelli free (50 richieste/giorno)

**Come ottenere la chiave**:
1. Vai su [https://openrouter.ai](https://openrouter.ai)
2. Crea un account (gratis)
3. Vai su [https://openrouter.ai/settings/keys](https://openrouter.ai/settings/keys)
4. Clicca "Create Key"
5. Copia la chiave (inizia con `sk-or-...`)

---

## Configurazione Locale

### Step 1: Aggiungi le chiavi al file `.env.local`

Apri il file `/home/user/workflow-AI/.env.local` e sostituisci i placeholder:

```bash
# Groq API (per Whisper - audio transcription)
GROQ_API_KEY=gsk_your_actual_groq_key_here

# OpenRouter API (per LLM - text extraction)
OPENROUTER_API_KEY=sk-or-your_actual_openrouter_key_here
```

### Step 2: Testa in locale

```bash
npm run dev
```

Vai su `http://localhost:5173` e prova a caricare un file audio MP3.

---

## Configurazione Vercel (Production)

### Aggiungi le Environment Variables su Vercel:

1. Vai su [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. Seleziona il progetto `workflow-ai`
3. Vai in **Settings → Environment Variables**
4. Aggiungi queste 2 variabili:

| Key | Value |
|-----|-------|
| `GROQ_API_KEY` | `gsk_...` (la tua chiave Groq) |
| `OPENROUTER_API_KEY` | `sk-or-...` (la tua chiave OpenRouter) |

5. Clicca **Save**
6. Fai un nuovo deploy (o triggera automaticamente con `git push`)

---

## Come Funziona

```
📹 Workshop Audio Recording (MP3/M4A/WAV)
    ↓
🎤 Upload nell'app (Step 1)
    ↓
🚀 Groq Whisper API (~2-5 secondi)
    → Trascrizione completa in italiano
    ↓
🧠 OpenRouter + Gemini 2.0 Flash (~3-5 secondi)
    → Estrazione automatica workflows in JSON
    ↓
✅ Import automatico nell'app
    → Vai direttamente allo Step 2 per rifinire
```

**Tempo totale**: ~10 secondi per un audio di 10-15 minuti

---

## Limiti Free Tier

| Servizio | Limite |
|----------|--------|
| **Groq Whisper** | Generoso free tier, file max 25MB (~2-3 ore audio) |
| **OpenRouter** | 50 richieste/giorno con modelli gratuiti |

Se fai 20-30 sessioni cliente al mese → tutto gratis.

---

## Troubleshooting

### Errore: "Failed to fetch"
→ Verifica che le API keys siano configurate correttamente in `.env.local` (locale) o Vercel Environment Variables (production)

### Errore: "File too large"
→ Massimo 25MB. Comprimi l'audio o taglialo in segmenti più brevi

### Errore: "No workflows found"
→ L'audio potrebbe non contenere informazioni sufficienti. Prova a registrare un workshop più strutturato dove si descrivono processi chiari.

---

## Costi (se superi free tier)

Se superi i limiti gratuiti:
- **Groq Whisper**: $0.04/ora trascrizione (molto economico)
- **OpenRouter Gemini Flash**: ~$0.10 per sessione

Anche con 100 sessioni/mese → ~$15-20/mese totali.
