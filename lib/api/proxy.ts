import { NextRequest, NextResponse } from 'next/server';
import { apiLogger } from '@/lib/logger';

/**
 * Proxy to log API requests and responses
 * Can be used in API routes to automatically log request details
 */
export async function logApiRequestProxy(
  request: NextRequest,
  handler: () => Promise<NextResponse> | NextResponse
): Promise<NextResponse> {
  const startTime = Date.now();
  const { method, url } = request;
  const path = new URL(url).pathname;

  const requestId = crypto.randomUUID();

  apiLogger.info(
    {
      requestId,
      method,
      path,
      userAgent: request.headers.get('user-agent'),
    },
    'Incoming API request'
  );

  try {
    const response = await handler();
    const duration = Date.now() - startTime;

    apiLogger.info(
      {
        requestId,
        method,
        path,
        statusCode: response.status,
        duration: `${duration}ms`,
      },
      'API request completed'
    );

    return response;
  } catch (error) {
    const duration = Date.now() - startTime;

    apiLogger.error(
      {
        requestId,
        method,
        path,
        duration: `${duration}ms`,
        error:
          error instanceof Error
            ? {
                message: error.message,
                name: error.name,
              }
            : error,
      },
      'API request failed'
    );

    throw error;
  }
}

/**
 * Higher-order function to wrap API route handlers with logging
 * @param handler - The API route handler to wrap
 * @returns Wrapped handler with automatic logging
 */
export function withLogging(
  handler: (request: NextRequest, ...args: unknown[]) => Promise<NextResponse> | NextResponse
) {
  return async (request: NextRequest, ...args: unknown[]): Promise<NextResponse> => {
    return logApiRequestProxy(request, () => handler(request, ...args));
  };
}
