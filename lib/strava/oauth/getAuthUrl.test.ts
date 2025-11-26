/**
 * @jest-environment node
 */
import { getStravaClient } from '../config';
import { getAuthorizationUrl } from './getAuthUrl';

// Mock the config module
jest.mock('../config', () => ({
  getStravaClient: jest.fn(),
}));

describe('getAuthorizationUrl', () => {
  const mockGetRequestAccessURL = jest.fn();
  const mockStravaClient = {
    oauth: {
      getRequestAccessURL: mockGetRequestAccessURL,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getStravaClient as jest.Mock).mockReturnValue(mockStravaClient);
  });

  it('should return authorization URL with default scope', async () => {
    const expectedUrl =
      'https://www.strava.com/oauth/authorize?client_id=123&redirect_uri=http://localhost&response_type=code&scope=read,activity:read_all';
    mockGetRequestAccessURL.mockResolvedValue(expectedUrl);

    const result = await getAuthorizationUrl();

    expect(getStravaClient).toHaveBeenCalledTimes(1);
    expect(mockGetRequestAccessURL).toHaveBeenCalledWith({
      scope: 'read,activity:read_all',
    });
    expect(result).toBe(expectedUrl);
  });

  it('should return authorization URL with custom scope', async () => {
    const customScope = 'read,activity:write';
    const expectedUrl = `https://www.strava.com/oauth/authorize?scope=${customScope}`;
    mockGetRequestAccessURL.mockResolvedValue(expectedUrl);

    const result = await getAuthorizationUrl(customScope);

    expect(mockGetRequestAccessURL).toHaveBeenCalledWith({
      scope: customScope,
    });
    expect(result).toBe(expectedUrl);
  });

  it('should handle errors from Strava client', async () => {
    const errorMessage = 'Strava API error';
    mockGetRequestAccessURL.mockRejectedValue(new Error(errorMessage));

    await expect(getAuthorizationUrl()).rejects.toThrow(errorMessage);
    expect(getStravaClient).toHaveBeenCalledTimes(1);
  });

  it('should pass through various scope combinations', async () => {
    const scopes = [
      'read',
      'read,activity:read',
      'read,activity:read_all,activity:write',
      'profile:read_all,read,activity:read_all',
    ];

    for (const scope of scopes) {
      mockGetRequestAccessURL.mockResolvedValue(`https://strava.com?scope=${scope}`);
      await getAuthorizationUrl(scope);
      expect(mockGetRequestAccessURL).toHaveBeenCalledWith({ scope });
    }
  });
});
