import { logger } from '@/lib/logger/client';

/**
 * Builds a Strava OAuth authorization URL including an optional CSRF `state` parameter.
 *
 * @param scope - OAuth scope string (defaults to `'read,activity:read_all'`)
 * @param state - Optional CSRF `state` parameter to include in the URL
 * @returns The authorization URL, or an empty string if Strava client credentials or redirect URI are not configured
 */
export function getAuthorizationUrl(scope = 'read,activity:read_all', state?: string): string {
  const CLIENT_ID = process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID || process.env.STRAVA_CLIENT_ID;
  const REDIRECT_URI =
    process.env.NEXT_PUBLIC_STRAVA_REDIRECT_URI || process.env.STRAVA_REDIRECT_URI;

  if (!CLIENT_ID || !REDIRECT_URI) {
    logger.warn('Strava credentials not configured');
    return '';
  }

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    approval_prompt: 'auto',
    scope,
    ...(state && { state }),
  });

  return `https://www.strava.com/oauth/authorize?${params.toString()}`;
}
