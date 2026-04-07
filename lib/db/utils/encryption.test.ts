/**
 * @jest-environment node
 */

import { encryptTokenField } from './encryption';

jest.mock('@/lib/crypto', () => ({
  encryptToken: jest.fn((token: string) => `encrypted:${token}`),
}));

import { encryptToken } from '@/lib/crypto';

describe('encryptTokenField', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns encrypted token when a non-empty string is provided', () => {
    const result = encryptTokenField('my-secret-token');

    expect(encryptToken).toHaveBeenCalledWith('my-secret-token');
    expect(result).toBe('encrypted:my-secret-token');
  });

  it('returns null when null is provided', () => {
    const result = encryptTokenField(null);

    expect(encryptToken).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it('returns undefined when undefined is provided', () => {
    const result = encryptTokenField(undefined);

    expect(encryptToken).not.toHaveBeenCalled();
    expect(result).toBeUndefined();
  });

  it('returns empty string when empty string is provided', () => {
    const result = encryptTokenField('');

    expect(encryptToken).not.toHaveBeenCalled();
    expect(result).toBe('');
  });
});
