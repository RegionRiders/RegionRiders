/**
 * @jest-environment node
 */

import { validateStravaEnv, validateStravaOAuthEnv } from '@/lib/strava';

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
    process.env.STRAVA_CLIENT_ACCESS_TOKEN = 'test_token';

    expect(() => validateStravaEnv()).not.toThrow();
  });

  it('should throw when CLIENT_ID is missing', () => {
    delete process.env.STRAVA_CLIENT_ID;
    process.env.STRAVA_CLIENT_SECRET = 'test_secret';
    process.env.STRAVA_REDIRECT_URI = 'http://test.com/callback';
    process.env.STRAVA_CLIENT_ACCESS_TOKEN = 'test_token';

    expect(() => validateStravaEnv()).toThrow(
      'Missing required Strava environment variables: STRAVA_CLIENT_ID'
    );
  });

  it('should throw listing all missing variables', () => {
    delete process.env.STRAVA_CLIENT_ID;
    delete process.env.STRAVA_CLIENT_SECRET;
    process.env.STRAVA_REDIRECT_URI = 'http://test.com/callback';
    process.env.STRAVA_CLIENT_ACCESS_TOKEN = 'test_token';

    expect(() => validateStravaEnv()).toThrow(
      'Missing required Strava environment variables: STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET'
    );
  });

  it('allows OAuth bootstrap without an access token', () => {
    process.env.STRAVA_CLIENT_ID = 'test_id';
    process.env.STRAVA_CLIENT_SECRET = 'test_secret';
    process.env.STRAVA_REDIRECT_URI = 'http://test.com/callback';
    delete process.env.STRAVA_CLIENT_ACCESS_TOKEN;

    expect(() => validateStravaOAuthEnv()).not.toThrow();
  });

  it('still requires access token for full API client validation', () => {
    process.env.STRAVA_CLIENT_ID = 'test_id';
    process.env.STRAVA_CLIENT_SECRET = 'test_secret';
    process.env.STRAVA_REDIRECT_URI = 'http://test.com/callback';
    delete process.env.STRAVA_CLIENT_ACCESS_TOKEN;

    expect(() => validateStravaEnv()).toThrow(
      'Missing required Strava environment variables: STRAVA_CLIENT_ACCESS_TOKEN'
    );
  });
});
