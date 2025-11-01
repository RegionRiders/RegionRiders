/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import exchangeToken, { type StravaTokenResponse } from '@/lib/strava';

jest.mock('@/lib/strava');

import { GET } from './route';

describe('GET /api/strava/callback', () => {
  const mockToken: StravaTokenResponse = {
    access_token: 'token123',
    refresh_token: 'refresh456',
    expires_at: 1234567890,
    athlete: { id: 12345 },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should exchange code for tokens', async () => {
    (exchangeToken as jest.Mock).mockResolvedValue(mockToken);

    const req = new NextRequest('http://localhost/api/strava/callback?code=abc123');
    const res = await GET(req);

    expect(exchangeToken).toHaveBeenCalledWith('abc123');
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data).toEqual({
      success: true,
      message: 'Successfully authorized with Strava.',
      athlete_id: 12345,
    });
  });

  it('should return 400 when no code', async () => {
    const req = new NextRequest('http://localhost/api/strava/callback');
    const res = await GET(req);

    expect(exchangeToken).not.toHaveBeenCalled();
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toBe('No authorization code received');
  });

  it('should return 400 on error param', async () => {
    const req = new NextRequest('http://localhost/api/strava/callback?error=access_denied');
    const res = await GET(req);

    expect(exchangeToken).not.toHaveBeenCalled();
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toBe('Authorization denied');
    expect(data.details).toBe('access_denied');
  });
});

