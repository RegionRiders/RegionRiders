/**
 * Validates that all required Strava environment variables are present
 * @throws {Error} if any required environment variable is missing
 */
export function validateStravaEnv(): void {
  const requiredVars = [
    'STRAVA_CLIENT_ID',
    'STRAVA_CLIENT_SECRET',
    'STRAVA_CLIENT_ACCESS_TOKEN',
    'STRAVA_REDIRECT_URI',
  ];

  const missingVars = requiredVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required Strava environment variables: ${missingVars.join(', ')}`
    );
  }
}

