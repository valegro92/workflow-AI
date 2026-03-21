import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withHeaders, CacheStrategy } from './middleware/headers.js';
import { checkRateLimit, sendRateLimitError } from './middleware/rateLimit.js';
import jwt from 'jsonwebtoken';
import { getUserData, saveUserData } from './db.js';

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
async function handler(req: VercelRequest, res: VercelResponse) {
  // Solo GET e POST
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limiting
  const rateLimitResult = checkRateLimit(req, DATA_RATE_LIMIT);
  if (!rateLimitResult.allowed) {
    return sendRateLimitError(res, rateLimitResult.retryAfter || 60);
  }

  // Verifica JWT
  const email = getEmailFromToken(req);
  if (!email) {
    return res.status(401).json({
      success: false,
      message: 'Token non valido o mancante',
    });
  }

  try {
    if (req.method === 'GET') {
      // Carica dati utente
      const appState = await getUserData(email);

      if (!appState) {
        return res.status(200).json({
          success: true,
          data: null,
          message: 'Nessun dato salvato',
        });
      }

      return res.status(200).json({
        success: true,
        data: appState,
      });
    }

    if (req.method === 'POST') {
      const { appState } = req.body || {};

      if (!appState || typeof appState !== 'object') {
        return res.status(400).json({
          success: false,
          message: 'appState obbligatorio (oggetto JSON)',
        });
      }

      await saveUserData(email, appState);

      return res.status(200).json({
        success: true,
        message: 'Dati salvati',
      });
    }
  } catch (error: any) {
    console.error('❌ User data error:', error);
    return res.status(500).json({
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
