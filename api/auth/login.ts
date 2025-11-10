import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../src/lib/db';
import { comparePassword, generateToken, isValidEmail } from '../../src/lib/auth';
import { checkRateLimit, sendRateLimitError, addRateLimitHeaders } from '../middleware/rateLimit';
import { checkCSRF } from '../middleware/csrf';

/**
 * Login user
 * POST /api/auth/login
 * Body: { email: string, password: string }
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // CSRF Protection
  if (!checkCSRF(req, res)) {
    return; // Response already sent by checkCSRF
  }

  try {
    // Rate limiting: 5 attempts per 15 minutes
    const rateLimit = checkRateLimit(req, {
      maxAttempts: 5,
      windowMs: 15 * 60 * 1000, // 15 minutes
      blockDurationMs: 15 * 60 * 1000, // Block for 15 minutes
      keyPrefix: 'login:'
    });

    if (!rateLimit.allowed) {
      return sendRateLimitError(res, rateLimit.retryAfter!);
    }

    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email e password sono obbligatori' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Email non valida' });
    }

    // Find user
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, password_hash, plan')
      .eq('email', email.toLowerCase())
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Email o password non corretti' });
    }

    // Check password
    const isPasswordValid = await comparePassword(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Email o password non corretti' });
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      plan: user.plan
    });

    // Add rate limit headers
    if (rateLimit.remaining !== undefined) {
      addRateLimitHeaders(res, rateLimit.remaining, 5);
    }

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        plan: user.plan
      }
    });

  } catch (error: any) {
    console.error('Login error:', error);

    // Don't expose internal error details in production
    const response: any = {
      error: 'Errore durante il login'
    };

    // Only include details in development mode
    if (process.env.NODE_ENV === 'development') {
      response.details = error.message;
    }

    return res.status(500).json(response);
  }
}
