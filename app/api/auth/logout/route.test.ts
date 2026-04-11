/**
 * @jest-environment node
 */

import { clearUserSession } from '@/lib/auth/session';
import { POST } from './route';

jest.mock('@/lib/auth/session', () => ({
  clearUserSession: jest.fn(),
}));

describe('POST /api/auth/logout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('clears user session and returns success', async () => {
    const response = await POST();

    expect(clearUserSession).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      message: 'Logged out successfully',
    });
  });

  it('returns 500 if session clearing fails', async () => {
    (clearUserSession as jest.Mock).mockRejectedValue(new Error('failed'));

    const response = await POST();
    expect(response.status).toBe(500);
  });
});
