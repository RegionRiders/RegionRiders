import strava from 'strava-v3';
import { validateStravaEnv } from '@/lib/strava';

/**
 * Configures and returns the Strava API client
 * @returns Configured Strava client instance
 */
export function getStravaClient() {
  validateStravaEnv();

  strava.config({
    client_id: process.env.STRAVA_CLIENT_ID!,
    client_secret: process.env.STRAVA_CLIENT_SECRET!,
    redirect_uri: process.env.STRAVA_REDIRECT_URI!,
    access_token: process.env.STRAVA_ACCESS_TOKEN!,
  });

  return strava;
}

