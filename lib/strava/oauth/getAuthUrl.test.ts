/**
 * @jest-environment node
 */

import { getStravaClient } from '../config';
import { getAuthorizationUrl } from './getAuthUrl';

describe('getAuthorizationUrl', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should return authorization URL with default scope', () => {
    process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID = '123456';
    process.env.NEXT_PUBLIC_STRAVA_REDIRECT_URI = 'http://localhost:3000/callback';

    const result = getAuthorizationUrl();

    expect(result).toContain('https://www.strava.com/oauth/authorize?');
    expect(result).toContain('client_id=123456');
    expect(result).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fcallback');
    expect(result).toContain('response_type=code');
    expect(result).toContain('approval_prompt=auto');
    expect(result).toContain('scope=read%2Cactivity%3Aread_all');
  });

  it('should return authorization URL with custom scope', () => {
    process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID = '123456';
    process.env.NEXT_PUBLIC_STRAVA_REDIRECT_URI = 'http://localhost:3000/callback';

    const customScope = 'read,activity:write';
    const result = getAuthorizationUrl(customScope);

    expect(result).toContain('scope=read%2Cactivity%3Awrite');
  });

  it('should return empty string when credentials are missing', () => {
    delete process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID;
    delete process.env.STRAVA_CLIENT_ID;
    delete process.env.NEXT_PUBLIC_STRAVA_REDIRECT_URI;
    delete process.env.STRAVA_REDIRECT_URI;

    const result = getAuthorizationUrl();

    expect(result).toBe('');
  });

  it('should use fallback env vars if NEXT_PUBLIC vars are missing', () => {
    delete process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID;
    delete process.env.NEXT_PUBLIC_STRAVA_REDIRECT_URI;
    process.env.STRAVA_CLIENT_ID = '789';
    process.env.STRAVA_REDIRECT_URI = 'http://example.com/callback';

    const result = getAuthorizationUrl();

    expect(result).toContain('client_id=789');
    expect(result).toContain('redirect_uri=http%3A%2F%2Fexample.com%2Fcallback');
  });

  it('should properly encode special characters in scope', () => {
    process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID = '123';
    process.env.NEXT_PUBLIC_STRAVA_REDIRECT_URI = 'http://localhost:3000/callback';

    const result = getAuthorizationUrl('read,activity:read_all,profile:read_all');

    expect(result).toContain('scope=read%2Cactivity%3Aread_all%2Cprofile%3Aread_all');
  });
});
