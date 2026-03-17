import { NextResponse } from 'next/server';
import { handle500Error } from '@/lib/api';
import { getAuthorizationUrl } from '@/lib/strava';

/**
 * GET /api/strava/auth
 * Initiates Strava OAuth flow by redirecting to Strava authorization page
 */
export async function GET() {
  try {
    const scope = 'read,activity:read_all';
    const authUrl = getAuthorizationUrl(scope);

    if (!authUrl) {
      return NextResponse.json(
        { error: 'Strava OAuth not configured' },
        { status: 503 }
      );
    }

    return NextResponse.redirect(authUrl, 307);
  } catch (error) {
    return handle500Error(error, 'Strava API: Authorization Request');
  }
}
