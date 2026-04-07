/**
 * @jest-environment node
 */

import { cookies } from 'next/headers';
import { createHmac } from 'crypto';
import { clearUserSession, createUserSession, getAuthenticatedUserId } from './session';

jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}));

describe('session auth', () => {
  const mockCookieStore = {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SESSION_SECRET = 'test-session-secret';
    (cookies as jest.Mock).mockResolvedValue(mockCookieStore);
  });

  afterEach(() => {
    delete process.env.SESSION_SECRET;
  });

  it('creates a signed session cookie', async () => {
    await createUserSession('user-123');

    expect(mockCookieStore.set).toHaveBeenCalledWith(
      'rr_session',
      expect.stringMatching(/^.+\..+$/),
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
      })
    );
  });

  it('returns user id for a valid session', async () => {
    await createUserSession('user-123');
    const signedValue = mockCookieStore.set.mock.calls[0]?.[1];
    mockCookieStore.get.mockReturnValue({ value: signedValue });

    await expect(getAuthenticatedUserId()).resolves.toBe('user-123');
  });

  it('clears malformed sessions', async () => {
    mockCookieStore.get.mockReturnValue({ value: 'malformed' });

    await expect(getAuthenticatedUserId()).resolves.toBeNull();
    expect(mockCookieStore.delete).toHaveBeenCalledWith('rr_session');
  });

  it('clears invalid signatures', async () => {
    await createUserSession('user-123');
    const signedValue = mockCookieStore.set.mock.calls[0]?.[1] as string;
    const [payload] = signedValue.split('.');
    mockCookieStore.get.mockReturnValue({ value: `${payload}.invalid` });

    await expect(getAuthenticatedUserId()).resolves.toBeNull();
    expect(mockCookieStore.delete).toHaveBeenCalledWith('rr_session');
  });

  it('clears sessions with malformed signed payload shape', async () => {
    const encodedPayload = Buffer.from(
      JSON.stringify({ userId: 123, iat: 1, exp: Number.MAX_SAFE_INTEGER }),
      'utf8'
    ).toString('base64url');
    const signature = createHmac('sha256', process.env.SESSION_SECRET as string)
      .update(encodedPayload)
      .digest('base64url');
    mockCookieStore.get.mockReturnValue({ value: `${encodedPayload}.${signature}` });

    await expect(getAuthenticatedUserId()).resolves.toBeNull();
    expect(mockCookieStore.delete).toHaveBeenCalledWith('rr_session');
  });

  it('clears sessions with empty string userId', async () => {
    const encodedPayload = Buffer.from(
      JSON.stringify({ userId: '', iat: 1, exp: Number.MAX_SAFE_INTEGER }),
      'utf8'
    ).toString('base64url');
    const signature = createHmac('sha256', process.env.SESSION_SECRET as string)
      .update(encodedPayload)
      .digest('base64url');
    mockCookieStore.get.mockReturnValue({ value: `${encodedPayload}.${signature}` });

    await expect(getAuthenticatedUserId()).resolves.toBeNull();
    expect(mockCookieStore.delete).toHaveBeenCalledWith('rr_session');
  });

  it('clears sessions with missing iat in payload', async () => {
    const encodedPayload = Buffer.from(
      JSON.stringify({ userId: 'user-123', exp: Number.MAX_SAFE_INTEGER }),
      'utf8'
    ).toString('base64url');
    const signature = createHmac('sha256', process.env.SESSION_SECRET as string)
      .update(encodedPayload)
      .digest('base64url');
    mockCookieStore.get.mockReturnValue({ value: `${encodedPayload}.${signature}` });

    await expect(getAuthenticatedUserId()).resolves.toBeNull();
    expect(mockCookieStore.delete).toHaveBeenCalledWith('rr_session');
  });

  it('clears session cookie', async () => {
    await clearUserSession();
    expect(mockCookieStore.delete).toHaveBeenCalledWith('rr_session');
  });
});
