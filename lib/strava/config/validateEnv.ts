/**
 * Validates that all required Strava environment variables are present
 * @throws {Error} if any required environment variable is missing
 */
export function validateStravaEnv(): void {
  validateStravaOAuthEnv();

  if (!process.env.STRAVA_CLIENT_ACCESS_TOKEN) {
    throw new Error('Missing required Strava environment variables: STRAVA_CLIENT_ACCESS_TOKEN');
  }
}

/**
 * Validates Strava OAuth bootstrap environment variables.
 * Does not require an existing access token.
 */
export function validateStravaOAuthEnv(): void {
  const requiredVars = ['STRAVA_CLIENT_ID', 'STRAVA_CLIENT_SECRET', 'STRAVA_REDIRECT_URI'];

  const missingVars = requiredVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(`Missing required Strava environment variables: ${missingVars.join(', ')}`);
  }
}
