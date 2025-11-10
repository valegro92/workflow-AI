import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * CSRF Protection Middleware
 *
 * Validates that the request originates from an allowed origin.
 * This prevents Cross-Site Request Forgery attacks.
 *
 * Works by checking the Origin or Referer header against a whitelist.
 */

/**
 * Get allowed origins from environment or use defaults
 */
function getAllowedOrigins(): string[] {
  const envOrigins = process.env.ALLOWED_ORIGINS;

  if (envOrigins) {
    return envOrigins.split(',').map(origin => origin.trim());
  }

  // Default allowed origins (should be configured in production)
  const defaults = [
    'http://localhost:3000',
    'http://localhost:5173', // Vite default
    'http://localhost:4173', // Vite preview
  ];

  // Add Vercel preview and production URLs if available
  if (process.env.VERCEL_URL) {
    defaults.push(`https://${process.env.VERCEL_URL}`);
  }

  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    defaults.push(`https://${process.env.NEXT_PUBLIC_VERCEL_URL}`);
  }

  // Add custom production URL if set
  if (process.env.PRODUCTION_URL) {
    defaults.push(process.env.PRODUCTION_URL);
  }

  return defaults;
}

/**
 * Extract origin from request headers
 */
function getRequestOrigin(req: VercelRequest): string | null {
  // Try Origin header first (sent with POST/PUT/DELETE)
  const origin = req.headers.origin;
  if (origin) {
    return typeof origin === 'string' ? origin : origin[0];
  }

  // Fall back to Referer header
  const referer = req.headers.referer || req.headers.referrer;
  if (referer) {
    try {
      const refererString = typeof referer === 'string' ? referer : referer[0];
      const url = new URL(refererString);
      return `${url.protocol}//${url.host}`;
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Check if origin is allowed
 */
function isOriginAllowed(origin: string | null, allowedOrigins: string[]): boolean {
  if (!origin) {
    // No origin header - could be a non-browser client or same-origin request
    // In development, allow; in production, should be stricter
    return process.env.NODE_ENV === 'development';
  }

  // Check exact match
  if (allowedOrigins.includes(origin)) {
    return true;
  }

  // Check wildcard patterns (e.g., "https://*.vercel.app")
  for (const allowed of allowedOrigins) {
    if (allowed.includes('*')) {
      const pattern = allowed.replace(/\*/g, '.*');
      const regex = new RegExp(`^${pattern}$`);
      if (regex.test(origin)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Verify CSRF token/origin for state-changing operations
 *
 * @param req - Vercel request object
 * @param res - Vercel response object
 * @returns true if CSRF check passes, false otherwise
 */
export function checkCSRF(req: VercelRequest, res: VercelResponse): boolean {
  // Only check POST, PUT, PATCH, DELETE (state-changing operations)
  const method = req.method?.toUpperCase();
  if (!method || ['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return true; // Safe methods don't need CSRF protection
  }

  const allowedOrigins = getAllowedOrigins();
  const requestOrigin = getRequestOrigin(req);

  if (!isOriginAllowed(requestOrigin, allowedOrigins)) {
    console.warn(`CSRF: Blocked request from origin: ${requestOrigin}`);
    console.warn(`CSRF: Allowed origins: ${allowedOrigins.join(', ')}`);

    res.status(403).json({
      error: 'CSRF validation failed',
      message: 'Request origin not allowed'
    });

    return false;
  }

  return true;
}

/**
 * CSRF middleware wrapper for easy use in handlers
 * Returns handler that checks CSRF before executing
 */
export function withCSRF(
  handler: (req: VercelRequest, res: VercelResponse) => Promise<void> | void
) {
  return async (req: VercelRequest, res: VercelResponse) => {
    if (!checkCSRF(req, res)) {
      return; // CSRF check failed, response already sent
    }

    return handler(req, res);
  };
}
