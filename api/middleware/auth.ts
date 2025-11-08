import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyToken, JwtPayload } from '../../src/lib/auth';

/**
 * Authentication middleware for API routes
 * Returns the authenticated user or throws an error
 */
export async function requireAuth(req: VercelRequest): Promise<JwtPayload> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Token mancante');
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    const decoded = verifyToken(token);
    return decoded;
  } catch (error) {
    throw new Error('Token non valido o scaduto');
  }
}

/**
 * Optional auth - returns user if authenticated, null otherwise
 */
export async function optionalAuth(req: VercelRequest): Promise<JwtPayload | null> {
  try {
    return await requireAuth(req);
  } catch (error) {
    return null;
  }
}
