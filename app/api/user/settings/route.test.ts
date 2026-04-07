/**
 * @jest-environment node
 */

import type { NextRequest as NextRequestType } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth/session';
import { getUserSettingsByUserId, upsertUserSettings } from '@/lib/db/operations/users';
import { GET, PUT } from './route';

class NextRequest {
  url: string;
  private readonly payload: unknown;
  private readonly shouldThrowJson: boolean;

  constructor(input: string, payload?: unknown, options?: { shouldThrowJson?: boolean }) {
    this.url = input;
    this.payload = payload;
    this.shouldThrowJson = options?.shouldThrowJson ?? false;
  }

  get nextUrl() {
    return new URL(this.url);
  }

  async json() {
    if (this.shouldThrowJson) {
      throw new SyntaxError('Unexpected end of JSON input');
    }
    return this.payload;
  }
}

jest.mock('@/lib/auth/session');
jest.mock('@/lib/db/operations/users');

describe('/api/user/settings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('returns 401 when unauthenticated', async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue(null);

      const response = await GET();
      expect(response.status).toBe(401);
    });

    it('returns persisted settings for authenticated user', async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue('user-123');
      (getUserSettingsByUserId as jest.Mock).mockResolvedValue({
        settings: { showActivities: false },
      });

      const response = await GET();
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toEqual({
        success: true,
        userId: 'user-123',
        settings: { showActivities: false },
      });
    });

    it('returns null settings when no settings row exists', async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue('user-123');
      (getUserSettingsByUserId as jest.Mock).mockResolvedValue(null);

      const response = await GET();
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toEqual({
        success: true,
        userId: 'user-123',
        settings: null,
      });
    });

    it('returns 500 when settings read fails', async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue('user-123');
      (getUserSettingsByUserId as jest.Mock).mockRejectedValue(new Error('db read failed'));

      const response = await GET();
      expect(response.status).toBe(500);
    });
  });

  describe('PUT', () => {
    it('returns 401 when unauthenticated', async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue(null);
      const request = new NextRequest('http://localhost:3000/api/user/settings', {
        settings: { showActivities: false },
      });

      const response = await PUT(request as unknown as NextRequestType);
      expect(response.status).toBe(401);
    });

    it('returns 400 for invalid payload', async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue('user-123');
      const request = new NextRequest('http://localhost:3000/api/user/settings', {
        settings: { activityThickness: -10 },
      });

      const response = await PUT(request as unknown as NextRequestType);
      expect(response.status).toBe(400);
      expect(upsertUserSettings).not.toHaveBeenCalled();
    });

    it('returns 400 for malformed JSON payload', async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue('user-123');
      const request = new NextRequest('http://localhost:3000/api/user/settings', undefined, {
        shouldThrowJson: true,
      });

      const response = await PUT(request as unknown as NextRequestType);
      expect(response.status).toBe(400);
      expect(upsertUserSettings).not.toHaveBeenCalled();
    });

    it('upserts settings for authenticated users', async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue('user-123');
      (upsertUserSettings as jest.Mock).mockResolvedValue({
        settings: { showActivities: false },
      });
      const request = new NextRequest('http://localhost:3000/api/user/settings', {
        settings: { showActivities: false },
      });

      const response = await PUT(request as unknown as NextRequestType);
      expect(response.status).toBe(200);
      expect(upsertUserSettings).toHaveBeenCalledWith('user-123', {
        settings: { showActivities: false },
      });

      const data = await response.json();
      expect(data).toEqual({
        success: true,
        userId: 'user-123',
        settings: { showActivities: false },
      });
    });

    it('returns 500 when settings persistence result is empty', async () => {
      (getAuthenticatedUserId as jest.Mock).mockResolvedValue('user-123');
      (upsertUserSettings as jest.Mock).mockResolvedValue({
        settings: null,
      });
      const request = new NextRequest('http://localhost:3000/api/user/settings', {
        settings: { showActivities: false },
      });

      const response = await PUT(request as unknown as NextRequestType);
      expect(response.status).toBe(500);
    });
  });
});
