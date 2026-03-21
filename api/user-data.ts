import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withHeaders, CacheStrategy } from '../lib/headers.js';
import { checkRateLimit, sendRateLimitError } from '../lib/rateLimit.js';
import jwt from 'jsonwebtoken';
import { getUserData, saveUserData } from '../lib/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'workflow-ai-default-secret-change-in-production';

// Rate limit: 30 req/min (salvataggi frequenti con debounce)
const DATA_RATE_LIMIT = {
  maxAttempts: 30,
  windowMs: 60 * 1000,
  keyPrefix: 'data:',
};

/**
 * Estrae e verifica l'email dal JWT nel header Authorization
 */
function getEmailFromToken(req: VercelRequest): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;

  try {
    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET) as { email: string };
    return decoded.email;
  } catch {
    return null;
  }
}

/**
 * User Data Endpoint
 * GET  /api/user-data — Carica stato utente dal DB
 * POST /api/user-data — Salva stato utente nel DB
 *
 * Richiede JWT valido nel header Authorization: Bearer <token>
 */
async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  // Solo GET e POST
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Rate limiting
  const rateLimitResult = checkRateLimit(req, DATA_RATE_LIMIT);
  if (!rateLimitResult.allowed) {
    sendRateLimitError(res, rateLimitResult.retryAfter || 60);
    return;
  }

  // Verifica JWT
  const email = getEmailFromToken(req);
  if (!email) {
    res.status(401).json({
      success: false,
      message: 'Token non valido o mancante',
    });
    return;
  }

  try {
    if (req.method === 'GET') {
      const appState = await getUserData(email);

      if (!appState) {
        res.status(200).json({
          success: true,
          data: null,
          message: 'Nessun dato salvato',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: appState,
      });
      return;
    }

    if (req.method === 'POST') {
      const { appState } = req.body || {};

      if (!appState || typeof appState !== 'object') {
        res.status(400).json({
          success: false,
          message: 'appState obbligatorio (oggetto JSON)',
        });
        return;
      }

      await saveUserData(email, appState);

      res.status(200).json({
        success: true,
        message: 'Dati salvati',
      });
      return;
    }
  } catch (error: any) {
    console.error('❌ User data error:', error);
    res.status(500).json({
      success: false,
      message: 'Errore nel salvataggio dei dati',
    });
  }
}

export default withHeaders(handler, {
  cache: CacheStrategy.NO_CACHE,
  security: true,
  csp: false,
  json: true,
});
