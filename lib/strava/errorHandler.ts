import { NextResponse } from 'next/server';

/**
 * Handles errors in Strava requests
 * Logs error details and returns appropriate HTTP response
 * @param error - Error object
 * @param context - Additional context for logging
 * @returns NextResponse with error details
 */
export function handleStravaError(error: unknown, context: string): NextResponse {
  if (error instanceof Error) {
    return NextResponse.json(
      {
        error: error.message,
        context,
      },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      error: 'An unknown error occurred',
      context,
    },
    { status: 500 }
  );
}

