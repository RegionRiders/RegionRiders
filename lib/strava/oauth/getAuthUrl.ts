import { logger } from '@/lib/logger/client';

/**
 * Generates the Strava OAuth authorization URL with CSRF protection
 * @param scope - OAuth scope (default: 'read,activity:read_all')
 * @param state - CSRF protection state parameter
 * @returns Authorization URL string
 */
export function getAuthorizationUrl(scope = 'read,activity:read_all'): string {
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
