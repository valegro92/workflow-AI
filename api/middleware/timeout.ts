import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Request Timeout Middleware
 *
 * Prevents requests from hanging indefinitely by enforcing a timeout.
 * This is critical for serverless functions to prevent resource exhaustion.
 *
 * Default timeout: 25 seconds (Vercel's limit is 10s for Hobby, 60s for Pro)
 * We use 25s as a safe default that works across plans.
 */

export interface TimeoutOptions {
  timeoutMs?: number; // Timeout in milliseconds (default: 25000)
  message?: string;   // Custom timeout message
}

/**
 * Wraps an API handler with timeout protection
 *
 * @param handler - The API handler function to wrap
 * @param options - Timeout configuration options
 * @returns Wrapped handler with timeout protection
 */
export function withTimeout(
  handler: (req: VercelRequest, res: VercelResponse) => Promise<void> | void,
  options: TimeoutOptions = {}
) {
  const {
    timeoutMs = 25000, // 25 seconds default
    message = 'Request timeout - operation took too long'
  } = options;

  return async (req: VercelRequest, res: VercelResponse) => {
    // Create a promise that rejects after timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('TIMEOUT'));
      }, timeoutMs);
    });

    // Race between handler execution and timeout
    try {
      await Promise.race([
        handler(req, res),
        timeoutPromise
      ]);
    } catch (error: any) {
      // Check if it's a timeout error
      if (error.message === 'TIMEOUT') {
        // Only send response if it hasn't been sent yet
        if (!res.headersSent) {
          console.error(`Request timeout after ${timeoutMs}ms:`, {
            method: req.method,
            url: req.url,
            timeout: timeoutMs
          });

          return res.status(504).json({
            error: 'Gateway Timeout',
            message,
            timeout: `${timeoutMs}ms`
          });
        }
      } else {
        // Re-throw non-timeout errors to be handled by the caller
        throw error;
      }
    }
  };
}

/**
 * Check if enough time remains for an operation
 *
 * Useful for long-running operations that need to check if they should continue
 * or abort to avoid timeout.
 *
 * @param startTime - When the request started (Date.now())
 * @param timeoutMs - Total timeout in milliseconds
 * @param bufferMs - Safety buffer in milliseconds (default: 2000)
 * @returns true if there's enough time left, false otherwise
 */
export function hasTimeRemaining(
  startTime: number,
  timeoutMs: number,
  bufferMs: number = 2000
): boolean {
  const elapsed = Date.now() - startTime;
  const remaining = timeoutMs - elapsed;
  return remaining > bufferMs;
}

/**
 * Calculate remaining time for an operation
 *
 * @param startTime - When the request started (Date.now())
 * @param timeoutMs - Total timeout in milliseconds
 * @returns Remaining time in milliseconds
 */
export function getRemainingTime(
  startTime: number,
  timeoutMs: number
): number {
  const elapsed = Date.now() - startTime;
  return Math.max(0, timeoutMs - elapsed);
}
