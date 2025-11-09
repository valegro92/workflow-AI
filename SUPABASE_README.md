# Supabase Setup Guide

## 📋 Prerequisiti

1. Account Supabase: https://supabase.com
2. Progetto Supabase creato (Project Ref: `tagoyqprrqorubgwcgsv`)

## 🚀 Setup Iniziale

### 1. Esegui lo Schema SQL

Per creare tutte le tabelle necessarie nel database Supabase:

1. Vai al tuo progetto Supabase: https://supabase.com/dashboard/project/tagoyqprrqorubgwcgsv
2. Nel menu laterale, clicca su **SQL Editor**
3. Clicca su **New Query**
4. Copia tutto il contenuto del file `SUPABASE_SETUP.sql`
5. Incolla nel SQL Editor
6. Clicca su **Run** (o premi `Ctrl+Enter`)

Lo script creerà:
- ✅ 5 tabelle: `users`, `companies`, `workflows`, `evaluations`, `api_usage`
- ✅ Indici per performance ottimali
- ✅ Row Level Security (RLS) policies
- ✅ Triggers per `updated_at` automatico
- ✅ Constraint e validazioni

### 2. Configurazione Environment Variables

#### Sviluppo Locale (`.env.local`)

Le variabili sono già configurate in `.env.local`:

```env
SUPABASE_URL=https://tagoyqprrqorubgwcgsv.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Produzione Vercel

Devi aggiungere le stesse variabili nel dashboard Vercel:

1. Vai su: https://vercel.com/valentinos-projects-08a28d4d/workflow-ai/settings/environment-variables
2. Aggiungi queste variabili:
   - `SUPABASE_URL` = `https://tagoyqprrqorubgwcgsv.supabase.co`
   - `SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (copia dalla `.env.local`)
   - `JWT_SECRET` = (copia dalla `.env.local`)
   - `GROQ_API_KEY` = (se già configurato)
   - `OPENROUTER_API_KEY` = (se già configurato)

3. **Importante**: Rimuovi le vecchie variabili Neon:
   - ❌ Rimuovi `DATABASE_URL` (Neon)
   - ❌ Rimuovi `MIGRATION_SECRET`

4. Fai il redeploy su Vercel

### 3. Verifica il Setup

Per verificare che tutto funzioni:

1. **Test locale**:
   ```bash
   npm run dev
   ```

2. **Test registrazione**:
   - Vai su http://localhost:5173/register
   - Crea un nuovo account
   - Verifica che venga creato nel database Supabase

3. **Verifica nel database**:
   - Vai su Supabase Dashboard → **Table Editor**
   - Controlla che la tabella `users` contenga il nuovo utente

## 🔐 Row Level Security (RLS)

Il database è protetto con RLS policies che garantiscono:

- ✅ Gli utenti possono vedere solo i propri dati
- ✅ Non possono accedere a dati di altri utenti
- ✅ Le relazioni tra tabelle sono protette (companies → workflows → evaluations)

## 📊 Tabelle Create

### `users`
- Gestione utenti e autenticazione
- Piani FREE/PRO
- Integrazione Stripe

### `companies`
- Aziende create dagli utenti
- Linked a user_id

### `workflows`
- Processi di business mappati
- Linked a company_id

### `evaluations`
- Valutazioni dei workflow
- Punteggi di automazione e complessità
- Linked a workflow_id

### `api_usage`
- Tracciamento uso API
- Per quota FREE/PRO

## 🛠️ MCP Server Supabase

Il progetto include la configurazione MCP per Supabase in `claude.json`:

```json
{
  "mcpServers": {
    "supabase": {
      "type": "http",
      "url": "https://mcp.supabase.com/mcp?project_ref=tagoyqprrqorubgwcgsv"
    }
  }
}
```

Questo permette di interagire con il database direttamente da Claude Code!

## ❓ Troubleshooting

### Errore "relation does not exist"
- Verifica di aver eseguito lo script SQL in Supabase SQL Editor

### Errore 401 Unauthorized
- Controlla che SUPABASE_URL e SUPABASE_ANON_KEY siano corretti
- Verifica le RLS policies in Supabase Dashboard → Authentication → Policies

### Vercel deployment fallisce
- Controlla le environment variables su Vercel
- Verifica che tutte le variabili Supabase siano configurate
- Rimuovi le vecchie variabili Neon

## 📚 Risorse

- [Supabase Docs](https://supabase.com/docs)
- [Supabase Dashboard](https://supabase.com/dashboard/project/tagoyqprrqorubgwcgsv)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
