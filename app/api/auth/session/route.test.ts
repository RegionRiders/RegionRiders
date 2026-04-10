/**
 * @jest-environment node
 */

import { getAuthenticatedUserId } from '@/lib/auth/session';
import { GET } from './route';

jest.mock('@/lib/auth/session', () => ({
  getAuthenticatedUserId: jest.fn(),
}));

describe('GET /api/auth/session', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns unauthenticated when no session exists', async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      authenticated: false,
      userId: null,
    });
  });

  it('returns authenticated user context when session exists', async () => {
    (getAuthenticatedUserId as jest.Mock).mockResolvedValue('user-123');

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      authenticated: true,
      userId: 'user-123',
    });
  });

  it('returns 500 when session lookup fails', async () => {
    (getAuthenticatedUserId as jest.Mock).mockRejectedValue(new Error('session read failed'));

    const response = await GET();

    expect(response.status).toBe(500);
  });
});
