import { stravaLogger } from '@/lib/logger';
import { getStravaClient } from '../config';

/**
 * Generates the Strava OAuth authorization URL
 * @param scope - OAuth scope (default: 'read,activity:read_all')
 * @returns Authorization URL string
 */
export async function getAuthorizationUrl(scope = 'read,activity:read_all'): Promise<string> {
  const strava = getStravaClient();

  stravaLogger.info({ scope }, 'Generating Strava OAuth authorization URL');

  const authUrl = await strava.oauth.getRequestAccessURL({
    scope,
  });

  stravaLogger.debug({ authUrl }, 'Strava OAuth URL generated');

  return authUrl;
}
