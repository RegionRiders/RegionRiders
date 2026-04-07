/**
 * @jest-environment node
 */

import { getApiBaseUrl, getApiUrl } from './config';

describe('getApiBaseUrl', () => {
  const originalEnv = process.env.NEXT_PUBLIC_API_BASE_URL;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.NEXT_PUBLIC_API_BASE_URL;
    } else {
      process.env.NEXT_PUBLIC_API_BASE_URL = originalEnv;
    }
  });

  it('returns NEXT_PUBLIC_API_BASE_URL when set', () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.example.com';

    const result = getApiBaseUrl();

    expect(result).toBe('https://api.example.com');
  });

  it('returns window.location.origin in browser environment', () => {
    delete process.env.NEXT_PUBLIC_API_BASE_URL;

    const originalWindow = global.window;
    Object.defineProperty(global, 'window', {
      value: { location: { origin: 'https://browser.example.com' } },
      writable: true,
      configurable: true,
    });

    const result = getApiBaseUrl();

    expect(result).toBe('https://browser.example.com');

    Object.defineProperty(global, 'window', {
      value: originalWindow,
      writable: true,
      configurable: true,
    });
  });

  it('returns http://localhost:3000 in server-side (node) environment', () => {
    delete process.env.NEXT_PUBLIC_API_BASE_URL;

    // In a node test environment, `window` is not defined
    const result = getApiBaseUrl();

    expect(result).toBe('http://localhost:3000');
  });
});

describe('getApiUrl', () => {
  const originalEnv = process.env.NEXT_PUBLIC_API_BASE_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.example.com';
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.NEXT_PUBLIC_API_BASE_URL;
    } else {
      process.env.NEXT_PUBLIC_API_BASE_URL = originalEnv;
    }
  });

  it('builds a URL from a path starting with /', () => {
    const result = getApiUrl('/api/strava/auth');

    expect(result).toBe('https://api.example.com/api/strava/auth');
  });

  it('prepends / to a path that does not start with /', () => {
    const result = getApiUrl('api/strava/auth');

    expect(result).toBe('https://api.example.com/api/strava/auth');
  });
});
