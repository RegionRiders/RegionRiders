/**
 * @jest-environment node
 */

import { createUserSession } from '@/lib/auth/session';
import { findOrCreateUser } from '@/lib/db/operations/users';
import { validateState } from '@/lib/oauth/state';
import { exchangeToken, type StravaTokenResponse } from '@/lib/strava';
import { GET } from './route';

class NextRequest {
  url: string;

  constructor(input: string) {
    this.url = input;
  }

  get nextUrl() {
    return new URL(this.url);
  }
}

jest.mock('@/lib/strava');
jest.mock('@/lib/oauth/state', () => ({
  validateState: jest.fn(),
}));
jest.mock('@/lib/auth/session', () => ({
  createUserSession: jest.fn(),
}));
jest.mock('@/lib/db/operations/users');

describe('GET /api/strava/callback', () => {
  const mockToken: StravaTokenResponse = {
    access_token: 'token123',
    refresh_token: 'refresh456',
    expires_at: 1234567890,
    athlete: { id: 12345 },
  };

  const originalEnv = process.env.NEXT_PUBLIC_API_BASE_URL;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXT_PUBLIC_API_BASE_URL = 'http://localhost:3000';
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.NEXT_PUBLIC_API_BASE_URL;
    } else {
      process.env.NEXT_PUBLIC_API_BASE_URL = originalEnv;
    }
  });

  it('should exchange code for tokens', async () => {
    (validateState as jest.Mock).mockResolvedValue({ valid: true });
    (exchangeToken as jest.Mock).mockResolvedValue(mockToken);
    (findOrCreateUser as jest.Mock).mockResolvedValue({ id: 12345 });

    const req = new NextRequest(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/strava/callback?code=abc123&state=mock-state`
    );
    const res = await GET(req as any);

    expect(validateState).toHaveBeenCalledWith('mock-state');
    expect(exchangeToken).toHaveBeenCalledWith('abc123');
    expect(findOrCreateUser).toHaveBeenCalledWith({
      stravaId: '12345',
      email: undefined,
      firstName: undefined,
      lastName: undefined,
      profilePicture: undefined,
      accessToken: 'token123',
      refreshToken: 'refresh456',
      tokenExpiresAt: new Date(1234567890 * 1000),
      isActive: true,
    });
    expect(createUserSession).toHaveBeenCalledWith(12345);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data).toEqual({
      success: true,
      message: 'Successfully authorized with Strava',
      athlete_id: 12345,
      user_id: 12345,
    });
  });

  it('should return 400 on invalid state', async () => {
    (validateState as jest.Mock).mockResolvedValue({ valid: false, reason: 'State expired' });

    const req = new NextRequest(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/strava/callback?code=abc123&state=expired-state`
    );
    const res = await GET(req as any);

    expect(validateState).toHaveBeenCalledWith('expired-state');
    expect(exchangeToken).not.toHaveBeenCalled();
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.statusCode).toBe(400);
    expect(data.message).toBe('Invalid or expired state parameter');
    expect(data.error).toBe('Error');
    expect(data.timestamp).toBeDefined();
    expect(data.context).toBe('Strava API: CSRF Validation Failed');
  });

  it('should return 400 when no code', async () => {
    const req = new NextRequest(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/strava/callback`);
    const res = await GET(req as any);

    expect(exchangeToken).not.toHaveBeenCalled();
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.statusCode).toBe(400);
    expect(data.message).toBe('No authorization code received');
    expect(data.error).toBe('Error');
    expect(data.timestamp).toBeDefined();
    expect(data.context).toBe('Strava API: Authorization Callback');
  });

  it('should return 400 on error param', async () => {
    const req = new NextRequest(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/strava/callback?error=access_denied`
    );
    const res = await GET(req as any);

    expect(exchangeToken).not.toHaveBeenCalled();
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.statusCode).toBe(400);
    expect(data.message).toBe('Authorization denied: access_denied');
    expect(data.error).toBe('Error');
    expect(data.timestamp).toBeDefined();
    expect(data.context).toBe('Strava API: Authorization Callback');
  });

  it('should return 400 on invalid state', async () => {
    (validateState as jest.Mock).mockResolvedValue({ valid: false, reason: 'State mismatch' });
    const req = new NextRequest(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/strava/callback?code=abc123&state=invalid-state`
    );
    const res = await GET(req as any);

    expect(exchangeToken).not.toHaveBeenCalled();
    expect(validateState).toHaveBeenCalledWith('invalid-state');
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.statusCode).toBe(400);
    expect(data.message).toBe('Invalid or expired state parameter');
    expect(data.error).toBe('Error');
    expect(data.timestamp).toBeDefined();
    expect(data.context).toBe('Strava API: CSRF Validation Failed');
  });
});
