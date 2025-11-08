import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../../src/lib/db';
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
    const result = await sql`
      SELECT id, email, password_hash, plan
      FROM users
      WHERE email = ${email.toLowerCase()}
    `;

    // Neon returns array directly
    if (result.length === 0) {
      return res.status(401).json({ error: 'Email o password non corretti' });
    }

    const user = result[0];

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
    return res.status(500).json({
      error: 'Errore durante il login',
      details: error.message
    });
  }
}
