/**
 * @jest-environment node
 */
import { exchangeToken, StravaTokenResponse } from '@/lib/strava';
import { getStravaClient } from '../config';

// Mock the config module
jest.mock('../config', () => ({
  getStravaClient: jest.fn(),
}));

describe('exchangeToken', () => {
  const mockGetToken = jest.fn();
  const mockStravaClient = {
    oauth: {
      getToken: mockGetToken,
    },
  };

  const mockTokenResponse: StravaTokenResponse = {
    access_token: 'mock_access_token_123',
    refresh_token: 'mock_refresh_token_456',
    expires_at: 1234567890,
    athlete: {
      id: 12345,
      username: 'test_athlete',
      firstname: 'Test',
      lastname: 'User',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getStravaClient as jest.Mock).mockReturnValue(mockStravaClient);
  });

  it('should exchange authorization code for tokens', async () => {
    const authCode = 'test_auth_code_123';
    mockGetToken.mockResolvedValue(mockTokenResponse);

    const result = await exchangeToken(authCode);

    expect(getStravaClient).toHaveBeenCalledTimes(1);
    expect(mockGetToken).toHaveBeenCalledWith(authCode);
    expect(result).toEqual(mockTokenResponse);
  });

  it('should return valid token response structure', async () => {
    const authCode = 'valid_code';
    mockGetToken.mockResolvedValue(mockTokenResponse);

    const result = await exchangeToken(authCode);

    expect(result).toHaveProperty('access_token');
    expect(result).toHaveProperty('refresh_token');
    expect(result).toHaveProperty('expires_at');
    expect(result).toHaveProperty('athlete');
    expect(result.athlete).toHaveProperty('id');
  });

  it('should handle invalid authorization code error', async () => {
    const invalidCode = 'invalid_code';
    const errorMessage = 'Bad Request: authorization code is invalid';
    mockGetToken.mockRejectedValue(new Error(errorMessage));

    await expect(exchangeToken(invalidCode)).rejects.toThrow(errorMessage);
    expect(mockGetToken).toHaveBeenCalledWith(invalidCode);
  });

  it('should handle expired authorization code error', async () => {
    const expiredCode = 'expired_code';
    const errorMessage = 'authorization code expired';
    mockGetToken.mockRejectedValue(new Error(errorMessage));

    await expect(exchangeToken(expiredCode)).rejects.toThrow(errorMessage);
  });

  it('should handle network errors', async () => {
    const authCode = 'test_code';
    const networkError = new Error('Network request failed');
    mockGetToken.mockRejectedValue(networkError);

    await expect(exchangeToken(authCode)).rejects.toThrow('Network request failed');
  });

  it('should pass through athlete data correctly', async () => {
    const authCode = 'test_code';
    const detailedAthleteResponse = {
      ...mockTokenResponse,
      athlete: {
        id: 99999,
        username: 'pro_cyclist',
        firstname: 'Pro',
        lastname: 'Cyclist',
        city: 'Boulder',
        state: 'Colorado',
        country: 'United States',
        sex: 'M',
        premium: true,
        created_at: '2020-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    };
    mockGetToken.mockResolvedValue(detailedAthleteResponse);

    const result = await exchangeToken(authCode);

    expect(result.athlete.id).toBe(99999);
    expect(result.athlete.username).toBe('pro_cyclist');
    expect(result.athlete.premium).toBe(true);
  });

  it('should handle different token expiration times', async () => {
    const authCode = 'test_code';
    const futureExpiry = Math.floor(Date.now() / 1000) + 21600; // 6 hours from now

    mockGetToken.mockResolvedValue({
      ...mockTokenResponse,
      expires_at: futureExpiry,
    });

    const result = await exchangeToken(authCode);

    expect(result.expires_at).toBe(futureExpiry);
    expect(result.expires_at).toBeGreaterThan(Date.now() / 1000);
  });
});