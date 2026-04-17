import { stravaLogger } from '@/lib/logger';
import { getStravaOAuthClient } from '../config/client';

/**
 * Generates the Strava OAuth authorization URL with CSRF protection
 * @param scope - OAuth scope (default: 'read,activity:read_all')
 * @param state - CSRF protection state parameter
 * @returns Authorization URL string
 */
export async function getAuthorizationUrl(
  scope = 'read,activity:read_all',
  state?: string
): Promise<string> {
  const strava = getStravaOAuthClient();

  stravaLogger.debug({ scope, hasState: !!state }, 'Generating Strava OAuth authorization URL');

  const authUrl = await strava.oauth.getRequestAccessURL({
    scope,
    ...(state && { state }),
  });

  stravaLogger.debug('Strava OAuth URL generated');

  return authUrl;
}
