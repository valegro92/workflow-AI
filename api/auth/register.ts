import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../src/lib/db';
import { hashPassword, generateToken, isValidEmail, getPasswordErrors } from '../../src/lib/auth';
import { checkRateLimit, sendRateLimitError, addRateLimitHeaders } from '../middleware/rateLimit';
import { checkCSRF } from '../middleware/csrf';
import { validateBody, type ValidationSchema } from '../middleware/validation';

/**
 * Validation schema for registration
 */
const registerSchema: ValidationSchema = {
  email: {
    type: 'string',
    required: true,
    minLength: 5,
    maxLength: 254,
    message: 'Email must be between 5 and 254 characters'
  },
  password: {
    type: 'string',
    required: true,
    minLength: 8,
    maxLength: 128,
    message: 'Password must be between 8 and 128 characters'
  }
};

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

  // CSRF Protection
  if (!checkCSRF(req, res)) {
    return; // Response already sent by checkCSRF
  }

  // Input validation
  const validationErrors = validateBody(req.body, registerSchema);
  if (validationErrors.length > 0) {
    return res.status(400).json({
      error: 'Invalid input',
      details: validationErrors.map(e => e.message)
    });
  }

  try {
    // Rate limiting: 3 attempts per hour (stricter than login)
    const rateLimit = checkRateLimit(req, {
      maxAttempts: 3,
      windowMs: 60 * 60 * 1000, // 1 hour
      blockDurationMs: 60 * 60 * 1000, // Block for 1 hour
      keyPrefix: 'register:'
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

    // Validate password strength
    const passwordErrors = getPasswordErrors(password);
    if (passwordErrors.length > 0) {
      return res.status(400).json({
        error: 'Password non sicura',
        details: 'La password deve contenere: ' + passwordErrors.join(', ')
      });
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

    // Add rate limit headers
    if (rateLimit.remaining !== undefined) {
      addRateLimitHeaders(res, rateLimit.remaining, 3);
    }

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

    // Don't expose internal error details in production
    const response: any = {
      error: 'Errore durante la registrazione'
    };

    // Only include details in development mode
    if (process.env.NODE_ENV === 'development') {
      response.details = error.message;
    }

    return res.status(500).json(response);
  }
}
