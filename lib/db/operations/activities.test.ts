/**
 * Activity CRUD Operations Tests
 */

import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import {
  bulkCreateActivities,
  closePool,
  createActivity,
  deleteActivitiesByUserId,
  deleteActivity,
  findOrCreateActivity,
  getActivitiesByUserId,
  getActivityById,
  getActivityByStravaId,
  getActivityStats,
  getAllActivities,
  NewActivity,
  NewUser,
  updateActivity,
} from '@/lib/db';
import { createUser, deleteUser } from './users';

// Mock data
const mockUser: NewUser = {
  stravaId: 'test_strava_123',
  email: 'activity-test@example.com',
  firstName: 'Activity',
  lastName: 'Tester',
};

const mockActivity: NewActivity = {
  userId: '', // Will be set after user creation
  stravaActivityId: 'strava_act_123',
  name: 'Morning Ride',
  description: 'A nice morning ride',
  type: 'Ride',
  sportType: 'MountainBikeRide',
  distance: 25000, // 25km in meters
  movingTime: 3600, // 1 hour in seconds
  elapsedTime: 4000,
  totalElevationGain: 450,
  averageSpeed: 6.94, // m/s
  maxSpeed: 15.5,
  startDate: new Date('2024-01-01T08:00:00Z'),
  startLatlng: [45.5017, -73.5673],
  locationCity: 'Montreal',
  locationCountry: 'Canada',
  isManual: false,
  isPrivate: false,
};

