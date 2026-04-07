/**
 * @jest-environment node
 */

import {
  activitySchemas,
  paginationSchema,
  userSchemas,
  type ActivityCreateInput,
  type ActivityFilters,
  type ActivityUpdateInput,
  type PaginationParams,
  type UserCreateInput,
  type UserUpdateInput,
  type UserTokenUpdateInput,
} from './schemas';

describe('userSchemas.create', () => {
  it('validates a valid user create input', () => {
    const input = { email: 'alice@example.com' };
    const result = userSchemas.create.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('validates a full user create input', () => {
    const input: UserCreateInput = {
      stravaId: 'strava-123',
      email: 'bob@example.com',
      firstName: 'Bob',
      lastName: 'Smith',
      profilePicture: 'https://example.com/pic.jpg',
      isActive: true,
      metadata: { key: 'value' },
    };
    const result = userSchemas.create.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = userSchemas.create.safeParse({ email: 'not-an-email' });
    expect(result.success).toBe(false);
  });

  it('rejects empty stravaId', () => {
    const result = userSchemas.create.safeParse({ email: 'x@y.com', stravaId: '' });
    expect(result.success).toBe(false);
  });

  it('rejects stravaId over max length', () => {
    const result = userSchemas.create.safeParse({ email: 'x@y.com', stravaId: 'a'.repeat(51) });
    expect(result.success).toBe(false);
  });

  it('accepts null profilePicture', () => {
    const result = userSchemas.create.safeParse({ email: 'x@y.com', profilePicture: null });
    expect(result.success).toBe(true);
  });

  it('defaults isActive to true when not provided', () => {
    const result = userSchemas.create.safeParse({ email: 'x@y.com' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isActive).toBe(true);
    }
  });
});

describe('userSchemas.update', () => {
  it('validates an empty update', () => {
    const result = userSchemas.update.safeParse({});
    expect(result.success).toBe(true);
  });

  it('validates a partial update', () => {
    const input: UserUpdateInput = { firstName: 'Alice', isActive: false };
    const result = userSchemas.update.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = userSchemas.update.safeParse({ email: 'bad' });
    expect(result.success).toBe(false);
  });

  it('rejects firstName that is too long', () => {
    const result = userSchemas.update.safeParse({ firstName: 'a'.repeat(101) });
    expect(result.success).toBe(false);
  });
});

describe('userSchemas.tokenUpdate', () => {
  it('validates empty token update', () => {
    const result = userSchemas.tokenUpdate.safeParse({});
    expect(result.success).toBe(true);
  });

  it('validates full token update', () => {
    const input: UserTokenUpdateInput = {
      accessToken: 'access',
      refreshToken: 'refresh',
      tokenExpiresAt: new Date(),
    };
    const result = userSchemas.tokenUpdate.safeParse(input);
    expect(result.success).toBe(true);
  });
});

describe('activitySchemas.create', () => {
  const validActivity: ActivityCreateInput = {
    stravaId: 'strava-act-1',
    userId: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Morning Ride',
    type: 'Ride',
    startDate: new Date('2024-01-01'),
  };

  it('validates a minimal activity create input', () => {
    const result = activitySchemas.create.safeParse(validActivity);
    expect(result.success).toBe(true);
  });

  it('validates a full activity create input', () => {
    const input: ActivityCreateInput = {
      ...validActivity,
      distance: 25000,
      movingTime: 3600,
      elapsedTime: 4000,
      totalElevationGain: 450,
      startLatitude: 45.5,
      startLongitude: -73.5,
      averageSpeed: 6.94,
      maxSpeed: 15.5,
      averageHeartrate: 150,
      maxHeartrate: 180,
      metadata: { source: 'strava' },
    };
    const result = activitySchemas.create.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('rejects missing required stravaId', () => {
    const { stravaId: _, ...rest } = validActivity;
    const result = activitySchemas.create.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects invalid userId (not a UUID)', () => {
    const result = activitySchemas.create.safeParse({ ...validActivity, userId: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('rejects negative distance', () => {
    const result = activitySchemas.create.safeParse({ ...validActivity, distance: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects latitude out of range', () => {
    const result = activitySchemas.create.safeParse({ ...validActivity, startLatitude: 91 });
    expect(result.success).toBe(false);
  });

  it('rejects longitude out of range', () => {
    const result = activitySchemas.create.safeParse({ ...validActivity, startLongitude: -181 });
    expect(result.success).toBe(false);
  });

  it('rejects negative averageHeartrate', () => {
    const result = activitySchemas.create.safeParse({ ...validActivity, averageHeartrate: 0 });
    expect(result.success).toBe(false);
  });

  it('accepts null startLatitude and startLongitude', () => {
    const result = activitySchemas.create.safeParse({
      ...validActivity,
      startLatitude: null,
      startLongitude: null,
    });
    expect(result.success).toBe(true);
  });
});

describe('activitySchemas.update', () => {
  it('validates an empty update', () => {
    const result = activitySchemas.update.safeParse({});
    expect(result.success).toBe(true);
  });

  it('validates a partial update', () => {
    const input: ActivityUpdateInput = { name: 'Evening Ride', distance: 10000 };
    const result = activitySchemas.update.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('rejects non-integer movingTime', () => {
    const result = activitySchemas.update.safeParse({ movingTime: 1.5 });
    expect(result.success).toBe(false);
  });

  it('rejects negative totalElevationGain', () => {
    const result = activitySchemas.update.safeParse({ totalElevationGain: -10 });
    expect(result.success).toBe(false);
  });
});

describe('activitySchemas.filters', () => {
  it('validates empty filters', () => {
    const result = activitySchemas.filters.safeParse({});
    expect(result.success).toBe(true);
  });

  it('validates full filters', () => {
    const input: ActivityFilters = {
      userId: '550e8400-e29b-41d4-a716-446655440000',
      type: 'Ride',
      startDateFrom: new Date('2024-01-01'),
      startDateTo: new Date('2024-12-31'),
      minDistance: 0,
      maxDistance: 100000,
    };
    const result = activitySchemas.filters.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('rejects invalid userId in filters', () => {
    const result = activitySchemas.filters.safeParse({ userId: 'not-uuid' });
    expect(result.success).toBe(false);
  });

  it('rejects negative minDistance', () => {
    const result = activitySchemas.filters.safeParse({ minDistance: -1 });
    expect(result.success).toBe(false);
  });
});

describe('paginationSchema', () => {
  it('validates with defaults', () => {
    const result = paginationSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      const data: PaginationParams = result.data;
      expect(data.limit).toBe(50);
      expect(data.offset).toBe(0);
      expect(data.activeOnly).toBe(false);
    }
  });

  it('validates custom pagination params', () => {
    const result = paginationSchema.safeParse({ limit: 25, offset: 50, activeOnly: true });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(25);
      expect(result.data.offset).toBe(50);
      expect(result.data.activeOnly).toBe(true);
    }
  });

  it('rejects limit of 0', () => {
    const result = paginationSchema.safeParse({ limit: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects limit over 100', () => {
    const result = paginationSchema.safeParse({ limit: 101 });
    expect(result.success).toBe(false);
  });

  it('rejects negative offset', () => {
    const result = paginationSchema.safeParse({ offset: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer limit', () => {
    const result = paginationSchema.safeParse({ limit: 1.5 });
    expect(result.success).toBe(false);
  });
});
