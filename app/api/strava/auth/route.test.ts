import * as errorHandler from '@/lib/api';
import * as strava from '@/lib/strava';
import { GET } from './route';

jest.mock('@/lib/strava');
jest.mock('@/lib/api');

describe('GET /api/strava/auth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should redirect to Strava authorization URL', async () => {
    const mockAuthUrl =
      'https://www.strava.com/oauth/authorize?client_id=test&redirect_uri=test&response_type=code&scope=read,activity:read_all';

    (strava.getAuthorizationUrl as jest.Mock).mockResolvedValue(mockAuthUrl);

    const response = await GET();

    expect(response.status).toBe(307);
    expect(response.headers.get('Location')).toBe(mockAuthUrl);
    expect(strava.getAuthorizationUrl).toHaveBeenCalledWith('read,activity:read_all');
  });

  it('should handle errors and return 500', async () => {
    const mockError = new Error('Authorization failed');
    (strava.getAuthorizationUrl as jest.Mock).mockRejectedValue(mockError);

    // Mock the error handler to return a Response object
    const mockErrorResponse = new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
        statusCode: 500,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );

    (errorHandler.handle500Error as jest.Mock).mockReturnValue(mockErrorResponse);

    const response = await GET();

    expect(response.status).toBe(500);
    expect(errorHandler.handle500Error).toHaveBeenCalledWith(
      mockError,
      'Strava API: Authorization Request'
    );
  });
});
