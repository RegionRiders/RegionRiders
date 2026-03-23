import 'server-only';

import { NextResponse } from 'next/server';
import { apiLogger, logError } from '@/lib/logger';

/**
 * Standard error response structure for API routes
 */
export interface ApiErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  timestamp: string;
  path?: string;
  context?: string;
}

/**
 * Creates a standardized 404 Not Found response
 * @param path - The requested path that was not found
 * @returns NextResponse with 404 status
 */
export function handle404Error(path?: string): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      error: 'Not Found',
      message: path
        ? `The API endpoint '${path}' does not exist`
        : 'The requested API endpoint does not exist',
      statusCode: 404,
      timestamp: new Date().toISOString(),
      ...(path && { path }),
    },
    { status: 404 }
  );
}

/**
 * Creates a standardized 500 Internal Server Error response
 * @param error - The error object or message
 * @param context - Additional context for logging
 * @returns NextResponse with 500 status
 */
export function handle500Error(error: unknown, context?: string): NextResponse<ApiErrorResponse> {
  const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';

  logError(apiLogger, error, context ? { context } : undefined);

  return NextResponse.json(
    {
      error: 'Internal Server Error',
      message: errorMessage,
      statusCode: 500,
      timestamp: new Date().toISOString(),
      ...(context && { context }),
    },
    { status: 500 }
  );
}

/**
 * Generic API error handler that determines the appropriate response
 * based on the error type
 * @param error - The error to handle
 * @param context - Additional context for logging
 * @returns NextResponse with appropriate status code
 */
export function handleApiError(error: unknown, context?: string): NextResponse<ApiErrorResponse> {
  if (
    error &&
    typeof error === 'object' &&
    'statusCode' in error &&
    typeof error.statusCode === 'number'
  ) {
    const statusCode = error.statusCode;
    const message =
      'message' in error && typeof error.message === 'string' ? error.message : 'An error occurred';

    return NextResponse.json(
      {
        error: statusCode === 404 ? 'Not Found' : 'Error',
        message,
        statusCode,
        timestamp: new Date().toISOString(),
        ...(context && { context }),
      },
      { status: statusCode }
    );
  }

  return handle500Error(error, context);
}
