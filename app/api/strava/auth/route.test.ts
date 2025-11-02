;
/**
 * @jest-environment node
 */

import { NextRequest, NextResponse } from 'next/server';
import { handle500Error } from '@/lib/api';
import { getAuthorizationUrl } from '@/lib/strava';
import { GET } from './route';


jest.mock('@/lib/strava');

describe('GET /api/strava/auth', () => {
  const mockUrl = 'https://strava.com/oauth/authorize?client_id=123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should redirect with default scope', async () => {
    (getAuthorizationUrl as jest.Mock).mockResolvedValue(mockUrl);

    const req = new NextRequest('http://localhost/api/strava/auth');
    const res = await GET(req);

    expect(getAuthorizationUrl).toHaveBeenCalledWith('read,activity:read_all');
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe(mockUrl);
  });

  it('should redirect with custom scope', async () => {
    (getAuthorizationUrl as jest.Mock).mockResolvedValue(mockUrl);

    const req = new NextRequest('http://localhost/api/strava/auth?scope=read,activity:write');
    await GET(req);
    expect(getAuthorizationUrl).toHaveBeenCalledWith('read,activity:write');
  });

  it('should handle errors', async () => {
    const error = new Error('API error');
    const errorResponse = NextResponse.json({ error: 'API error' }, { status: 500 });

    (getAuthorizationUrl as jest.Mock).mockRejectedValue(error);
    (function(error: unknown, context: string): NextResponse {
      return handle500Error(error, `Strava API: ${context}`);
    } as jest.Mock).mockReturnValue(errorResponse);

    const req = new NextRequest('http://localhost/api/strava/auth');
    await GET(req);

    expect((error: unknown, context: string): NextResponse => {
      return handle500Error(error, `Strava API: ${context}`);
    }).toHaveBeenCalledWith(error, 'Authorization Request');
  });
});
