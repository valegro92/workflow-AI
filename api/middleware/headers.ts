import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Response Headers Middleware
 *
 * Sets appropriate headers for:
 * - Caching (Cache-Control)
 * - Compression (Accept-Encoding)
 * - Security (Content-Type, X-Content-Type-Options)
 * - Performance optimization
 */

/**
 * Cache strategies for different types of content
 */
export enum CacheStrategy {
  /** No caching - always fetch fresh (auth, health checks) */
  NO_CACHE = 'no-cache',
  /** Cache for 5 minutes - frequently changing (user data, stats) */
  SHORT = 'short',
  /** Cache for 1 hour - moderately stable (API responses) */
  MEDIUM = 'medium',
  /** Cache for 24 hours - stable content (static assets, AI results) */
  LONG = 'long',
  /** Cache for 1 year - immutable (versioned assets) */
  IMMUTABLE = 'immutable'
}

/**
 * Get Cache-Control header value for a strategy
 */
function getCacheControl(strategy: CacheStrategy): string {
  switch (strategy) {
    case CacheStrategy.NO_CACHE:
      return 'no-cache, no-store, must-revalidate, max-age=0';

    case CacheStrategy.SHORT:
      // 5 minutes, can use stale while revalidating
      return 'public, max-age=300, stale-while-revalidate=60';

    case CacheStrategy.MEDIUM:
      // 1 hour, can use stale while revalidating
      return 'public, max-age=3600, stale-while-revalidate=300';

    case CacheStrategy.LONG:
      // 24 hours, can use stale while revalidating
      return 'public, max-age=86400, stale-while-revalidate=3600';

    case CacheStrategy.IMMUTABLE:
      // 1 year for immutable content (versioned assets)
      return 'public, max-age=31536000, immutable';

    default:
      return 'no-cache';
  }
}

/**
 * Set cache headers on response
 *
 * @param res - Vercel response object
 * @param strategy - Cache strategy to apply
 */
export function setCacheHeaders(
  res: VercelResponse,
  strategy: CacheStrategy
): void {
  res.setHeader('Cache-Control', getCacheControl(strategy));

  // Add Pragma for HTTP/1.0 compatibility
  if (strategy === CacheStrategy.NO_CACHE) {
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
}

/**
 * Set security headers on response
 *
 * Prevents common security issues like:
 * - MIME type sniffing
 * - Clickjacking
 * - XSS
 */
export function setSecurityHeaders(res: VercelResponse): void {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // XSS protection (legacy browsers)
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
}

/**
 * Set Content Security Policy headers
 *
 * Restricts what resources can be loaded to prevent XSS and injection attacks
 */
export function setCSPHeaders(res: VercelResponse): void {
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // unsafe-eval needed for Vite in dev
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.openrouter.ai https://api.groq.com https://*.supabase.co",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ');

  res.setHeader('Content-Security-Policy', csp);
}

/**
 * Set compression hints
 *
 * Note: Vercel handles actual compression automatically.
 * This just sets headers to indicate support.
 */
export function setCompressionHeaders(res: VercelResponse): void {
  // Indicate that compression is supported
  // Vercel automatically compresses responses, but we can hint preferences
  res.setHeader('Vary', 'Accept-Encoding');
}

/**
 * Set JSON response headers
 */
export function setJSONHeaders(res: VercelResponse): void {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  setSecurityHeaders(res);
  setCompressionHeaders(res);
}

/**
 * Middleware wrapper that sets standard response headers
 *
 * @param handler - API handler function
 * @param options - Header configuration
 * @returns Wrapped handler with headers
 */
export function withHeaders(
  handler: (req: VercelRequest, res: VercelResponse) => Promise<void> | void,
  options: {
    cache?: CacheStrategy;
    security?: boolean;
    csp?: boolean;
    json?: boolean;
  } = {}
) {
  const {
    cache = CacheStrategy.NO_CACHE,
    security = true,
    csp = false,
    json = true
  } = options;

  return async (req: VercelRequest, res: VercelResponse) => {
    // Set cache headers
    setCacheHeaders(res, cache);

    // Set security headers
    if (security) {
      setSecurityHeaders(res);
    }

    // Set CSP headers
    if (csp) {
      setCSPHeaders(res);
    }

    // Set JSON headers
    if (json) {
      setJSONHeaders(res);
    }

    return handler(req, res);
  };
}

/**
 * Set headers for API responses that should not be cached
 * (auth, mutations, user-specific data)
 */
export function setNoCacheHeaders(res: VercelResponse): void {
  setCacheHeaders(res, CacheStrategy.NO_CACHE);
  setJSONHeaders(res);
}

/**
 * Set headers for API responses that can be cached short-term
 * (frequently changing data)
 */
export function setShortCacheHeaders(res: VercelResponse): void {
  setCacheHeaders(res, CacheStrategy.SHORT);
  setJSONHeaders(res);
}

/**
 * Set headers for API responses that can be cached medium-term
 * (moderately stable data)
 */
export function setMediumCacheHeaders(res: VercelResponse): void {
  setCacheHeaders(res, CacheStrategy.MEDIUM);
  setJSONHeaders(res);
}

/**
 * Set headers for API responses that can be cached long-term
 * (stable data, AI results)
 */
export function setLongCacheHeaders(res: VercelResponse): void {
  setCacheHeaders(res, CacheStrategy.LONG);
  setJSONHeaders(res);
}
