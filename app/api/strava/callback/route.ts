import { NextRequest, NextResponse } from 'next/server';
import { exchangeToken, handleStravaError } from '@/lib/strava';

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
      return NextResponse.json(
        { error: 'Authorization denied', details: error },
        { status: 400 }
      );
    }

    if (!code) {
      return NextResponse.json(
        { error: 'No authorization code received' },
        { status: 400 }
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
    return handleStravaError(error, 'Token Exchange');
  }
}

