/**
 * Validation Schemas Tests
 * Tests for Zod validation schemas
 */

import { describe, expect, it } from '@jest/globals';
import {
  activitySchemas,
  paginationSchema,
  userSchemas,
  type ActivityCreateInput,
  type ActivityFilters,
  type ActivityUpdateInput,
  type PaginationParams,
  type UserCreateInput,
  type UserTokenUpdateInput,
  type UserUpdateInput,
} from './schemas';

describe('User Validation Schemas', () => {
  describe('userSchemas.create', () => {
    it('validates a valid user creation input with all fields', () => {
      const input: UserCreateInput = {
        stravaId: '12345',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        profilePicture: 'https://example.com/avatar.jpg',
        isActive: true,
        metadata: { source: 'strava' },
      };

      const result = userSchemas.create.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('test@example.com');
        expect(result.data.isActive).toBe(true);
      }
    });

    it('validates minimal required fields (email only)', () => {
      const input = {
        email: 'user@domain.com',
      };

      const result = userSchemas.create.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isActive).toBe(true); // default value
      }
    });

    it('rejects invalid email format', () => {
      const input = {
        email: 'invalid-email',
      };

      const result = userSchemas.create.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('rejects stravaId exceeding max length', () => {
      const input = {
        email: 'test@example.com',
        stravaId: 'a'.repeat(51),
      };

      const result = userSchemas.create.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('accepts null profilePicture', () => {
      const input = {
        email: 'test@example.com',
        profilePicture: null,
      };

      const result = userSchemas.create.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('rejects invalid URL for profilePicture', () => {
      const input = {
        email: 'test@example.com',
        profilePicture: 'not-a-url',
      };

      const result = userSchemas.create.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('validates metadata as record of unknown values', () => {
      const input = {
        email: 'test@example.com',
        metadata: {
          customField: 'value',
          nested: { key: 123 },
          array: [1, 2, 3],
        },
      };

      const result = userSchemas.create.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('rejects firstName that is too short', () => {
      const input = {
        email: 'test@example.com',
        firstName: '',
      };

      const result = userSchemas.create.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('rejects lastName exceeding max length', () => {
      const input = {
        email: 'test@example.com',
        lastName: 'a'.repeat(101),
      };

      const result = userSchemas.create.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('userSchemas.update', () => {
    it('validates update with all optional fields', () => {
      const input: UserUpdateInput = {
        email: 'updated@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        profilePicture: 'https://example.com/new-avatar.png',
        isActive: false,
        metadata: { updated: true },
      };

      const result = userSchemas.update.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('validates empty update object', () => {
      const input = {};

      const result = userSchemas.update.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('validates partial update', () => {
      const input = {
        firstName: 'Updated',
      };

      const result = userSchemas.update.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.firstName).toBe('Updated');
      }
    });
  });

  describe('userSchemas.tokenUpdate', () => {
    it('validates token update with all fields', () => {
      const input: UserTokenUpdateInput = {
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-456',
        tokenExpiresAt: new Date('2024-12-31'),
      };

      const result = userSchemas.tokenUpdate.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('validates empty token update', () => {
      const input = {};

      const result = userSchemas.tokenUpdate.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('validates partial token update', () => {
      const input = {
        accessToken: 'new-token',
      };

      const result = userSchemas.tokenUpdate.safeParse(input);
      expect(result.success).toBe(true);
    });
  });
});

describe('Activity Validation Schemas', () => {
  describe('activitySchemas.create', () => {
    it('validates a complete activity creation input', () => {
      const input: ActivityCreateInput = {
        stravaId: '123456',
        userId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Morning Ride',
        type: 'Ride',
        distance: 50000,
        movingTime: 7200,
        elapsedTime: 8000,
        totalElevationGain: 500,
        startDate: new Date('2024-01-15T08:00:00Z'),
        startLatitude: 51.5074,
        startLongitude: -0.1278,
        averageSpeed: 6.94,
        maxSpeed: 15.0,
        averageHeartrate: 145,
        maxHeartrate: 185,
        metadata: { weather: 'sunny' },
      };

      const result = activitySchemas.create.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('validates minimal required fields', () => {
      const input = {
        stravaId: '789',
        userId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Quick Spin',
        type: 'Ride',
        startDate: new Date(),
      };

      const result = activitySchemas.create.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('rejects missing required stravaId', () => {
      const input = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test',
        type: 'Ride',
        startDate: new Date(),
      };

      const result = activitySchemas.create.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('rejects invalid UUID for userId', () => {
      const input = {
        stravaId: '123',
        userId: 'not-a-uuid',
        name: 'Test',
        type: 'Ride',
        startDate: new Date(),
      };

      const result = activitySchemas.create.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('rejects negative distance', () => {
      const input = {
        stravaId: '123',
        userId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test',
        type: 'Ride',
        startDate: new Date(),
        distance: -100,
      };

      const result = activitySchemas.create.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('rejects latitude out of range (> 90)', () => {
      const input = {
        stravaId: '123',
        userId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test',
        type: 'Ride',
        startDate: new Date(),
        startLatitude: 91,
      };

      const result = activitySchemas.create.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('rejects latitude out of range (< -90)', () => {
      const input = {
        stravaId: '123',
        userId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test',
        type: 'Ride',
        startDate: new Date(),
        startLatitude: -91,
      };

      const result = activitySchemas.create.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('rejects longitude out of range (> 180)', () => {
      const input = {
        stravaId: '123',
        userId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test',
        type: 'Ride',
        startDate: new Date(),
        startLongitude: 181,
      };

      const result = activitySchemas.create.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('rejects longitude out of range (< -180)', () => {
      const input = {
        stravaId: '123',
        userId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test',
        type: 'Ride',
        startDate: new Date(),
        startLongitude: -181,
      };

      const result = activitySchemas.create.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('accepts null latitude and longitude', () => {
      const input = {
        stravaId: '123',
        userId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test',
        type: 'Ride',
        startDate: new Date(),
        startLatitude: null,
        startLongitude: null,
      };

      const result = activitySchemas.create.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('rejects non-integer movingTime', () => {
      const input = {
        stravaId: '123',
        userId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test',
        type: 'Ride',
        startDate: new Date(),
        movingTime: 3600.5,
      };

      const result = activitySchemas.create.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('rejects negative heart rate', () => {
      const input = {
        stravaId: '123',
        userId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test',
        type: 'Ride',
        startDate: new Date(),
        averageHeartrate: -10,
      };

      const result = activitySchemas.create.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('rejects zero heart rate (must be positive)', () => {
      const input = {
        stravaId: '123',
        userId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test',
        type: 'Ride',
        startDate: new Date(),
        averageHeartrate: 0,
      };

      const result = activitySchemas.create.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('rejects empty stravaId', () => {
      const input = {
        stravaId: '',
        userId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test',
        type: 'Ride',
        startDate: new Date(),
      };

      const result = activitySchemas.create.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('rejects type exceeding max length', () => {
      const input = {
        stravaId: '123',
        userId: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test',
        type: 'a'.repeat(51),
        startDate: new Date(),
      };

      const result = activitySchemas.create.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('activitySchemas.update', () => {
    it('validates complete update', () => {
      const input: ActivityUpdateInput = {
        name: 'Updated Ride',
        type: 'VirtualRide',
        distance: 75000,
        movingTime: 10800,
        elapsedTime: 11000,
        totalElevationGain: 800,
        startDate: new Date('2024-02-01'),
        startLatitude: 40.7128,
        startLongitude: -74.006,
        averageSpeed: 7.5,
        maxSpeed: 18.0,
        averageHeartrate: 150,
        maxHeartrate: 190,
        metadata: { edited: true },
      };

      const result = activitySchemas.update.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('validates empty update', () => {
      const input = {};

      const result = activitySchemas.update.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('validates partial update', () => {
      const input = {
        name: 'Renamed Activity',
      };

      const result = activitySchemas.update.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe('activitySchemas.filters', () => {
    it('validates complete filters', () => {
      const input: ActivityFilters = {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        type: 'Ride',
        startDateFrom: new Date('2024-01-01'),
        startDateTo: new Date('2024-12-31'),
        minDistance: 1000,
        maxDistance: 100000,
      };

      const result = activitySchemas.filters.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('validates empty filters', () => {
      const input = {};

      const result = activitySchemas.filters.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('rejects invalid UUID for userId filter', () => {
      const input = {
        userId: 'invalid-uuid',
      };

      const result = activitySchemas.filters.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('rejects negative minDistance', () => {
      const input = {
        minDistance: -100,
      };

      const result = activitySchemas.filters.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('accepts type filter', () => {
      const input = {
        type: 'Run',
      };

      const result = activitySchemas.filters.safeParse(input);
      expect(result.success).toBe(true);
    });
  });
});

describe('Pagination Schema', () => {
  it('validates complete pagination params', () => {
    const input: PaginationParams = {
      limit: 25,
      offset: 50,
      activeOnly: true,
    };

    const result = paginationSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(25);
      expect(result.data.offset).toBe(50);
      expect(result.data.activeOnly).toBe(true);
    }
  });

  it('applies default values', () => {
    const input = {};

    const result = paginationSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(50);
      expect(result.data.offset).toBe(0);
      expect(result.data.activeOnly).toBe(false);
    }
  });

  it('rejects limit below minimum', () => {
    const input = {
      limit: 0,
    };

    const result = paginationSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects limit above maximum', () => {
    const input = {
      limit: 101,
    };

    const result = paginationSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects negative offset', () => {
    const input = {
      offset: -1,
    };

    const result = paginationSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('accepts boundary values', () => {
    const inputMin = { limit: 1, offset: 0 };
    const inputMax = { limit: 100, offset: 1000000 };

    expect(paginationSchema.safeParse(inputMin).success).toBe(true);
    expect(paginationSchema.safeParse(inputMax).success).toBe(true);
  });

  it('rejects non-integer limit', () => {
    const input = {
      limit: 50.5,
    };

    const result = paginationSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('rejects non-integer offset', () => {
    const input = {
      offset: 10.5,
    };

    const result = paginationSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});
