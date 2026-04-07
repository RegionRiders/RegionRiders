/**
 * @jest-environment node
 */
import { NextResponse } from 'next/server';
import { handle500Error } from '@/lib/api';
import { generateState, storeState } from '@/lib/oauth/state';
import { getAuthorizationUrl } from '@/lib/strava';
import { GET } from './route';

jest.mock('@/lib/strava');
jest.mock('@/lib/api');
jest.mock('@/lib/oauth/state');

describe('GET /api/strava/auth', () => {
  const mockUrl =
    'https://www.strava.com/oauth/authorize?client_id=123&scope=read%2Cactivity%3Aread_all';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should redirect with hardcoded scope read,activity:read_all', async () => {
    (getAuthorizationUrl as jest.Mock).mockResolvedValue(mockUrl);
    (generateState as jest.Mock).mockReturnValue('mock-state');
    (storeState as jest.Mock).mockResolvedValue(undefined);

    const res = await GET();

    expect(generateState).toHaveBeenCalled();
    expect(storeState).toHaveBeenCalledWith('mock-state');
    expect(getAuthorizationUrl).toHaveBeenCalledWith('read,activity:read_all', 'mock-state');
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe(mockUrl);
  });

  it('should handle errors', async () => {
    const error = new Error('API error');
    const errorResponse = NextResponse.json({ error: 'API error' }, { status: 500 });

    (generateState as jest.Mock).mockReturnValue('mock-state');
    (storeState as jest.Mock).mockResolvedValue(undefined);
    (getAuthorizationUrl as jest.Mock).mockRejectedValue(error);
    (handle500Error as jest.Mock).mockReturnValue(errorResponse);

    const res = await GET();

    expect(handle500Error).toHaveBeenCalledWith(error, 'Strava API: Authorization Request');
    expect(res).toBe(errorResponse);
  });

  it('should return 503 when getAuthorizationUrl returns a falsy value', async () => {
    (generateState as jest.Mock).mockReturnValue('mock-state');
    (storeState as jest.Mock).mockResolvedValue(undefined);
    (getAuthorizationUrl as jest.Mock).mockResolvedValue('');

    const res = await GET();

    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body).toEqual({ error: 'Strava OAuth not configured' });
  });

  it('should return 503 when getAuthorizationUrl returns null', async () => {
    (generateState as jest.Mock).mockReturnValue('mock-state');
    (storeState as jest.Mock).mockResolvedValue(undefined);
    (getAuthorizationUrl as jest.Mock).mockResolvedValue(null);

    const res = await GET();

    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body).toEqual({ error: 'Strava OAuth not configured' });
  });
});