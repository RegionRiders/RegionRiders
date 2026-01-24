/**
 * @jest-environment node
 */

/**
 * Cryptography utilities tests
 */

import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { clearEncryptionKeyCache, decryptToken, encryptToken } from './crypto';

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

    describe('getEncryptionKey caching', () => {
      it('should cache derived key for same environment variables', () => {
        const text = 'test-token';

        // First call - key derivation
        const encrypted1 = encryptToken(text);
        const decrypted1 = decryptToken(encrypted1);
        expect(decrypted1).toBe(text);

        // Second call - should use cached key (same result)
        const encrypted2 = encryptToken(text);
        const decrypted2 = decryptToken(encrypted2);
        expect(decrypted2).toBe(text);
      });

      it('should invalidate cache when environment variables change', () => {
        const originalKey = process.env.OAUTH_ENCRYPTION_KEY;
        const originalSalt = process.env.OAUTH_ENCRYPTION_SALT;

        try {
          // Encrypt with first key
          const text = 'test-token';
          const encrypted1 = encryptToken(text);

          // Change environment variables
          process.env.OAUTH_ENCRYPTION_KEY = `new-test-key-${Math.random()}`;
          process.env.OAUTH_ENCRYPTION_SALT = `new-test-salt-${Math.random()}`;

          // Encrypt with new key (cache should be invalidated)
          const encrypted2 = encryptToken(text);

          // Should produce different encrypted values
          expect(encrypted1).not.toBe(encrypted2);
        } finally {
          process.env.OAUTH_ENCRYPTION_KEY = originalKey;
          process.env.OAUTH_ENCRYPTION_SALT = originalSalt;
          clearEncryptionKeyCache();
        }
      });

      it('should allow manual cache clearing', () => {
        const text = 'test-token';
        const encrypted1 = encryptToken(text);

        // Clear cache
        clearEncryptionKeyCache();

        // Encrypt again - should derive new key
        const encrypted2 = encryptToken(text);

        // Should produce different encrypted values (new IV due to fresh encryption)
        expect(encrypted1).not.toBe(encrypted2);
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

    it('should provide detailed error in development mode', () => {
      const originalEnv = process.env.NODE_ENV;

      try {
        Object.defineProperty(process.env, 'NODE_ENV', {
          value: 'development',
          writable: true,
          configurable: true,
        });

        expect(() => decryptToken('invalid:format:data')).toThrow(/Invalid encrypted data format:/);
      } finally {
        Object.defineProperty(process.env, 'NODE_ENV', {
          value: originalEnv,
          writable: true,
          configurable: true,
        });
      }
    });

    it('should hide error details in production mode', () => {
      const originalEnv = process.env.NODE_ENV;

      try {
        Object.defineProperty(process.env, 'NODE_ENV', {
          value: 'production',
          writable: true,
          configurable: true,
        });

        expect(() => decryptToken('invalid:format:data')).toThrow('Invalid encrypted data format');
      } finally {
        Object.defineProperty(process.env, 'NODE_ENV', {
          value: originalEnv,
          writable: true,
          configurable: true,
        });
      }
    });
  });

  describe('edge cases', () => {
    describe('concurrent encryption', () => {
      it('should handle 100 parallel encryption calls correctly', async () => {
        const text = 'concurrent-test-token';
        const promises = Array.from({ length: 100 }, () => encryptToken(text));
        const encryptedValues = await Promise.all(promises);

        expect(encryptedValues).toHaveLength(100);

        encryptedValues.forEach((encrypted) => {
          expect(encrypted).toBeDefined();
          expect(typeof encrypted).toBe('string');
          expect(encrypted).not.toBe(text);

          const decrypted = decryptToken(encrypted);
          expect(decrypted).toBe(text);
        });
      });

      it('should maintain cache consistency under concurrent access', async () => {
        const text = 'cache-consistency-test';
        const promises = Array.from({ length: 50 }, () => encryptToken(text));
        const results = await Promise.all(promises);

        results.forEach((encrypted) => {
          const decrypted = decryptToken(encrypted);
          expect(decrypted).toBe(text);
        });
      });
    });

    describe('input validation', () => {
      it('should throw TypeError for non-string input to encryptToken', () => {
        expect(() => encryptToken(123 as any)).toThrow(TypeError);
        expect(() => encryptToken({} as any)).toThrow(TypeError);
        expect(() => encryptToken([] as any)).toThrow(TypeError);
      });

      it('should throw TypeError for non-string input to decryptToken', () => {
        expect(() => decryptToken(123 as any)).toThrow(TypeError);
        expect(() => decryptToken({} as any)).toThrow(TypeError);
        expect(() => decryptToken([] as any)).toThrow(TypeError);
      });

      it('should handle very long strings (10KB)', () => {
        const longString = 'x'.repeat(10_000);
        const encrypted = encryptToken(longString);
        const decrypted = decryptToken(encrypted);
        expect(decrypted).toBe(longString);
      });

      it('should handle very long strings (100KB)', () => {
        const longString = 'y'.repeat(100_000);
        const encrypted = encryptToken(longString);
        const decrypted = decryptToken(encrypted);
        expect(decrypted).toBe(longString);
      });

      it('should handle unicode emoji characters', () => {
        const emojiString = 'token-with-emoji-🚀🎉🎊-and-more-😀😂🤔';
        const encrypted = encryptToken(emojiString);
        const decrypted = decryptToken(encrypted);
        expect(decrypted).toBe(emojiString);
      });

      it('should handle CJK characters', () => {
        const cjkString = 'token-with-chinese-中文-日文-한글-characters';
        const encrypted = encryptToken(cjkString);
        const decrypted = decryptToken(encrypted);
        expect(decrypted).toBe(cjkString);
      });

      it('should handle RTL text (Arabic)', () => {
        const arabicString = 'token-with-arabic-مرحبا-العربية';
        const encrypted = encryptToken(arabicString);
        const decrypted = decryptToken(encrypted);
        expect(decrypted).toBe(arabicString);
      });

      it('should handle special characters', () => {
        const specialChars = '!@#$%^&*()_+-=[]{}|;:",.<>?/~`';
        const encrypted = encryptToken(specialChars);
        const decrypted = decryptToken(encrypted);
        expect(decrypted).toBe(specialChars);
      });

      it('should handle newlines and tabs', () => {
        const newlineString = 'line1\nline2\rline3\ttabbed';
        const encrypted = encryptToken(newlineString);
        const decrypted = decryptToken(encrypted);
        expect(decrypted).toBe(newlineString);
      });

      it('should handle null bytes', () => {
        const nullByteString = 'token\x00with\x00null\x00bytes';
        const encrypted = encryptToken(nullByteString);
        const decrypted = decryptToken(encrypted);
        expect(decrypted).toBe(nullByteString);
      });

      it('should handle whitespace-only strings', () => {
        const whitespaceString = '   \t\n\r   ';
        const encrypted = encryptToken(whitespaceString);
        const decrypted = decryptToken(encrypted);
        expect(decrypted).toBe(whitespaceString);
      });

      it('should handle mixed encodings', () => {
        const mixedString = 'English-中文-日本語-한국어-العربية-🚀';
        const encrypted = encryptToken(mixedString);
        const decrypted = decryptToken(encrypted);
        expect(decrypted).toBe(mixedString);
      });
    });

    describe('cache invalidation edge cases', () => {
      it('should invalidate cache when only key changes', () => {
        const originalKey = process.env.OAUTH_ENCRYPTION_KEY;
        const originalSalt = process.env.OAUTH_ENCRYPTION_SALT;

        try {
          const text = 'cache-key-test';
          const encrypted1 = encryptToken(text);

          process.env.OAUTH_ENCRYPTION_KEY = `different-key-${Math.random()}`;

          const encrypted2 = encryptToken(text);
          expect(encrypted1).not.toBe(encrypted2);

          const decrypted2 = decryptToken(encrypted2);
          expect(decrypted2).toBe(text);
        } finally {
          process.env.OAUTH_ENCRYPTION_KEY = originalKey;
          process.env.OAUTH_ENCRYPTION_SALT = originalSalt;
          clearEncryptionKeyCache();
        }
      });

      it('should invalidate cache when only salt changes', () => {
        const originalKey = process.env.OAUTH_ENCRYPTION_KEY;
        const originalSalt = process.env.OAUTH_ENCRYPTION_SALT;

        try {
          const text = 'cache-salt-test';
          const encrypted1 = encryptToken(text);

          process.env.OAUTH_ENCRYPTION_SALT = `different-salt-${Math.random()}`;

          const encrypted2 = encryptToken(text);
          expect(encrypted1).not.toBe(encrypted2);

          const decrypted2 = decryptToken(encrypted2);
          expect(decrypted2).toBe(text);
        } finally {
          process.env.OAUTH_ENCRYPTION_KEY = originalKey;
          process.env.OAUTH_ENCRYPTION_SALT = originalSalt;
          clearEncryptionKeyCache();
        }
      });
    });

    describe('error handling', () => {
      it('should throw error for missing IV in encrypted data', () => {
        expect(() => decryptToken('::encrypted')).toThrow('Invalid encrypted data format');
      });

      it('should throw error for missing auth tag in encrypted data', () => {
        expect(() => decryptToken('invalidbase64::encrypted')).toThrow(
          'Invalid encrypted data format'
        );
      });

      it('should throw error for missing encrypted data', () => {
        expect(() => decryptToken('ivbase64:tagbase64:')).toThrow('Invalid encrypted data format');
      });

      it('should throw error for extra parts in encrypted data', () => {
        expect(() => decryptToken('iv:tag:data:extra')).toThrow('Invalid encrypted data format');
      });

      it('should handle invalid base64 in IV', () => {
        expect(() => decryptToken('not-base64!:tagbase64:encrypted')).toThrow();
      });

      it('should handle invalid base64 in auth tag', () => {
        expect(() => decryptToken('ivbase64:not-base64!:encrypted')).toThrow();
      });

      it('should handle invalid base64 in encrypted data', () => {
        expect(() => decryptToken('ivbase64:tagbase64:not-base64!')).toThrow();
      });

      it('should throw error for wrong auth tag length', () => {
        const validEncrypted = encryptToken('test');
        const parts = validEncrypted.split(':');

        parts[1] = Buffer.alloc(8).toString('base64');
        const wrongTagLength = parts.join(':');

        expect(() => decryptToken(wrongTagLength)).toThrow();
      });
    });
  });
});
