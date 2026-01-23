import { NextRequest, NextResponse } from 'next/server';
import { handle500Error, handleApiError } from '@/lib/api';
import { findOrCreateUser } from '@/lib/db/operations/users';
import { validateState } from '@/lib/oauth/state';
import { exchangeToken } from '@/lib/strava';

/**
 * GET /api/strava/callback
 * Handles OAuth callback from Strava
 * Validates state parameter, exchanges authorization code for access tokens,
 * and creates/updates user in database
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle authorization denial
    if (error) {
      return handleApiError(
        { statusCode: 400, message: `Authorization denied: ${error}` },
        'Strava API: Authorization Callback'
      );
    }

    // Validate authorization code presence
    if (!code) {
      return handleApiError(
        { statusCode: 400, message: 'No authorization code received' },
        'Strava API: Authorization Callback'
      );
    }

    // Validate CSRF state parameter
    const isValidState = await validateState(state);
    if (!isValidState.valid) {
      return handleApiError(
        { statusCode: 400, message: 'Invalid or expired state parameter' },
        'Strava API: CSRF Validation Failed'
      );
    }

    // Exchange authorization code for tokens
    const tokenData = await exchangeToken(code);

    // Create or update user in database
    const user = await findOrCreateUser({
      stravaId: tokenData.athlete.id.toString(),
      email: tokenData.athlete.email,
      firstName: tokenData.athlete.firstname,
      lastName: tokenData.athlete.lastname,
      profilePicture: tokenData.athlete.profile,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      tokenExpiresAt: new Date(tokenData.expires_at * 1000),
      isActive: true,
    });

    // TODO: Create session or JWT for authenticated user
    // TODO: Redirect to dashboard or success page
    // For now, return success response

    return NextResponse.json({
      success: true,
      message: 'Successfully authorized with Strava',
      athlete_id: tokenData.athlete.id,
      user_id: user.id,
    });
  } catch (error) {
    return handle500Error(error, `Strava API: ${'Token Exchange'}`);
  }
}
