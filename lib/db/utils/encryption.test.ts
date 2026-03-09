/**
 * @jest-environment node
 */

/**
 * Tests for database encryption utilities
 */

import { encryptToken } from '@/lib/crypto';
import { encryptTokenField } from './encryption';

// Mock the crypto module
jest.mock('@/lib/crypto', () => ({
  encryptToken: jest.fn((token: string) => `encrypted_${token}`),
}));

const mockEncryptToken = encryptToken as jest.MockedFunction<typeof encryptToken>;

describe('encryptTokenField', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('encrypts a valid string token', () => {
    const result = encryptTokenField('my-access-token');

    expect(mockEncryptToken).toHaveBeenCalledWith('my-access-token');
    expect(result).toBe('encrypted_my-access-token');
  });

  it('returns null for null input', () => {
    const result = encryptTokenField(null);

    expect(mockEncryptToken).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it('returns undefined for undefined input', () => {
    const result = encryptTokenField(undefined);

    expect(mockEncryptToken).not.toHaveBeenCalled();
    expect(result).toBeUndefined();
  });

  it('returns empty string for empty string input', () => {
    // Empty string is falsy, so it should return the original value
    const result = encryptTokenField('');

    expect(mockEncryptToken).not.toHaveBeenCalled();
    expect(result).toBe('');
  });

  it('encrypts a long token', () => {
    const longToken = 'a'.repeat(1000);
    const result = encryptTokenField(longToken);

    expect(mockEncryptToken).toHaveBeenCalledWith(longToken);
    expect(result).toBe(`encrypted_${longToken}`);
  });

  it('encrypts tokens with special characters', () => {
    const specialToken = 'token_with_!@#$%^&*()_characters';
    const result = encryptTokenField(specialToken);

    expect(mockEncryptToken).toHaveBeenCalledWith(specialToken);
    expect(result).toBe(`encrypted_${specialToken}`);
  });
});
