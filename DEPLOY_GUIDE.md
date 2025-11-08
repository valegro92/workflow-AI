# Deploy su Vercel - Guida Rapida

## 📋 Checklist Pre-Deploy

✅ Database Neon creato
✅ File .env.local configurato localmente
⏳ Variabili ambiente da aggiungere su Vercel

---

## 🚀 Step 1: Aggiungi Variabili Ambiente su Vercel

1. Vai su [Vercel Dashboard](https://vercel.com/dashboard)
2. Seleziona il progetto `workflow-AI`
3. Vai in **Settings** > **Environment Variables**
4. Aggiungi queste variabili (tutte con scope **Production**, **Preview**, **Development**):

```env
DATABASE_URL=postgresql://neondb_owner:npg_VNs0DGkTub7Q@ep-bitter-grass-aglwpwzg-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require

JWT_SECRET=super-secret-jwt-key-change-in-production-12345

MIGRATION_SECRET=migration-secret-key-xyz789

GROQ_API_KEY=<la-tua-chiave-groq>

OPENROUTER_API_KEY=<la-tua-chiave-openrouter>
```

⚠️ **IMPORTANTE**: Per produzione, cambia `JWT_SECRET` con una stringa random di almeno 32 caratteri!

---

## 🚢 Step 2: Deploy

Il deploy è automatico:

```bash
git push origin claude/ai-collaboration-canvas-011CUtUHkGzdnY7WiDGjPSh3
```

Vercel rileverà il push e farà il deploy automaticamente.

Oppure da Vercel Dashboard: **Deployments** > **Deploy**

---

## 🗄️ Step 3: Crea le Tabelle (Migration)

Una volta deployato, crea le tabelle nel database:

```bash
# Sostituisci con il tuo dominio Vercel
curl -X POST https://workflow-ai-XXXX.vercel.app/api/db-migrate \
  -H "X-Migration-Secret: migration-secret-key-xyz789"
```

Dovresti vedere:
```json
{
  "success": true,
  "message": "Database migration completed successfully!",
  "tables": ["users", "companies", "workflows", "evaluations", "api_usage"]
}
```

---

## ✅ Step 4: Verifica Database

Verifica che tutto funzioni:

```bash
curl https://workflow-ai-XXXX.vercel.app/api/db-check
```

Dovresti vedere:
```json
{
  "success": true,
  "message": "Database connesso con successo!",
  "connection": { "status": "connected", ... },
  "tables": {
    "found": ["users", "companies", "workflows", "evaluations", "api_usage"],
    "missing": [],
    "allPresent": true
  }
}
```

---

## 🎉 Step 5: Testa l'App!

1. Vai su `https://workflow-ai-XXXX.vercel.app`
2. Clicca **"Registrati gratis"**
3. Crea un account con email e password
4. Dovresti essere reindirizzato alla dashboard!

---

## 🔧 Troubleshooting

**Errore: "DATABASE_URL is not set"**
- Verifica di aver aggiunto DATABASE_URL nelle Environment Variables di Vercel
- Riprova il deploy dopo averle aggiunte

**Errore 401 su /api/db-migrate**
- Verifica che l'header `X-Migration-Secret` sia corretto

**Errore: "relation does not exist"**
- La migration non è andata a buon fine
- Controlla i log su Vercel: Deployments > Il tuo deploy > Function Logs
- Riprova a chiamare /api/db-migrate

**Login non funziona**
- Verifica che JWT_SECRET sia configurato su Vercel
- Controlla i log di /api/auth/login

---

## 📝 Note

- Il database Neon funziona meglio in ambienti serverless come Vercel
- In locale potrebbe dare errori di connessione (è normale)
- Tutte le API sono serverless functions di Vercel
- I dati sono salvati nel database Neon (non più localStorage)

---

## 🎯 Prossimi Step

Dopo il deploy:
1. ✅ Test registrazione e login
2. ⏳ Migrare dati da localStorage al database
3. ⏳ Implementare quota system (FREE vs PRO)
4. ⏳ Integrare Stripe per pagamenti
