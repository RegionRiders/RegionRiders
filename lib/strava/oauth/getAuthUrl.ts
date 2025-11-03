import { getStravaClient } from '../config';

/**
 * Generates the Strava OAuth authorization URL
 * @param scope - OAuth scope (default: 'read,activity:read_all')
 * @returns Authorization URL string
 */
export async function getAuthorizationUrl(scope = 'read,activity:read_all'): Promise<string> {
  const strava = getStravaClient();

  return await strava.oauth.getRequestAccessURL({
    scope,
  });
}
