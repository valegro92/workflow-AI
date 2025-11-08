# Vercel Postgres Setup Guide

## Quick Setup (5 minuti) 🚀

### Step 1: Create Vercel Postgres Database

1. Vai su [Vercel Dashboard](https://vercel.com/dashboard)
2. Clicca sul tuo progetto **workflow-AI**
3. Vai nella tab **Storage**
4. Clicca **"Create Database"**
5. Seleziona **"Postgres"**
6. Scegli il nome: `workflow-ai-db`
7. Scegli la region: **Frankfurt** (più vicino all'Italia)
8. Clicca **"Create"**

⏱️ Attendi 1-2 minuti per il provisioning...

---

### Step 2: Copy Environment Variables

1. Dopo la creazione, vai nella tab **".env.local"** del database
2. Vedrai tutte le variabili `POSTGRES_*`
3. Clicca **"Copy Snippet"**
4. Crea un file `.env.local` nella root del progetto e incollalo

**Aggiungi anche queste variabili**:

```env
JWT_SECRET=mio-super-segreto-random-123456
MIGRATION_SECRET=migration-secret-xyz789
OPENTOUTER_KEY=il_tuo_openrouter_key
Groq_API_KEY=il_tuo_groq_key
```

⚠️ **IMPORTANTE**: Il file `.env.local` è già in `.gitignore`, non verrà committato!

---

### Step 3: Run Database Migration

La migration crea tutte le tabelle nel database.

**Opzione A: Tramite Vercel (consigliato)**

1. Vai su **Vercel Dashboard > tuo progetto > Settings > Environment Variables**
2. Aggiungi tutte le variabili che hai nel tuo `.env.local`
3. Fai il deploy su Vercel (push su git)
4. Visita: `https://tuo-dominio.vercel.app/api/db-migrate`
5. Usa questi headers nella richiesta POST:
   - Header: `X-Migration-Secret`
   - Value: il valore di `MIGRATION_SECRET`

**Opzione B: Tramite curl locale**

```bash
curl -X POST http://localhost:5173/api/db-migrate \
  -H "X-Migration-Secret: migration-secret-xyz789"
```

Se vedi `"success": true`, le tabelle sono state create! ✅

---

### Step 4: Verifica Tabelle Create

1. Torna su Vercel Dashboard > Storage > Il tuo database
2. Vai nella tab **"Data"**
3. Dovresti vedere queste tabelle:
   - ✅ users
   - ✅ companies
   - ✅ workflows
   - ✅ evaluations
   - ✅ api_usage

---

## Prossimi Step

Dopo aver completato il setup:

1. ✅ Database creato e configurato
2. ✅ Variabili ambiente settate
3. ✅ Migration eseguita
4. ➡️ **Torna qui e dimmi "fatto"** per continuare con il frontend (login/register UI)!

---

## Troubleshooting

**Errore: "Missing environment variables"**
- Verifica che `.env.local` sia nella root del progetto
- Riavvia il server dev: `npm run dev`

**Errore: "relation does not exist"**
- La migration non è stata eseguita, ripeti Step 3

**Errore 401 su /api/db-migrate**
- Controlla che l'header `X-Migration-Secret` sia corretto
