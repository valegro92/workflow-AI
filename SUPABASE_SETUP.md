# Supabase Setup Guide

## Step 1: Create Supabase Project

1. Vai su https://supabase.com e crea un account (se non ce l'hai)
2. Clicca **"New Project"**
3. Compila:
   - **Name**: workflow-ai-prod
   - **Database Password**: (salva questa password in modo sicuro!)
   - **Region**: Frankfurt (EU) per GDPR compliance
   - **Pricing Plan**: Free (puoi upgradare dopo)

4. Attendi 2-3 minuti per il provisioning del database

## Step 2: Get API Credentials

Dopo la creazione, vai in **Project Settings > API**:

1. Copia queste due chiavi:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon/public key**: `eyJhbG...` (lunga stringa JWT)

## Step 3: Add to Environment Variables

Crea un file `.env.local` nella root del progetto con:

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...

# Existing API keys (keep these)
OPENTOUTER_KEY=your_openrouter_key
Groq_API_KEY=your_groq_key
```

⚠️ **IMPORTANTE**: Il file `.env.local` è già in `.gitignore`, non committarlo mai!

## Step 4: Vercel Environment Variables

Per il deploy su Vercel, aggiungi le stesse variabili:

1. Vai su Vercel Dashboard > tuo progetto > Settings > Environment Variables
2. Aggiungi:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `OPENTOUTER_KEY` (già esistente)
   - `Groq_API_KEY` (già esistente)

## Step 5: Run Database Schema

1. Nel tuo progetto Supabase, vai in **SQL Editor** (sidebar sinistra)
2. Clicca **"New query"**
3. Apri il file `supabase-schema.sql` che ho creato nella root del progetto
4. Copia TUTTO il contenuto del file
5. Incollalo nell'editor SQL di Supabase
6. Clicca **"Run"** (o CTRL+Enter)
7. Dovresti vedere "Success. No rows returned" - significa che lo schema è stato creato correttamente!

## Step 6: Enable Email Auth

1. Vai in **Authentication > Providers** (sidebar)
2. Verifica che **Email** sia abilitato (dovrebbe esserlo di default)
3. Scroll down e disabilita **"Confirm email"** per ora (lo riabiliteremo dopo)
   - Questo permette di testare rapidamente senza dover verificare le email

## Next Steps

✅ Dopo aver completato tutti questi step, torna qui e dimmi **"fatto"** per procedere con lo Step 2!
