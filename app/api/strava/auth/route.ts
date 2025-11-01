import { NextRequest, NextResponse } from 'next/server';
import { getAuthorizationUrl, handleStravaError } from '@/lib/strava';

/**
 * GET /api/strava/auth
 * Initiates Strava OAuth flow by redirecting to Strava authorization page
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope') || 'read,activity:read_all';

    const authUrl = await getAuthorizationUrl(scope);

    return NextResponse.redirect(authUrl);
  } catch (error) {
    return handleStravaError(error, 'Authorization Request');
  }
}

