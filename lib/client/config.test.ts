/**
 * Client Config Tests
 * Tests for API URL configuration utilities
 */

import { getApiBaseUrl, getApiUrl } from './config';

describe('Client Config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset env
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('getApiBaseUrl', () => {
    it('returns NEXT_PUBLIC_API_BASE_URL when set', () => {
      process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.example.com';

      const result = getApiBaseUrl();

      expect(result).toBe('https://api.example.com');
    });

    it('returns a string', () => {
      const result = getApiBaseUrl();

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('returns URL with valid origin when window is defined (jsdom)', () => {
      // In jsdom, window is defined, so it should return window.location.origin
      delete process.env.NEXT_PUBLIC_API_BASE_URL;

      const result = getApiBaseUrl();

      // jsdom returns http://localhost by default
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });
  });

  describe('getApiUrl', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.example.com';
    });

    it('builds complete URL with leading slash', () => {
      const result = getApiUrl('/api/users');

      expect(result).toBe('https://api.example.com/api/users');
    });

    it('adds leading slash when missing', () => {
      const result = getApiUrl('api/health');

      expect(result).toBe('https://api.example.com/api/health');
    });

    it('handles empty path', () => {
      const result = getApiUrl('');

      expect(result).toBe('https://api.example.com/');
    });

    it('handles complex paths', () => {
      const result = getApiUrl('/api/v1/users/123/activities');

      expect(result).toBe('https://api.example.com/api/v1/users/123/activities');
    });

    it('handles paths with query strings', () => {
      const result = getApiUrl('/api/search?q=test&limit=10');

      expect(result).toBe('https://api.example.com/api/search?q=test&limit=10');
    });
  });
});
