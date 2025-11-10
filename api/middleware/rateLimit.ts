import type { VercelRequest, VercelResponse } from '@vercel/node';

interface RateLimitEntry {
  count: number;
  firstAttempt: number;
  blockedUntil?: number;
}

// In-memory storage for rate limiting
// Note: In serverless, this resets per cold start, which is acceptable
// For production with high traffic, consider Redis/Upstash
const rateLimitStore: Record<string, RateLimitEntry> = {};

// Cleanup old entries every hour to prevent memory bloat
setInterval(() => {
  const now = Date.now();
  Object.keys(rateLimitStore).forEach(key => {
    const entry = rateLimitStore[key];
    // Remove entries older than 1 hour
    if (now - entry.firstAttempt > 60 * 60 * 1000) {
      delete rateLimitStore[key];
    }
  });
}, 60 * 60 * 1000); // Run every hour

export interface RateLimitOptions {
  maxAttempts: number;      // Max attempts allowed
  windowMs: number;         // Time window in milliseconds
  blockDurationMs?: number; // How long to block after exceeding limit (default: same as window)
  keyPrefix?: string;       // Prefix for storage key (e.g., 'login:', 'register:')
}

/**
 * Get client identifier (IP address)
 */
function getClientId(req: VercelRequest): string {
  // Try multiple headers for IP (Vercel/CloudFlare/etc)
  const forwarded = req.headers['x-forwarded-for'];
  const realIp = req.headers['x-real-ip'];
  const cfConnectingIp = req.headers['cf-connecting-ip'];

  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }

  if (typeof realIp === 'string') {
    return realIp;
  }

  if (typeof cfConnectingIp === 'string') {
    return cfConnectingIp;
  }

  // Fallback to socket (less reliable in serverless)
  return req.socket?.remoteAddress || 'unknown';
}

/**
 * Rate limiting middleware
 * Returns true if request is allowed, false if rate limit exceeded
 */
export function checkRateLimit(
  req: VercelRequest,
  options: RateLimitOptions
): { allowed: boolean; retryAfter?: number; remaining?: number } {
  const { maxAttempts, windowMs, blockDurationMs = windowMs, keyPrefix = '' } = options;

  const clientId = getClientId(req);
  const key = `${keyPrefix}${clientId}`;
  const now = Date.now();

  // Get or create entry
  let entry = rateLimitStore[key];

  if (!entry) {
    // First request from this client
    entry = {
      count: 1,
      firstAttempt: now
    };
    rateLimitStore[key] = entry;

    return {
      allowed: true,
      remaining: maxAttempts - 1
    };
  }

  // Check if client is currently blocked
  if (entry.blockedUntil && now < entry.blockedUntil) {
    const retryAfter = Math.ceil((entry.blockedUntil - now) / 1000);
    return {
      allowed: false,
      retryAfter
    };
  }

  // Check if window has expired
  if (now - entry.firstAttempt > windowMs) {
    // Reset window
    entry.count = 1;
    entry.firstAttempt = now;
    entry.blockedUntil = undefined;

    return {
      allowed: true,
      remaining: maxAttempts - 1
    };
  }

  // Increment count
  entry.count++;

  // Check if limit exceeded
  if (entry.count > maxAttempts) {
    // Block client
    entry.blockedUntil = now + blockDurationMs;

    const retryAfter = Math.ceil(blockDurationMs / 1000);
    return {
      allowed: false,
      retryAfter
    };
  }

  return {
    allowed: true,
    remaining: maxAttempts - entry.count
  };
}

/**
 * Send rate limit error response
 */
export function sendRateLimitError(
  res: VercelResponse,
  retryAfter: number
): void {
  res.setHeader('Retry-After', retryAfter.toString());
  res.setHeader('X-RateLimit-Limit', '5');
  res.setHeader('X-RateLimit-Remaining', '0');
  res.setHeader('X-RateLimit-Reset', new Date(Date.now() + retryAfter * 1000).toISOString());

  res.status(429).json({
    error: 'Troppi tentativi. Riprova più tardi.',
    retryAfter: retryAfter,
    message: `Attendi ${retryAfter} secondi prima di riprovare.`
  });
}

/**
 * Add rate limit headers to successful response
 */
export function addRateLimitHeaders(
  res: VercelResponse,
  remaining: number,
  maxAttempts: number
): void {
  res.setHeader('X-RateLimit-Limit', maxAttempts.toString());
  res.setHeader('X-RateLimit-Remaining', remaining.toString());
}