describe('Activity Operations', () => {
  let testUserId: string;
  let createdActivityId: string;

  beforeAll(async () => {
    // Create test user
    const user = await createUser(mockUser);
    testUserId = user.id;
    mockActivity.userId = testUserId;
  });

  afterAll(async () => {
    // Cleanup
    if (testUserId) {
      await deleteActivitiesByUserId(testUserId);
      await deleteUser(testUserId);
    }
    await closePool();
  });

  describe('createActivity', () => {
    it('should create a new activity', async () => {
      const activity = await createActivity(mockActivity);

      expect(activity).toBeDefined();
      expect(activity.id).toBeDefined();
      expect(activity.userId).toBe(testUserId);
      expect(activity.stravaActivityId).toBe(mockActivity.stravaActivityId);
      expect(activity.name).toBe(mockActivity.name);
      expect(activity.type).toBe(mockActivity.type);
      expect(activity.distance).toBe(mockActivity.distance);
      expect(activity.movingTime).toBe(mockActivity.movingTime);
      expect(activity.createdAt).toBeDefined();
      expect(activity.updatedAt).toBeDefined();

      createdActivityId = activity.id;
    });

    it('should fail to create activity with duplicate stravaActivityId', async () => {
      await expect(createActivity(mockActivity)).rejects.toThrow();
    });
  });

  describe('getActivityById', () => {
    it('should get activity by id', async () => {
      const activity = await getActivityById(createdActivityId);

      expect(activity).toBeDefined();
      expect(activity?.id).toBe(createdActivityId);
      expect(activity?.name).toBe(mockActivity.name);
    });

    it('should return undefined for non-existent id', async () => {
      const activity = await getActivityById('00000000-0000-0000-0000-000000000000');
      expect(activity).toBeUndefined();
    });
  });

  describe('getActivityByStravaId', () => {
    it('should get activity by strava id', async () => {
      const activity = await getActivityByStravaId(mockActivity.stravaActivityId!);

      expect(activity).toBeDefined();
      expect(activity?.stravaActivityId).toBe(mockActivity.stravaActivityId);
      expect(activity?.name).toBe(mockActivity.name);
    });

    it('should return undefined for non-existent strava id', async () => {
      const activity = await getActivityByStravaId('nonexistent_123');
      expect(activity).toBeUndefined();
    });
  });

  describe('getActivitiesByUserId', () => {
    it('should get all activities for a user', async () => {
      const activities = await getActivitiesByUserId(testUserId);

      expect(Array.isArray(activities)).toBe(true);
      expect(activities.length).toBeGreaterThan(0);
      activities.forEach((activity) => {
        expect(activity.userId).toBe(testUserId);
      });
    });

    it('should filter activities by type', async () => {
      const activities = await getActivitiesByUserId(testUserId, {
        type: 'Ride',
      });

      expect(Array.isArray(activities)).toBe(true);
      activities.forEach((activity) => {
        expect(activity.type).toBe('Ride');
      });
    });

    it('should filter activities by date range', async () => {
      const startDate = new Date('2023-12-01');
      const endDate = new Date('2024-02-01');

      const activities = await getActivitiesByUserId(testUserId, {
        startDate,
        endDate,
      });

      expect(Array.isArray(activities)).toBe(true);
      activities.forEach((activity) => {
        expect(activity.startDate >= startDate).toBe(true);
        expect(activity.startDate <= endDate).toBe(true);
      });
    });

    it('should respect pagination limits', async () => {
      const activities = await getActivitiesByUserId(testUserId, {
        limit: 1,
      });

      expect(activities.length).toBeLessThanOrEqual(1);
    });
  });

  describe('getAllActivities', () => {
    it('should get all activities with default pagination', async () => {
      const activities = await getAllActivities();

      expect(Array.isArray(activities)).toBe(true);
      expect(activities.length).toBeGreaterThan(0);
    });

    it('should respect custom pagination', async () => {
      const activities = await getAllActivities({ limit: 1, offset: 0 });

      expect(activities.length).toBeLessThanOrEqual(1);
    });
  });

  describe('updateActivity', () => {
    it('should update activity fields', async () => {
      const updatedData = {
        name: 'Updated Morning Ride',
        description: 'Updated description',
        metadata: { weather: 'sunny' },
      };

      const activity = await updateActivity(createdActivityId, updatedData);

      expect(activity).toBeDefined();
      expect(activity?.name).toBe(updatedData.name);
      expect(activity?.description).toBe(updatedData.description);
      expect(activity?.metadata).toEqual(updatedData.metadata);
    });

    it('should return undefined for non-existent id', async () => {
      const activity = await updateActivity('00000000-0000-0000-0000-000000000000', {
        name: 'Test',
      });
      expect(activity).toBeUndefined();
    });
  });

  describe('getActivityStats', () => {
    it('should calculate activity statistics', async () => {
      const stats = await getActivityStats(testUserId);

      expect(stats).toBeDefined();
      expect(stats.totalActivities).toBeGreaterThan(0);
      expect(stats.totalDistance).toBeGreaterThan(0);
      expect(stats.totalMovingTime).toBeGreaterThan(0);
      expect(stats.averageDistance).toBeGreaterThan(0);
    });

    it('should filter stats by type', async () => {
      const stats = await getActivityStats(testUserId, { type: 'Ride' });

      expect(stats).toBeDefined();
      expect(stats.totalActivities).toBeGreaterThan(0);
    });
  });

  describe('findOrCreateActivity', () => {
    it('should find existing activity', async () => {
      const activity = await findOrCreateActivity(mockActivity);

      expect(activity).toBeDefined();
      expect(activity.stravaActivityId).toBe(mockActivity.stravaActivityId);
      expect(activity.id).toBe(createdActivityId);
    });

    it('should create new activity if not found', async () => {
      const newMockActivity: NewActivity = {
        userId: testUserId,
        stravaActivityId: 'new_strava_act_456',
        name: 'Evening Ride',
        type: 'Ride',
        distance: 15000,
        startDate: new Date('2024-01-02T18:00:00Z'),
      };

      const activity = await findOrCreateActivity(newMockActivity);

      expect(activity).toBeDefined();
      expect(activity.stravaActivityId).toBe(newMockActivity.stravaActivityId);
      expect(activity.name).toBe(newMockActivity.name);

      // Cleanup
      await deleteActivity(activity.id);
    });
  });

  describe('bulkCreateActivities', () => {
    it('should create multiple activities', async () => {
      const bulkActivities: NewActivity[] = [
        {
          userId: testUserId,
          name: 'Bulk Activity 1',
          type: 'Run',
          distance: 5000,
          startDate: new Date('2024-01-03T08:00:00Z'),
        },
        {
          userId: testUserId,
          name: 'Bulk Activity 2',
          type: 'Run',
          distance: 7500,
          startDate: new Date('2024-01-04T08:00:00Z'),
        },
      ];

      const activities = await bulkCreateActivities(bulkActivities);

      expect(activities.length).toBe(2);
      activities.forEach((activity, index) => {
        expect(activity.name).toBe(bulkActivities[index].name);
        expect(activity.userId).toBe(testUserId);
      });

      // Cleanup
      for (const activity of activities) {
        await deleteActivity(activity.id);
      }
    });

    it('should return empty array for empty input', async () => {
      const activities = await bulkCreateActivities([]);
      expect(activities).toEqual([]);
    });
  });

  describe('deleteActivity', () => {
    it('should delete activity', async () => {
      const result = await deleteActivity(createdActivityId);

      expect(result).toBe(true);

      const activity = await getActivityById(createdActivityId);
      expect(activity).toBeUndefined();
    });

    it('should return false for non-existent id', async () => {
      const result = await deleteActivity('00000000-0000-0000-0000-000000000000');
      expect(result).toBe(false);
    });
  });

  describe('deleteActivitiesByUserId', () => {
    it('should delete all activities for a user', async () => {
      // Create some test activities
      const testActivities: NewActivity[] = [
        {
          userId: testUserId,
          name: 'Delete Test 1',
          type: 'Ride',
          startDate: new Date(),
        },
        {
          userId: testUserId,
          name: 'Delete Test 2',
          type: 'Ride',
          startDate: new Date(),
        },
      ];

      await bulkCreateActivities(testActivities);

      const deletedCount = await deleteActivitiesByUserId(testUserId);

      expect(deletedCount).toBeGreaterThanOrEqual(2);

      const remainingActivities = await getActivitiesByUserId(testUserId);
      expect(remainingActivities.length).toBe(0);
    });
  });
});
