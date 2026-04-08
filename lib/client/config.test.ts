import { getApiBaseUrl, getApiUrl } from '@/lib/client/config';

const originalEnv = process.env;

beforeEach(() => {
  jest.resetModules();
  process.env = { ...originalEnv };
  delete process.env.NEXT_PUBLIC_API_BASE_URL;
});

afterEach(() => {
  process.env = originalEnv;
});

describe('getApiBaseUrl', () => {
  it('returns NEXT_PUBLIC_API_BASE_URL when set', () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = 'https://example.com';
    expect(getApiBaseUrl()).toBe('https://example.com');
  });

  it('returns window.location.origin when no env var and window is defined', () => {
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
    const origin = window.location.origin;
    expect(getApiBaseUrl()).toBe(origin);
  });
});

describe('getApiUrl', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_BASE_URL = 'https://example.com';
  });

  it('throws for protocol-relative paths starting with //', () => {
    expect(() => getApiUrl('//evil.com/path')).toThrow(/absolute or protocol-relative/);
  });

  it('throws for absolute URLs with http scheme', () => {
    expect(() => getApiUrl('http://evil.com/path')).toThrow(/absolute or protocol-relative/);
  });

  it('throws for absolute URLs with https scheme', () => {
    expect(() => getApiUrl('https://evil.com/path')).toThrow(/absolute or protocol-relative/);
  });

  it('throws for paths with multiple leading slashes (///)', () => {
    expect(() => getApiUrl('///evil')).toThrow(/multiple leading slashes/);
  });

  it('prepends base URL to a path that starts with /', () => {
    expect(getApiUrl('/api/strava/auth')).toBe('https://example.com/api/strava/auth');
  });

  it('prepends base URL and adds leading slash when path does not start with /', () => {
    expect(getApiUrl('api/health')).toBe('https://example.com/api/health');
  });

  it('works with an empty path (root)', () => {
    expect(getApiUrl('')).toBe('https://example.com/');
  });

  describe('with trailing slash in NEXT_PUBLIC_API_BASE_URL', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_API_BASE_URL = 'https://example.com/';
    });

    it('normalizes the trailing slash when path starts with /', () => {
      expect(getApiUrl('/api/strava/auth')).toBe('https://example.com/api/strava/auth');
    });

    it('normalizes the trailing slash when path does not start with /', () => {
      expect(getApiUrl('api/health')).toBe('https://example.com/api/health');
    });

    it('works with an empty path (root)', () => {
      expect(getApiUrl('')).toBe('https://example.com/');
    });
  });
});
