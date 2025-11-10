import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../src/lib/db';
import { verifyToken } from '../../src/lib/auth';

/**
 * Get current user
 * GET /api/auth/me
 * Headers: Authorization: Bearer <token>
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token mancante' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (error) {
      return res.status(401).json({ error: 'Token non valido o scaduto' });
    }

    // Get user from database
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, plan, stripe_customer_id, stripe_subscription_id, subscription_status, created_at')
      .eq('id', decoded.userId)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        plan: user.plan,
        stripeCustomerId: user.stripe_customer_id,
        stripeSubscriptionId: user.stripe_subscription_id,
        subscriptionStatus: user.subscription_status,
        createdAt: user.created_at
      }
    });

  } catch (error: any) {
    console.error('Me error:', error);

    // Don't expose internal error details in production
    const response: any = {
      error: 'Errore durante il recupero utente'
    };

    // Only include details in development mode
    if (process.env.NODE_ENV === 'development') {
      response.details = error.message;
    }

    return res.status(500).json(response);
  }
}
