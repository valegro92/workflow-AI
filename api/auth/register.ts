import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../src/lib/db';
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

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user (atomic operation - database will enforce unique constraint)
    // No need for preliminary check - let the database handle uniqueness
    const { data: user, error: insertError } = await supabase
      .from('users')
      .insert({
        email: email.toLowerCase(),
        password_hash: passwordHash,
        plan: 'free'
      })
      .select('id, email, plan, created_at')
      .single();

    // Handle errors
    if (insertError) {
      // Check if it's a duplicate email error (unique constraint violation)
      // PostgreSQL error code 23505 = unique_violation
      if (insertError.code === '23505' || insertError.message?.includes('duplicate') || insertError.message?.includes('unique')) {
        return res.status(400).json({ error: 'Email già registrata' });
      }

      // Other database errors
      console.error('Database error during user creation:', insertError);
      throw new Error(insertError.message || 'Failed to create user');
    }

    if (!user) {
      throw new Error('Failed to create user - no data returned');
    }

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
