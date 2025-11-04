import strava from 'strava-v3';
import { validateStravaEnv } from '@/lib/strava';

/**
 * Creates a new Strava API client instance with the provided configuration
 * @param config - Strava API configuration
 * @returns New Strava client instance
 */
export function createStravaClient(config: {
  client_id: string;
  client_secret: string;
  access_token: string;
  redirect_uri: string;
}) {
  const client = Object.create(strava);
  client.config(config);
  return client;
}

/**
 * Creates a Strava client with environment-based configuration
 * @returns New Strava client instance
 */
export function getStravaClient() {
  validateStravaEnv();

  return createStravaClient({
    client_id: process.env.STRAVA_CLIENT_ID!,
    client_secret: process.env.STRAVA_CLIENT_SECRET!,
    access_token: process.env.STRAVA_CLIENT_ACCESS_TOKEN!,
    redirect_uri: process.env.STRAVA_REDIRECT_URI!,
  });
}
