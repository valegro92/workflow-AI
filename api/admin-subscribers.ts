import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withHeaders, CacheStrategy } from '../lib/headers.js';
import { Redis } from '@upstash/redis';

/**
 * Admin endpoint per gestire gli iscritti autorizzati
 *
 * POST /api/admin-subscribers
 * Headers: { Authorization: "Bearer <ADMIN_SECRET>" }
 * Body: { action: "add" | "remove" | "list", email?: string, expiresAt?: string }
 *
 * Esempi:
 *   Aggiungere: { "action": "add", "email": "utente@email.it" }
 *   Rimuovere:  { "action": "remove", "email": "utente@email.it" }
 *   Elenco:     { "action": "list" }
 */

// Default expiry: 31 dicembre 2099 (praticamente mai)
const DEFAULT_EXPIRY = '2099-12-31T23:59:59';

async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Verifica admin secret
  const adminSecret = process.env.ADMIN_SECRET?.trim();
  if (!adminSecret) {
    res.status(500).json({ error: 'ADMIN_SECRET non configurato nelle variabili di ambiente' });
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${adminSecret}`) {
    res.status(401).json({ error: 'Non autorizzato' });
    return;
  }

  // Redis setup
  const redisUrl = process.env.KV_REST_API_URL;
  const redisToken = process.env.KV_REST_API_TOKEN;

  if (!redisUrl || !redisToken) {
    res.status(500).json({ error: 'Redis non configurato' });
    return;
  }

  const redis = new Redis({ url: redisUrl, token: redisToken });

  try {
    const { action, email, expiresAt } = req.body || {};

    if (action === 'add') {
      if (!email) {
        res.status(400).json({ error: 'Email obbligatoria' });
        return;
      }
      const normalizedEmail = email.trim().toLowerCase();
      const data = { expiresAt: expiresAt || DEFAULT_EXPIRY };
      await redis.set(`subscriber:${normalizedEmail}`, JSON.stringify(data));
      console.log(`✅ Subscriber aggiunto: ${normalizedEmail}`);
      res.status(200).json({ success: true, message: `${normalizedEmail} aggiunto`, data });
      return;
    }

    if (action === 'remove') {
      if (!email) {
        res.status(400).json({ error: 'Email obbligatoria' });
        return;
      }
      const normalizedEmail = email.trim().toLowerCase();
      await redis.del(`subscriber:${normalizedEmail}`);
      console.log(`🗑️ Subscriber rimosso: ${normalizedEmail}`);
      res.status(200).json({ success: true, message: `${normalizedEmail} rimosso` });
      return;
    }

    if (action === 'check') {
      if (!email) {
        res.status(400).json({ error: 'Email obbligatoria' });
        return;
      }
      const normalizedEmail = email.trim().toLowerCase();
      const subscriberData = await redis.get(`subscriber:${normalizedEmail}`);
      res.status(200).json({
        success: true,
        email: normalizedEmail,
        isSubscriber: !!subscriberData,
        data: subscriberData,
      });
      return;
    }

    res.status(400).json({ error: 'Azione non valida. Usa: add, remove, check' });
  } catch (error: any) {
    console.error('❌ Admin error:', error);
    res.status(500).json({ error: 'Errore interno', details: error.message });
  }
}

export default withHeaders(handler, {
  cache: CacheStrategy.NO_CACHE,
  security: true,
  csp: false,
  json: true,
});
