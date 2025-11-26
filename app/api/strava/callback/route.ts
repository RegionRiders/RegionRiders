import { NextRequest, NextResponse } from 'next/server';
import { handle500Error, handleApiError } from '@/lib/api';
import { exchangeToken } from '@/lib/strava';

/**
 * GET /api/strava/callback
 * Handles OAuth callback from Strava
 * Exchanges authorization code for access tokens and logs them to console
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      return handleApiError(
        { statusCode: 400, message: `Authorization denied: ${error}` },
        'Strava API: Authorization Callback'
      );
    }

    if (!code) {
      return handleApiError(
        { statusCode: 400, message: 'No authorization code received' },
        'Strava API: Authorization Callback'
      );
    }

    const tokenData = await exchangeToken(code);

    // TODO: Save the token into db.

    return NextResponse.json({
      success: true,
      message: 'Successfully authorized with Strava.',
      athlete_id: tokenData.athlete.id,
    });
  } catch (error) {
    return handle500Error(error, `Strava API: ${'Token Exchange'}`);
  }
}
