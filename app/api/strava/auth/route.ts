import { NextResponse } from 'next/server';
import { handle500Error } from '@/lib/api';
import { getAuthorizationUrl } from '@/lib/strava';
import { generateState, storeState } from '@/lib/oauth/state';

/**
 * GET /api/strava/auth
 * Initiates Strava OAuth flow by redirecting to Strava authorization page
 * Generates and stores CSRF protection state parameter
 */
export async function GET() {
  try {
    // Generate CSRF protection state
    const state = generateState();
    await storeState(state);

    // Get authorization URL with state parameter
    const scope = 'read,activity:read_all';
    const authUrl = await getAuthorizationUrl(scope, state);

    return NextResponse.redirect(authUrl);
  } catch (error) {
    return handle500Error(error, `Strava API: ${'Authorization Request'}`);
  }
}
