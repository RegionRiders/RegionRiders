/**
 * @jest-environment node
 */

import { validateStravaEnv } from '@/lib/strava';

describe('validateStravaEnv', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should pass when all variables are present', () => {
    process.env.STRAVA_CLIENT_ID = 'test_id';
    process.env.STRAVA_CLIENT_SECRET = 'test_secret';
    process.env.STRAVA_REDIRECT_URI = 'http://test.com/callback';
    process.env.STRAVA_ACCESS_TOKEN = 'test_token';

    expect(() => validateStravaEnv()).not.toThrow();
  });

  it('should throw when CLIENT_ID is missing', () => {
    delete process.env.STRAVA_CLIENT_ID;
    process.env.STRAVA_CLIENT_SECRET = 'test_secret';
    process.env.STRAVA_REDIRECT_URI = 'http://test.com/callback';
    process.env.STRAVA_ACCESS_TOKEN = 'test_token';

    expect(() => validateStravaEnv()).toThrow('Missing required Strava environment variables: STRAVA_CLIENT_ID');
  });

  it('should throw listing all missing variables', () => {
    delete process.env.STRAVA_CLIENT_ID;
    delete process.env.STRAVA_CLIENT_SECRET;
    process.env.STRAVA_REDIRECT_URI = 'http://test.com/callback';
    process.env.STRAVA_ACCESS_TOKEN = 'test_token';

    expect(() => validateStravaEnv()).toThrow(
      'Missing required Strava environment variables: STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET'
    );
  });
});

