import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withHeaders, CacheStrategy } from './middleware/headers';

/**
 * Health Check Endpoint
 * GET /api/health
 *
 * Returns the health status of the API.
 * Used by monitoring systems, load balancers, and uptime checks.
 *
 * Response codes:
 * - 200: All systems operational
 */
async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const startTime = Date.now();
  const checks = {
    api: true,
    timestamp: new Date().toISOString()
  };

  try {
    // Calculate response time
    const responseTime = Date.now() - startTime;

    // Determine overall health status
    const status = 'healthy';
    const statusCode = 200;

    // Build response
    const response: any = {
      status,
      checks,
      responseTime: `${responseTime}ms`,
      uptime: process.uptime(),
      timestamp: checks.timestamp
    };

    // Add version info if available
    if (process.env.VERCEL_GIT_COMMIT_SHA) {
      response.version = process.env.VERCEL_GIT_COMMIT_SHA.substring(0, 7);
    }

    // Add environment (without exposing sensitive info)
    response.environment = process.env.NODE_ENV || 'production';

    return res.status(statusCode).json(response);

  } catch (error: any) {
    console.error('Health check error:', error);

    return res.status(503).json({
      status: 'unhealthy',
      error: 'Health check failed',
      checks,
      timestamp: new Date().toISOString()
    });
  }
}

// Export handler with no-cache headers (health checks should always be fresh)
export default withHeaders(handler, {
  cache: CacheStrategy.NO_CACHE,
  security: true,
  csp: false,
  json: true
});
