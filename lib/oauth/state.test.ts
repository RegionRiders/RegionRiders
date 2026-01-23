/**
 * @jest-environment node
 */

import { cookies } from 'next/headers';
import { clearState, generateState, storeState, validateState } from './state';

// Mock next/headers cookies
jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}));

// Define StateMetadata interface locally (not exported from state.ts)
interface StateMetadata {
  state: string;
  createdAt: number;
  expiresAt: number;
  used: boolean;
}

describe('OAuth State Management', () => {
  const mockCookieStore = {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (cookies as jest.Mock).mockResolvedValue(mockCookieStore);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('generateState', () => {
    it('should generate a 64-character hex string', () => {
      const state = generateState();
      expect(state).toBeDefined();
      expect(typeof state).toBe('string');
      expect(state.length).toBe(64);
      expect(/^[a-f0-9]{64}$/.test(state)).toBe(true);
    });

    it('should generate unique states', () => {
      const state1 = generateState();
      const state2 = generateState();
      expect(state1).not.toBe(state2);
    });
  });

  describe('storeState', () => {
    it('should store state in cookie with metadata', async () => {
      const state = generateState();
      await storeState(state);

      expect(mockCookieStore.set).toHaveBeenCalledWith(
        'oauth_state',
        expect.stringContaining(state),
        {
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          maxAge: 600,
          path: '/',
        }
      );
    });

    it('should throw error for empty state', async () => {
      await expect(storeState('')).rejects.toThrow('Invalid state parameter');
    });

    it('should throw error for state exceeding max length', async () => {
      const longState = 'a'.repeat(129);
      await expect(storeState(longState)).rejects.toThrow('State parameter too long');
    });
  });

  describe('validateState', () => {
    it('should validate valid state successfully', async () => {
      const state = generateState();
      const metadata: StateMetadata = {
        state,
        createdAt: Date.now(),
        expiresAt: Date.now() + 600000,
        used: false,
      };
      mockCookieStore.get.mockReturnValue({ value: JSON.stringify(metadata) });

      const result = await validateState(state);

      expect(result.valid).toBe(true);
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.state).toBe(state);
      expect(mockCookieStore.delete).toHaveBeenCalledWith('oauth_state');
    });

    it('should reject missing state parameter', async () => {
      const result = await validateState(null);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Missing or invalid state parameter');
      expect(mockCookieStore.delete).not.toHaveBeenCalled();
    });

    it('should reject state exceeding max length', async () => {
      const longState = 'a'.repeat(129);
      const result = await validateState(longState);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('State parameter too long');
    });

    it('should reject when no stored state found', async () => {
      mockCookieStore.get.mockReturnValue(undefined);

      const result = await validateState(generateState());

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('No stored state found');
    });

    it('should reject corrupted state data', async () => {
      mockCookieStore.get.mockReturnValue({ value: 'invalid-json' });

      const result = await validateState(generateState());

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Corrupted state data');
      expect(mockCookieStore.delete).toHaveBeenCalledWith('oauth_state');
    });

    it('should reject invalid metadata structure', async () => {
      mockCookieStore.get.mockReturnValue({ value: JSON.stringify({}) });

      const result = await validateState(generateState());

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Invalid state metadata');
      expect(mockCookieStore.delete).toHaveBeenCalledWith('oauth_state');
    });

    it('should reject expired state', async () => {
      const state = generateState();
      const metadata: StateMetadata = {
        state,
        createdAt: Date.now() - 700000,
        expiresAt: Date.now() - 100000,
        used: false,
      };
      mockCookieStore.get.mockReturnValue({ value: JSON.stringify(metadata) });

      const result = await validateState(state);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('State expired');
      expect(mockCookieStore.delete).toHaveBeenCalledWith('oauth_state');
    });

    it('should reject already used state (replay attack)', async () => {
      const state = generateState();
      const metadata: StateMetadata = {
        state,
        createdAt: Date.now() - 100000,
        expiresAt: Date.now() + 500000,
        used: true,
      };
      mockCookieStore.get.mockReturnValue({ value: JSON.stringify(metadata) });

      const result = await validateState(state);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('State already used');
      expect(mockCookieStore.delete).toHaveBeenCalledWith('oauth_state');
    });

    it('should reject state mismatch', async () => {
      const state1 = generateState();
      const state2 = generateState();
      const metadata: StateMetadata = {
        state: state1,
        createdAt: Date.now() - 100000,
        expiresAt: Date.now() + 500000,
        used: false,
      };
      mockCookieStore.get.mockReturnValue({ value: JSON.stringify(metadata) });

      const result = await validateState(state2);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('State mismatch');
    });

    it('should handle validation errors gracefully', async () => {
      mockCookieStore.get.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const result = await validateState(generateState());

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Validation error');
      expect(mockCookieStore.delete).toHaveBeenCalledWith('oauth_state');
    });
  });

  describe('clearState', () => {
    it('should delete oauth_state cookie', async () => {
      await clearState();

      expect(mockCookieStore.delete).toHaveBeenCalledWith('oauth_state');
    });
  });
});
