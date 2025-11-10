import { stravaLogger } from '@/lib/logger';
import { getStravaClient } from '../config';

export interface StravaTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete: {
    id: number;
    [key: string]: any;
  };
}

/**
 * Exchanges authorization code for access tokens
 * @param code - Authorization code from Strava callback
 * @returns Token response with access_token, refresh_token, expires_at, and athlete info
 */
export async function exchangeToken(code: string): Promise<StravaTokenResponse> {
  const strava = getStravaClient();

  stravaLogger.debug({ codeLength: code.length }, 'Exchanging authorization code for tokens');

  try {
    const tokenResponse = await strava.oauth.getToken(code);

    stravaLogger.debug(
      {
        athleteId: tokenResponse.athlete?.id,
        expiresAt: tokenResponse.expires_at,
      },
      'Successfully exchanged authorization code for tokens'
    );

    return tokenResponse as StravaTokenResponse;
  } catch (error) {
    stravaLogger.error(
      { error: error instanceof Error ? error.message : error },
      'Failed to exchange authorization code'
    );
    throw error;
  }
}
