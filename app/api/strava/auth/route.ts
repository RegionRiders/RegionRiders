import { NextResponse } from 'next/server';
import { handle500Error } from '@/lib/api';
import { generateState, storeState } from '@/lib/oauth/state';
import { getAuthorizationUrl } from '@/lib/strava';

/**
 * Initiates the Strava OAuth flow by creating and persisting a CSRF state, then redirecting the client to Strava's authorization URL.
 *
 * If the Strava authorization URL cannot be constructed, responds with a JSON error and HTTP 503. On unexpected failures, returns a standardized 500 error response.
 *
 * @returns A NextResponse that redirects to the Strava authorization URL, or a JSON error response with status 503 if OAuth is not configured, or a standardized 500 error response on failure.
 */
export async function GET() {
  try {
    const state = generateState();
    await storeState(state);

    const scope = 'read,activity:read_all';
    const authUrl = await getAuthorizationUrl(scope, state); // <-- change

    if (!authUrl) {
      return NextResponse.json({ error: 'Strava OAuth not configured' }, { status: 503 });
    }

    return NextResponse.redirect(authUrl, 307);
  } catch (error) {
    return handle500Error(error, 'Strava API: Authorization Request');
  }
}
