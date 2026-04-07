/**
 * @jest-environment node
 */

import { cookies } from 'next/headers';
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

  it('clears session cookie', async () => {
    await clearUserSession();
    expect(mockCookieStore.delete).toHaveBeenCalledWith('rr_session');
  });
});
