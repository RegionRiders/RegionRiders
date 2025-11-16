/**
 * User CRUD Operations Tests
 */

import { afterAll, beforeEach, describe, expect, it } from '@jest/globals';
import { closePool, type NewUser } from '@/lib/db';
import {
  createUser,
  deactivateUser,
  deleteUser,
  findOrCreateUser,
  getAllUsers,
  getUserByEmail,
  getUserById,
  getUserByStravaId,
  updateUser,
  updateUserTokens,
} from './users';

// Mock data
const mockUser: NewUser = {
  stravaId: '12345678',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  profilePicture: 'https://example.com/profile.jpg',
  accessToken: 'test_access_token',
  refreshToken: 'test_refresh_token',
  tokenExpiresAt: new Date(Date.now() + 3600000),
};

describe('User Operations', () => {
  let createdUserId: string;

  afterAll(async () => {
    // Cleanup: delete test users
    if (createdUserId) {
      await deleteUser(createdUserId);
    }
    await closePool();
  });

  describe('createUser', () => {
    it('should create a new user', async () => {
      const user = await createUser(mockUser);

      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
      expect(user.stravaId).toBe(mockUser.stravaId);
      expect(user.email).toBe(mockUser.email);
      expect(user.firstName).toBe(mockUser.firstName);
      expect(user.lastName).toBe(mockUser.lastName);
      expect(user.isActive).toBe(true);
      expect(user.createdAt).toBeDefined();
      expect(user.updatedAt).toBeDefined();

      createdUserId = user.id;
    });

    it('should fail to create user with duplicate stravaId', async () => {
      await expect(createUser(mockUser)).rejects.toThrow();
    });
  });

  describe('getUserById', () => {
    it('should get user by id', async () => {
      const user = await getUserById(createdUserId);

      expect(user).toBeDefined();
      expect(user?.id).toBe(createdUserId);
      expect(user?.stravaId).toBe(mockUser.stravaId);
    });

    it('should return undefined for non-existent id', async () => {
      const user = await getUserById('00000000-0000-0000-0000-000000000000');
      expect(user).toBeUndefined();
    });
  });

  describe('getUserByStravaId', () => {
    it('should get user by strava id', async () => {
      const user = await getUserByStravaId(mockUser.stravaId);

      expect(user).toBeDefined();
      expect(user?.stravaId).toBe(mockUser.stravaId);
      expect(user?.email).toBe(mockUser.email);
    });

    it('should return undefined for non-existent strava id', async () => {
      const user = await getUserByStravaId('99999999');
      expect(user).toBeUndefined();
    });
  });

  describe('getUserByEmail', () => {
    it('should get user by email', async () => {
      const user = await getUserByEmail(mockUser.email!);

      expect(user).toBeDefined();
      expect(user?.email).toBe(mockUser.email);
      expect(user?.stravaId).toBe(mockUser.stravaId);
    });

    it('should return undefined for non-existent email', async () => {
      const user = await getUserByEmail('nonexistent@example.com');
      expect(user).toBeUndefined();
    });
  });

  describe('getAllUsers', () => {
    it('should get all users with default pagination', async () => {
      const users = await getAllUsers();

      expect(Array.isArray(users)).toBe(true);
      expect(users.length).toBeGreaterThan(0);
    });

    it('should get users with custom limit', async () => {
      const users = await getAllUsers({ limit: 1 });

      expect(users.length).toBeLessThanOrEqual(1);
    });

    it('should get only active users', async () => {
      const users = await getAllUsers({ activeOnly: true });

      expect(Array.isArray(users)).toBe(true);
      users.forEach((user) => {
        expect(user.isActive).toBe(true);
      });
    });
  });

  describe('updateUser', () => {
    it('should update user fields', async () => {
      const updatedData = {
        firstName: 'Updated',
        lastName: 'Name',
        metadata: { testKey: 'testValue' },
      };

      const user = await updateUser(createdUserId, updatedData);

      expect(user).toBeDefined();
      expect(user?.firstName).toBe(updatedData.firstName);
      expect(user?.lastName).toBe(updatedData.lastName);
      expect(user?.metadata).toEqual(updatedData.metadata);
    });

    it('should return undefined for non-existent id', async () => {
      const user = await updateUser('00000000-0000-0000-0000-000000000000', {
        firstName: 'Test',
      });
      expect(user).toBeUndefined();
    });
  });

  describe('updateUserTokens', () => {
    it('should update user tokens', async () => {
      const newTokens = {
        accessToken: 'new_access_token',
        refreshToken: 'new_refresh_token',
        tokenExpiresAt: new Date(Date.now() + 7200000),
      };

      const user = await updateUserTokens(createdUserId, newTokens);

      expect(user).toBeDefined();
      expect(user?.accessToken).toBe(newTokens.accessToken);
      expect(user?.refreshToken).toBe(newTokens.refreshToken);
      expect(user?.tokenExpiresAt?.getTime()).toBeCloseTo(newTokens.tokenExpiresAt.getTime(), -2);
    });
  });

  describe('deactivateUser', () => {
    it('should deactivate user', async () => {
      const user = await deactivateUser(createdUserId);

      expect(user).toBeDefined();
      expect(user?.isActive).toBe(false);
    });
  });

  describe('findOrCreateUser', () => {
    beforeEach(async () => {
      // Reactivate user for this test
      await updateUser(createdUserId, { isActive: true });
    });

    it('should find existing user', async () => {
      const user = await findOrCreateUser(mockUser);

      expect(user).toBeDefined();
      expect(user.stravaId).toBe(mockUser.stravaId);
      expect(user.id).toBe(createdUserId);
    });

    it('should create new user if not found', async () => {
      const newMockUser: NewUser = {
        stravaId: '87654321',
        email: 'new@example.com',
        firstName: 'New',
        lastName: 'User',
      };

      const user = await findOrCreateUser(newMockUser);

      expect(user).toBeDefined();
      expect(user.stravaId).toBe(newMockUser.stravaId);
      expect(user.email).toBe(newMockUser.email);

      // Cleanup
      await deleteUser(user.id);
    });
  });

  describe('deleteUser', () => {
    it('should delete user', async () => {
      const result = await deleteUser(createdUserId);

      expect(result).toBe(true);

      const user = await getUserById(createdUserId);
      expect(user).toBeUndefined();
    });

    it('should return false for non-existent id', async () => {
      const result = await deleteUser('00000000-0000-0000-0000-000000000000');
      expect(result).toBe(false);
    });
  });
});
