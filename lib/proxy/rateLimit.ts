/**
 * Rate Limiting Proxy
 * Protects API routes from abuse and DoS attacks
 * Uses express-rate-limit with Next.js proxy adapter
 */

import { NextRequest, NextResponse } from 'next/server';
import expressRateLimit from 'express-rate-limit';

/**
 * Get client IP from Next.js request
 * Handles various proxy configurations
 */
function getClientIP(request: NextRequest): string {
  let ip: string;

  // If behind a proxy (Vercel, Cloudflare, nginx), use forwarded IP
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // X-Forwarded-For format: client, proxy1, proxy2
    // Use rightmost untrusted IP (first from left in most cases)
    const ips = forwardedFor.split(',').map((ip) => ip.trim());

    // In production, you should validate against TRUSTED_PROXIES
    // For now, use the first IP (client IP in most proxy configurations)
    ip = ips[0] || 'unknown';
  } else {
    // Fallback to other headers
    ip = request.headers.get('x-real-ip') || 'unknown';
  }

  // Validate IP format to prevent abuse
  if (!isValidIpFormat(ip)) {
    ip = 'invalid-ip';
  }

  return ip;
}

/**
 * Basic IP format validation
 * Prevents using arbitrary strings as identifiers
 */
function isValidIpFormat(ip: string): boolean {
  if (ip === 'unknown' || ip === 'invalid-ip') {
    return false;
  }

  // IPv4 pattern
  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  // IPv6 pattern (simplified)
  const ipv6Pattern = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;

  return ipv4Pattern.test(ip) || ipv6Pattern.test(ip);
}

/**
 * Create Next.js compatible rate limiter using express-rate-limit
 * @param options - express-rate-limit configuration
 * @returns Next.js proxy function
 */
function createNextRateLimit(options: any) {
  const limiter = expressRateLimit({
    windowMs: options.windowMs || 60 * 1000,
    limit: options.max || 100,
    message: {
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
      statusCode: 429,
      timestamp: new Date().toISOString(),
    },
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    ...options,
  });

  return async (request: NextRequest, userId?: string) => {
    // Create Express-like request object
    const expressReq = {
      ip: userId ? `user:${userId}` : getClientIP(request),
      headers: Object.fromEntries(request.headers),
      method: request.method,
      url: request.url,
    };

    // Create Express-like response object
    const expressRes = {
      status: (code: number) => ({
        send: (body: any) => ({ status: code, body }),
        json: (body: any) => ({ status: code, body }),
      }),
      headers: {} as Record<string, string>,
    };

    return new Promise<NextResponse | { headers: Record<string, string> }>((resolve) => {
      // Call express-rate-limit proxy
      limiter(expressReq as any, expressRes as any, (result: any) => {
        if (result) {
          // Rate limited - result is the error response
          const statusCode = result.status || 429;
          const responseBody = typeof result === 'string' ? { message: result } : result;

          resolve(NextResponse.json(responseBody, {
            status: statusCode,
            headers: expressRes.headers,
          }));
        } else {
          // Not rate limited - return headers
          resolve({
            headers: expressRes.headers,
          });
        }
      });
    });
  };
}

/**
 * Different rate limiters for different use cases
 * Using express-rate-limit with Next.js proxy adapter
 */
export const rateLimiters = {
  auth: {
    windowMs: 60 * 1000,
    max: 5,
  },

  api: {
    windowMs: 60 * 1000,
    max: 60,
  },

  read: {
    windowMs: 60 * 1000,
    max: 100,
  },
};

/**
 * Rate limit configuration type
 */
type RateLimiterConfig = {
  windowMs: number;
  max: number;
};

/**
 * Rate limit proxy factory
 * @param config - The rate limiter configuration
 * @returns Proxy function
 */
export function createRateLimitProxy(config: RateLimiterConfig) {
  return createNextRateLimit(config);
}

/**
 * Rate limit decorators for easy use in API routes
 */
export const rateLimit = {
  auth: createRateLimitProxy(rateLimiters.auth),
  api: createRateLimitProxy(rateLimiters.api),
  read: createRateLimitProxy(rateLimiters.read),
};