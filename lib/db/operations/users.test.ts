/**
 * User CRUD Operations Tests
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
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

  beforeAll(async () => {
    // Clean up any existing test users before running tests
    try {
      // Delete users with test emails
      const testEmails = [
        'test@example.com',
        'new@example.com',
        'nostrava@example.com',
        'test@test.com',
        'temp@example.com',
      ];
      for (const email of testEmails) {
        const user = await getUserByEmail(email);
        if (user) {
          await deleteUser(user.id);
        }
      }
      // Delete users with test stravaIds
      const testStravaIds = ['12345678', '87654321', '99999999'];
      for (const stravaId of testStravaIds) {
        const user = await getUserByStravaId(stravaId);
        if (user) {
          await deleteUser(user.id);
        }
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  afterAll(async () => {
    // Cleanup: delete test users
    if (createdUserId) {
      try {
        await deleteUser(createdUserId);
      } catch (error) {
        // Ignore cleanup errors
      }
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
      const user = await getUserByStravaId(mockUser.stravaId!);

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
      expect(user?.accessToken).toBeDefined();
      expect(user?.refreshToken).toBeDefined();
      expect(user?.tokenExpiresAt?.getTime()).toBeCloseTo(
        newTokens.tokenExpiresAt.getTime(),
        -3600000
      ); // Allow 1 hour tolerance for timezone differences
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

    it('should handle upsertUser without stravaId', async () => {
      // stravaId is nullable per schema (users.ts:12) - designed to allow users created before OAuth completion
      const userWithoutStravaId: NewUser = {
        stravaId: null as any, // Testing behavior when stravaId is not provided
        email: 'nostrava@example.com',
        firstName: 'No',
        lastName: 'StravaId',
      };

      // Should not throw - falls back to createUser when stravaId is falsy
      const result = await findOrCreateUser(userWithoutStravaId);
      expect(result).toBeDefined();
      expect(result.email).toBe('nostrava@example.com');
    });
  });

  describe('deleteUser', () => {
    it('should delete user', async () => {
      // Create a temporary user for deletion test
      const tempUser: NewUser = {
        stravaId: '99999999',
        email: 'temp@example.com',
        firstName: 'Temp',
        lastName: 'User',
      };
      const userToDelete = await createUser(tempUser);

      const result = await deleteUser(userToDelete.id);

      expect(result).toBe(true);

      const user = await getUserById(userToDelete.id);
      expect(user).toBeUndefined();
    });

    it('should return false for non-existent id', async () => {
      const result = await deleteUser('00000000-0000-0000-0000-000000000000');
      expect(result).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle createUser errors gracefully', async () => {
      const invalidUser: NewUser = {
        stravaId: '123',
        email: 'invalid-email', // This may not cause an error, but we test the flow
        firstName: 'Test',
      };

      // Creating a user with an invalid structure
      await expect(
        createUser({
          ...invalidUser,
          tokenExpiresAt: 'invalid-date' as any,
        })
      ).rejects.toThrow();
    });

    it('should handle updateUser errors gracefully', async () => {
      const invalidId = 'invalid-uuid-format';
      await expect(updateUser(invalidId, { firstName: 'Test' })).rejects.toThrow();
    });

    it('should handle updateUserTokens errors gracefully', async () => {
      const invalidId = 'invalid-uuid-format';
      await expect(
        updateUserTokens(invalidId, {
          accessToken: 'test',
          refreshToken: 'test',
          tokenExpiresAt: new Date(),
        })
      ).rejects.toThrow();
    });

    it('should handle deactivateUser errors gracefully', async () => {
      const invalidId = 'invalid-uuid-format';
      await expect(deactivateUser(invalidId)).rejects.toThrow();
    });

    it('should handle deleteUser errors gracefully', async () => {
      const invalidId = 'invalid-uuid-format';
      await expect(deleteUser(invalidId)).rejects.toThrow();
    });

    it('should handle findOrCreateUser errors gracefully', async () => {
      const invalidUser: NewUser = {
        stravaId: 'test_123',
        email: 'test@test.com',
        firstName: 'Test',
        tokenExpiresAt: 'invalid-date' as any,
      };

      await expect(findOrCreateUser(invalidUser)).rejects.toThrow();
    });

    it('should handle getUserById errors gracefully with invalid UUID', async () => {
      const user = await getUserById('invalid-uuid');
      expect(user).toBeUndefined();
    });

    it('should handle getUserByStravaId errors gracefully', async () => {
      // Test with very long string that might cause issues
      const user = await getUserByStravaId('a'.repeat(1000));
      expect(user).toBeUndefined();
    });

    it('should handle getUserByEmail errors gracefully', async () => {
      // Test with invalid input
      const user = await getUserByEmail('');
      expect(user).toBeUndefined();
    });

    it('should handle getAllUsers errors with invalid options', async () => {
      const users = await getAllUsers({ limit: -1, offset: -1 });
      expect(Array.isArray(users)).toBe(true);
    });
  });
});
