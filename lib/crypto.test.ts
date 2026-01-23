/**
 * @jest-environment node
 */

/**
 * Cryptography utilities tests
 */

import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { decryptToken, encryptToken } from './crypto';

describe('Cryptography Utilities', () => {
  const originalEnv = { ...process.env };

  beforeAll(() => {
    // Set up test environment variables
    process.env.OAUTH_ENCRYPTION_KEY = 'test-encryption-key-for-unit-tests-only';
    process.env.OAUTH_ENCRYPTION_SALT = 'test-salt-for-unit-tests-only';
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('encryptToken', () => {
    it('should encrypt a token', () => {
      const plainText = 'test-access-token-123';
      const encrypted = encryptToken(plainText);

      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
      expect(encrypted).not.toBe(plainText);
      expect(encrypted.split(':')).toHaveLength(3); // IV:authTag:encrypted
    });

    it('should return empty string for empty input', () => {
      const encrypted = encryptToken('');
      expect(encrypted).toBe('');
    });

    it('should return null/undefined for null/undefined input', () => {
      expect(encryptToken(null as any)).toBeNull();
      expect(encryptToken(undefined as any)).toBeUndefined();
    });

    it('should produce different outputs for same input (due to random IV)', () => {
      const plainText = 'same-input';
      const encrypted1 = encryptToken(plainText);
      const encrypted2 = encryptToken(plainText);

      expect(encrypted1).not.toBe(encrypted2);
    });
  });

  describe('decryptToken', () => {
    it('should decrypt an encrypted token', () => {
      const plainText = 'test-refresh-token-456';
      const encrypted = encryptToken(plainText);
      const decrypted = decryptToken(encrypted);

      expect(decrypted).toBe(plainText);
    });

    it('should return empty string for empty input', () => {
      const decrypted = decryptToken('');
      expect(decrypted).toBe('');
    });

    it('should return null/undefined for null/undefined input', () => {
      expect(decryptToken(null as any)).toBeNull();
      expect(decryptToken(undefined as any)).toBeUndefined();
    });

    it('should throw error for invalid encrypted data format', () => {
      expect(() => decryptToken('invalid-format')).toThrow('Invalid encrypted data format');
      expect(() => decryptToken('incomplete:format')).toThrow('Invalid encrypted data format');
      expect(() => decryptToken('incomplete:format:missing')).toThrow(
        'Invalid encrypted data format'
      );
    });
  });

  describe('round-trip encryption', () => {
    it('should maintain data integrity through encrypt/decrypt cycle', () => {
      const testTokens = [
        'short-token',
        'a-longer-token-with-special-characters!@#$%^&*()',
        'token-with-unicode-🚀-characters',
        '1234567890',
        'token with spaces',
      ];

      testTokens.forEach((token) => {
        const encrypted = encryptToken(token);
        const decrypted = decryptToken(encrypted);
        expect(decrypted).toBe(token);
      });
    });
  });

  describe('environment variable validation', () => {
    it('should throw error when OAUTH_ENCRYPTION_KEY is missing', () => {
      const originalKey = process.env.OAUTH_ENCRYPTION_KEY;
      delete process.env.OAUTH_ENCRYPTION_KEY;

      expect(() => encryptToken('test')).toThrow(
        'OAUTH_ENCRYPTION_KEY environment variable is required'
      );

      // Restore
      process.env.OAUTH_ENCRYPTION_KEY = originalKey;
    });

    it('should throw error when OAUTH_ENCRYPTION_SALT is missing', () => {
      const originalSalt = process.env.OAUTH_ENCRYPTION_SALT;
      delete process.env.OAUTH_ENCRYPTION_SALT;

      expect(() => encryptToken('test')).toThrow(
        'OAUTH_ENCRYPTION_SALT environment variable is required'
      );

      // Restore
      process.env.OAUTH_ENCRYPTION_SALT = originalSalt;
    });

    it('should reject empty OAUTH_ENCRYPTION_SALT', () => {
      const originalSalt = process.env.OAUTH_ENCRYPTION_SALT;
      process.env.OAUTH_ENCRYPTION_SALT = '';

      expect(() => encryptToken('test')).toThrow(
        'OAUTH_ENCRYPTION_SALT environment variable is required'
      );

      // Restore
      process.env.OAUTH_ENCRYPTION_SALT = originalSalt;
    });
  });

  describe('OWASP compliance', () => {
    it('should use strong scrypt parameters (N=131072, r=8, p=1)', () => {
      const plainText = 'test-oauth-token';
      const encrypted = encryptToken(plainText);
      const decrypted = decryptToken(encrypted);

      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
      expect(encrypted).not.toBe(plainText);
      expect(decrypted).toBe(plainText);

      const startTime = Date.now();
      encryptToken('performance-test');
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000);
    });

    it('should use unique salt per installation to prevent rainbow table attacks', () => {
      const salt1 = process.env.OAUTH_ENCRYPTION_SALT;

      process.env.OAUTH_ENCRYPTION_SALT = 'different-installation-salt';

      const encrypted1 = encryptToken('same-token');

      process.env.OAUTH_ENCRYPTION_SALT = 'another-installation-salt';

      const encrypted2 = encryptToken('same-token');

      expect(encrypted1).not.toBe(encrypted2);

      process.env.OAUTH_ENCRYPTION_SALT = salt1;
    });
  });
});
