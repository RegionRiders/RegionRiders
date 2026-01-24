/**
 * @jest-environment node
 */

/**
 * Tests for database utility functions
 */

import {
  fingerprint,
  isValidUuid,
  sanitizeActivityUpdateData,
  sanitizeUserUpdateData,
} from './index';

describe('sanitizeUserUpdateData', () => {
  it('should only include allowed fields', () => {
    const input = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      accessToken: 'token123',
      refreshToken: 'refresh123',
      tokenExpiresAt: new Date(),
      isActive: true,
      profilePicture: 'pic.jpg',
      metadata: { key: 'value' },
      updatedAt: new Date(),
      stravaId: '12345', // sensitive, should be excluded
    };

    const result = sanitizeUserUpdateData(input);

    expect(result).toEqual({
      firstName: 'John',
      lastName: 'Doe',
      isActive: true,
      profilePicture: 'pic.jpg',
      metadata: { key: 'value' },
      updatedAt: input.updatedAt,
    });

    // Ensure sensitive fields are not included
    expect(result).not.toHaveProperty('email');
    expect(result).not.toHaveProperty('accessToken');
    expect(result).not.toHaveProperty('refreshToken');
    expect(result).not.toHaveProperty('tokenExpiresAt');
    expect(result).not.toHaveProperty('stravaId');
  });

  it('should handle partial data', () => {
    const input = {
      firstName: 'Jane',
      isActive: false,
    };

    const result = sanitizeUserUpdateData(input);

    expect(result).toEqual({
      firstName: 'Jane',
      isActive: false,
    });
  });

  it('should return empty object for no allowed fields', () => {
    const input = {
      email: 'test@example.com',
      accessToken: 'token',
      stravaId: '123',
    };

    const result = sanitizeUserUpdateData(input);

    expect(result).toEqual({});
  });
});

describe('sanitizeActivityUpdateData', () => {
  it('should only include allowed fields', () => {
    const input = {
      stravaActivityId: '12345',
      name: 'Morning Ride',
      type: 'Ride',
      startDate: new Date(),
      description: 'A nice morning ride',
      sportType: 'MountainBikeRide',
      timezone: 'America/New_York',
      distance: 15000,
      movingTime: 3600,
      elapsedTime: 3700,
      totalElevationGain: 500,
      averageSpeed: 4.17,
      elevHigh: 1000,
      elevLow: 500,
      maxSpeed: 15.5,
      averageCadence: 85,
      averageHeartrate: 140,
      maxHeartrate: 180,
      calories: 800,
      isManual: false,
      isPrivate: false,
      metadata: { key: 'value' },
      updatedAt: new Date(),
      // Sensitive location data that should be excluded
      startLatlng: [40.7128, -74.006] as [number, number],
      endLatlng: [40.7589, -73.9851] as [number, number],
      locationCity: 'New York',
      locationState: 'NY',
      locationCountry: 'US',
      // Sensitive map data that should be excluded
      mapPolyline: 'encoded_polyline_data',
      mapSummaryPolyline: 'summary_polyline',
    };

    const result = sanitizeActivityUpdateData(input);

    expect(result).toEqual({
      stravaActivityId: '12345',
      name: 'Morning Ride',
      type: 'Ride',
      startDate: input.startDate,
      description: 'A nice morning ride',
      sportType: 'MountainBikeRide',
      timezone: 'America/New_York',
      distance: 15000,
      movingTime: 3600,
      elapsedTime: 3700,
      totalElevationGain: 500,
      averageSpeed: 4.17,
      elevHigh: 1000,
      elevLow: 500,
      maxSpeed: 15.5,
      averageCadence: 85,
      averageHeartrate: 140,
      maxHeartrate: 180,
      calories: 800,
      isManual: false,
      isPrivate: false,
      metadata: { key: 'value' },
      updatedAt: input.updatedAt,
    });

    // Ensure sensitive location fields are not included
    expect(result).not.toHaveProperty('startLatlng');
    expect(result).not.toHaveProperty('endLatlng');
    expect(result).not.toHaveProperty('locationCity');
    expect(result).not.toHaveProperty('locationState');
    expect(result).not.toHaveProperty('locationCountry');
    // Ensure sensitive map data is not included
    expect(result).not.toHaveProperty('mapPolyline');
    expect(result).not.toHaveProperty('mapSummaryPolyline');
  });

  it('should handle partial data', () => {
    const input = {
      name: 'Evening Run',
      distance: 5000,
      movingTime: 1200,
    };

    const result = sanitizeActivityUpdateData(input);

    expect(result).toEqual({
      name: 'Evening Run',
      distance: 5000,
      movingTime: 1200,
    });
  });

  it('should return empty object for no allowed fields', () => {
    const input = {
      locationCity: 'New York',
      locationState: 'NY',
      mapPolyline: 'encoded_polyline_data',
    };

    const result = sanitizeActivityUpdateData(input);

    expect(result).toEqual({});
  });
});

describe('fingerprint', () => {
  it('should return a 16-character hash for string input', () => {
    const result = fingerprint('test');
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
    expect(result).toHaveLength(16);
    expect(result).toMatch(/^[a-f0-9]{16}$/);
  });

  it('should return a 16-character hash for number input', () => {
    const result = fingerprint(12345);
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
    expect(result).toHaveLength(16);
    expect(result).toMatch(/^[a-f0-9]{16}$/);
  });

  it('should return undefined for null input', () => {
    const result = fingerprint(null);
    expect(result).toBeUndefined();
  });

  it('should return undefined for undefined input', () => {
    const result = fingerprint(undefined);
    expect(result).toBeUndefined();
  });

  it('should produce consistent hashes for the same input', () => {
    const result1 = fingerprint('consistent');
    const result2 = fingerprint('consistent');
    expect(result1).toBe(result2);
  });

  it('should produce different hashes for different inputs', () => {
    const result1 = fingerprint('input1');
    const result2 = fingerprint('input2');
    expect(result1).not.toBe(result2);
  });

  it('should handle empty string', () => {
    const result = fingerprint('');
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
    expect(result).toHaveLength(16);
  });

  it('should handle zero as number', () => {
    const result = fingerprint(0);
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
    expect(result).toHaveLength(16);
  });
});

describe('isValidUuid', () => {
  it('should return true for valid UUIDs', () => {
    expect(isValidUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(isValidUuid('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
    expect(isValidUuid('AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE')).toBe(true);
  });

  it('should return false for invalid UUIDs', () => {
    expect(isValidUuid('not-a-uuid')).toBe(false);
    expect(isValidUuid('12345678-1234-1234-1234-12345678901')).toBe(false); // Too short
    expect(isValidUuid('12345678-1234-1234-1234-1234567890123')).toBe(false); // Too long
    expect(isValidUuid('12345678-1234-1234-1234-123456789012Z')).toBe(false); // Invalid char
    expect(isValidUuid('12345678_1234_1234_1234_123456789012')).toBe(false); // Wrong separator
  });

  it('should return false for empty string', () => {
    expect(isValidUuid('')).toBe(false);
  });

  it('should return false for non-string values', () => {
    expect(isValidUuid(null as any)).toBe(false);
    expect(isValidUuid(undefined as any)).toBe(false);
    expect(isValidUuid(123 as any)).toBe(false);
    expect(isValidUuid({} as any)).toBe(false);
  });
});
