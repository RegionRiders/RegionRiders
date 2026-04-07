import { activitySchemas, paginationSchema, userSchemas } from './schemas';

describe('userSchemas.create', () => {
  it('accepts a valid minimal user (email only)', () => {
    const result = userSchemas.create.safeParse({ email: 'user@example.com' });
    expect(result.success).toBe(true);
  });

  it('accepts a fully populated user', () => {
    const result = userSchemas.create.safeParse({
      stravaId: '12345',
      email: 'user@example.com',
      firstName: 'Alice',
      lastName: 'Smith',
      profilePicture: 'https://example.com/pic.jpg',
      isActive: true,
      metadata: { key: 'value' },
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = userSchemas.create.safeParse({ email: 'not-an-email' });
    expect(result.success).toBe(false);
  });

  it('rejects a firstName that is too short', () => {
    const result = userSchemas.create.safeParse({ email: 'user@example.com', firstName: '' });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid profilePicture URL', () => {
    const result = userSchemas.create.safeParse({
      email: 'user@example.com',
      profilePicture: 'not-a-url',
    });
    expect(result.success).toBe(false);
  });

  it('accepts null profilePicture', () => {
    const result = userSchemas.create.safeParse({
      email: 'user@example.com',
      profilePicture: null,
    });
    expect(result.success).toBe(true);
  });
});

describe('userSchemas.update', () => {
  it('accepts an empty object (all fields optional)', () => {
    const result = userSchemas.update.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts partial updates', () => {
    const result = userSchemas.update.safeParse({ firstName: 'Bob' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email in update', () => {
    const result = userSchemas.update.safeParse({ email: 'bad-email' });
    expect(result.success).toBe(false);
  });
});

describe('userSchemas.tokenUpdate', () => {
  it('accepts an empty object', () => {
    expect(userSchemas.tokenUpdate.safeParse({}).success).toBe(true);
  });

  it('accepts valid token fields', () => {
    const result = userSchemas.tokenUpdate.safeParse({
      accessToken: 'abc',
      refreshToken: 'xyz',
      tokenExpiresAt: new Date(),
    });
    expect(result.success).toBe(true);
  });
});

describe('activitySchemas.create', () => {
  const validActivity = {
    stravaId: '111',
    userId: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Morning Ride',
    type: 'ride',
    startDate: new Date(),
  };

  it('accepts a valid minimal activity', () => {
    expect(activitySchemas.create.safeParse(validActivity).success).toBe(true);
  });

  it('rejects missing required fields', () => {
    const { name: _name, ...withoutName } = validActivity;
    expect(activitySchemas.create.safeParse(withoutName).success).toBe(false);
  });

  it('rejects an invalid UUID for userId', () => {
    expect(
      activitySchemas.create.safeParse({ ...validActivity, userId: 'not-a-uuid' }).success
    ).toBe(false);
  });

  it('rejects negative distance', () => {
    expect(
      activitySchemas.create.safeParse({ ...validActivity, distance: -1 }).success
    ).toBe(false);
  });

  it('rejects startLatitude out of range', () => {
    expect(
      activitySchemas.create.safeParse({ ...validActivity, startLatitude: 200 }).success
    ).toBe(false);
  });

  it('accepts optional fields', () => {
    const result = activitySchemas.create.safeParse({
      ...validActivity,
      distance: 5000,
      movingTime: 1200,
      elapsedTime: 1300,
      totalElevationGain: 50,
      startLatitude: 52.2,
      startLongitude: 21.0,
      averageSpeed: 4.2,
      maxSpeed: 6.0,
      averageHeartrate: 140,
      maxHeartrate: 175,
      metadata: {},
    });
    expect(result.success).toBe(true);
  });
});

describe('activitySchemas.update', () => {
  it('accepts an empty object', () => {
    expect(activitySchemas.update.safeParse({}).success).toBe(true);
  });

  it('rejects name that is too short', () => {
    expect(activitySchemas.update.safeParse({ name: '' }).success).toBe(false);
  });
});

describe('activitySchemas.filters', () => {
  it('accepts an empty filters object', () => {
    expect(activitySchemas.filters.safeParse({}).success).toBe(true);
  });

  it('accepts valid filters', () => {
    const result = activitySchemas.filters.safeParse({
      userId: '550e8400-e29b-41d4-a716-446655440000',
      type: 'run',
      startDateFrom: new Date(),
      startDateTo: new Date(),
      minDistance: 0,
      maxDistance: 100,
    });
    expect(result.success).toBe(true);
  });
});

describe('paginationSchema', () => {
  it('uses defaults when nothing is provided', () => {
    const result = paginationSchema.parse({});
    expect(result.limit).toBe(50);
    expect(result.offset).toBe(0);
    expect(result.activeOnly).toBe(false);
  });

  it('accepts custom values', () => {
    const result = paginationSchema.parse({ limit: 10, offset: 5, activeOnly: true });
    expect(result.limit).toBe(10);
    expect(result.offset).toBe(5);
    expect(result.activeOnly).toBe(true);
  });

  it('rejects limit greater than 100', () => {
    expect(paginationSchema.safeParse({ limit: 101 }).success).toBe(false);
  });

  it('rejects negative offset', () => {
    expect(paginationSchema.safeParse({ offset: -1 }).success).toBe(false);
  });
});
