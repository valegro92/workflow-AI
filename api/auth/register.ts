import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';
import { hashPassword, generateToken, isValidEmail, isValidPassword } from '../../src/lib/auth';

/**
 * Register a new user
 * POST /api/auth/register
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

    if (!isValidPassword(password)) {
      return res.status(400).json({ error: 'La password deve essere lunga almeno 8 caratteri' });
    }

    // Check if user already exists
    const existingUser = await sql`
      SELECT id FROM users WHERE email = ${email.toLowerCase()}
    `;

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email già registrata' });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const result = await sql`
      INSERT INTO users (email, password_hash, plan)
      VALUES (${email.toLowerCase()}, ${passwordHash}, 'free')
      RETURNING id, email, plan, created_at
    `;

    const user = result.rows[0];

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      plan: user.plan
    });

    return res.status(201).json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        plan: user.plan,
        createdAt: user.created_at
      }
    });

  } catch (error: any) {
    console.error('Register error:', error);
    return res.status(500).json({
      error: 'Errore durante la registrazione',
      details: error.message
    });
  }
}
