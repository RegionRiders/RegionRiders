;
/**
 * @jest-environment <rootDir>/jest-environment-node-with-polyfills.cjs
 */

import { NextResponse } from 'next/server';
import { handle500Error } from '@/lib/api';
import { getAuthorizationUrl } from '@/lib/strava';
import { GET } from './route';


jest.mock('@/lib/strava');
jest.mock('@/lib/api');

describe('GET /api/strava/auth', () => {
  const mockUrl = 'https://strava.com/oauth/authorize?client_id=123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should redirect with hardcoded scope read,activity:read_all', async () => {
    (getAuthorizationUrl as jest.Mock).mockResolvedValue(mockUrl);

    const res = await GET();

    expect(getAuthorizationUrl).toHaveBeenCalledWith('read,activity:read_all');
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe(mockUrl);
  });

  it('should handle errors', async () => {
    const error = new Error('API error');
    const errorResponse = NextResponse.json({ error: 'API error' }, { status: 500 });

    (getAuthorizationUrl as jest.Mock).mockRejectedValue(error);
    (handle500Error as jest.Mock).mockReturnValue(errorResponse);

    const res = await GET();

    expect(handle500Error).toHaveBeenCalledWith(error, 'Strava API: Authorization Request');
    expect(res).toBe(errorResponse);
  });
});
