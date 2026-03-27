import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withHeaders, CacheStrategy } from '../lib/headers.js';
import { checkRateLimit, sendRateLimitError, addRateLimitHeaders } from '../lib/rateLimit.js';
import jwt from 'jsonwebtoken';
import { Redis } from '@upstash/redis';

// Admin emails: sempre autorizzate senza Redis
const ADMIN_EMAILS = ['ai@valentinogrossi.it'];

const JWT_SECRET = process.env.JWT_SECRET || 'workflow-ai-default-secret-change-in-production';
const TOKEN_EXPIRY = '24h';

// Rate limit: 10 tentativi per minuto
const AUTH_RATE_LIMIT = {
  maxAttempts: 10,
  windowMs: 60 * 1000,
  keyPrefix: 'auth:',
};

/**
 * Genera un JWT token per l'utente autenticato
 */
function generateToken(email: string): string {
  return jwt.sign({ email }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

/**
 * Auth Endpoint
 * POST /api/auth
 *
 * Body: { email: string }
 * Verifica email contro Upstash Redis (iscritti L'Officina)
 * Ritorna JWT token se autorizzato
 */
async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  // Solo POST
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Rate limiting
  const rateLimitResult = checkRateLimit(req, AUTH_RATE_LIMIT);
  if (!rateLimitResult.allowed) {
    sendRateLimitError(res, rateLimitResult.retryAfter || 60);
    return;
  }

  try {
    const { email } = req.body || {};

    // Validazione input
    if (!email || typeof email !== 'string') {
      res.status(400).json({
        success: false,
        message: 'Email obbligatoria',
      });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Validazione formato email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      res.status(400).json({
        success: false,
        message: 'Formato email non valido',
      });
      return;
    }

    // Admin bypass
    if (ADMIN_EMAILS.includes(normalizedEmail)) {
      const token = generateToken(normalizedEmail);
      addRateLimitHeaders(res, rateLimitResult.remaining || 0, AUTH_RATE_LIMIT.maxAttempts);
      res.status(200).json({ success: true, token });
      return;
    }

    // Verifica su Upstash Redis (solo iscritti autorizzati)
    const redisUrl = process.env.KV_REST_API_URL;
    const redisToken = process.env.KV_REST_API_TOKEN;

    if (!redisUrl || !redisToken) {
      console.error('❌ Redis non configurato: KV_REST_API_URL o KV_REST_API_TOKEN mancanti');
      res.status(500).json({
        success: false,
        message: 'Servizio di autenticazione temporaneamente non disponibile',
      });
      return;
    }

    const redis = new Redis({ url: redisUrl, token: redisToken });
    const subscriberData = await redis.get(`subscriber:${normalizedEmail}`);

    if (subscriberData) {
      const data = typeof subscriberData === 'string' ? JSON.parse(subscriberData) : subscriberData;
      const expiry = new Date(data.expiresAt);

      if (expiry > new Date()) {
        // Subscriber valido
        const token = generateToken(normalizedEmail);
        addRateLimitHeaders(res, rateLimitResult.remaining || 0, AUTH_RATE_LIMIT.maxAttempts);
        res.status(200).json({ success: true, token });
        return;
      }
    }

    // Non autorizzato
    res.status(401).json({
      success: false,
      message: "Accesso riservato agli iscritti de L'Officina della Cassetta degli AI-trezzi. Scopri di più su cassettadegliaitrezzi.it",
    });
  } catch (error: any) {
    console.error('❌ Auth error:', error);
    res.status(500).json({
      success: false,
      message: "Errore durante l'autenticazione",
    });
  }
}

export default withHeaders(handler, {
  cache: CacheStrategy.NO_CACHE,
  security: true,
  csp: false,
  json: true,
});
