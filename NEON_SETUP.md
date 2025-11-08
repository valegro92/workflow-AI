# Neon Database Setup Guide

## Quick Setup (3 minuti) 🚀

Neon è un database Postgres serverless super semplice da configurare!

---

### Step 1: Create Neon Project

1. Vai su [Neon Console](https://console.neon.tech/) e crea un account (GRATIS)
2. Clicca **"Create a project"**
3. Compila:
   - **Project name**: `workflow-ai`
   - **Region**: **Europe (Frankfurt)** 🇩🇪 (più vicino all'Italia)
   - **Postgres version**: 16 (default)
4. Clicca **"Create project"**

⏱️ Il database è pronto SUBITO (niente attese!)

---

### Step 2: Copy Connection String

1. Dopo la creazione, vedrai la **Connection String**
2. Assicurati che sia selezionato **"Pooled connection"**
3. Copia la stringa che inizia con `postgresql://...`

Dovrebbe essere simile a:
```
postgresql://user:password@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require
```

---

### Step 3: Configure Environment Variables

1. Nella root del progetto, crea un file `.env.local`:

```env
# Neon Database
DATABASE_URL="postgresql://user:password@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require"

# Authentication
JWT_SECRET="mio-super-segreto-random-123456"
MIGRATION_SECRET="migration-secret-xyz789"

# AI APIs (existing)
OPENTOUTER_KEY=il_tuo_openrouter_key
Groq_API_KEY=il_tuo_groq_key
```

⚠️ **IMPORTANTE**: Sostituisci `DATABASE_URL` con la tua connection string!

---

### Step 4: Add to Vercel (for production)

1. Vai su **Vercel Dashboard** > tuo progetto > **Settings** > **Environment Variables**
2. Aggiungi tutte le variabili che hai nel `.env.local`
3. Importante: aggiungi `DATABASE_URL` con la connection string di Neon

---

### Step 5: Run Database Migration

Devi creare le tabelle nel database.

**Opzione A: Dopo il deploy su Vercel (consigliato)**

1. Fai il push su git (triggera il deploy automatico)
2. Visita: `https://tuo-dominio.vercel.app/api/db-migrate`
3. Usa questi headers nella richiesta POST:
   ```bash
   curl -X POST https://tuo-dominio.vercel.app/api/db-migrate \
     -H "X-Migration-Secret: migration-secret-xyz789"
   ```

**Opzione B: Localmente (per sviluppo)**

1. Avvia il server dev: `npm run dev`
2. In un altro terminale:
   ```bash
   curl -X POST http://localhost:5173/api/db-migrate \
     -H "X-Migration-Secret: migration-secret-xyz789"
   ```

Se vedi `"success": true`, le tabelle sono create! ✅

---

### Step 6: Verify Tables

1. Torna su [Neon Console](https://console.neon.tech/)
2. Seleziona il tuo progetto > **Tables**
3. Dovresti vedere:
   - ✅ users
   - ✅ companies
   - ✅ workflows
   - ✅ evaluations
   - ✅ api_usage

---

## 🎉 Setup Completato!

Ora puoi:
- ✅ Registrare utenti
- ✅ Fare login
- ✅ Salvare aziende e workflow nel database cloud

---

## 💰 Free Tier Limits

Neon FREE tier include:
- ✅ 0.5 GB storage
- ✅ 1 progetto
- ✅ Unlimited databases per progetto
- ✅ 100 ore di compute/mese (più che sufficiente!)

**Molto più generoso di Vercel Postgres!**

---

## 🔧 Troubleshooting

**Errore: "DATABASE_URL is not set"**
- Verifica che `.env.local` sia nella root del progetto
- Riavvia il server dev: `npm run dev`

**Errore: "relation does not exist"**
- La migration non è stata eseguita, ripeti Step 5

**Errore 401 su /api/db-migrate**
- Controlla che l'header `X-Migration-Secret` sia corretto

**Errore di connessione al database**
- Verifica che la connection string sia corretta
- Assicurati che includa `?sslmode=require` alla fine

---

## 🚀 Next Steps

Una volta completato il setup:
1. ✅ Database Neon configurato
2. ✅ Variabili ambiente settate
3. ✅ Migration eseguita
4. ➡️ **Torna al chat e dimmi "fatto"** per continuare con la migrazione dei dati!
