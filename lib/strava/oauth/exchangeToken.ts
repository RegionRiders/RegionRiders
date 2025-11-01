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

  const tokenResponse = await strava.oauth.getToken(code);

  return tokenResponse as StravaTokenResponse;
}

