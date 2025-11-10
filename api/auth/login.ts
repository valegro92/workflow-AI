import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../src/lib/db';
import { comparePassword, generateToken, isValidEmail } from '../../src/lib/auth';

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

  try {
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
