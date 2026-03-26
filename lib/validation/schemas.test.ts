import { activitySchemas, paginationSchema, userSchemas } from './schemas';

describe('validation schemas', () => {
  describe('userSchemas', () => {
    describe('create', () => {
      it('should validate a valid user create input', () => {
        const validUser = {
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
        };

        const result = userSchemas.create.safeParse(validUser);
        expect(result.success).toBe(true);
      });

      it('should validate user with all optional fields', () => {
        const validUser = {
          stravaId: '12345',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          profilePicture: 'https://example.com/pic.jpg',
          isActive: true,
          settings: {
            lineColorSwatches: [
              {
                normal: [255, 0, 0, 0.5],
                hover: [255, 100, 100, 0.7],
              },
            ],
            mapTintSwatches: [
              [0, 0, 0, 0],
              [255, 255, 255, 0.2],
              [255, 0, 0, 0.1],
            ],
          },
          metadata: { key: 'value' },
        };

        const result = userSchemas.create.safeParse(validUser);
        expect(result.success).toBe(true);
      });

      it('should allow empty settings arrays for dynamic swatch counts', () => {
        const validUser = {
          email: 'test@example.com',
          settings: {
            lineColorSwatches: [],
            mapTintSwatches: [],
            activityHeatmapColorSwatches: [],
            regionStaticColorSwatches: [],
            regionHeatmapColorSwatches: [],
          },
        };

        const result = userSchemas.create.safeParse(validUser);
        expect(result.success).toBe(true);
      });

      it('should reject invalid email', () => {
        const invalidUser = {
          email: 'not-an-email',
        };

        const result = userSchemas.create.safeParse(invalidUser);
        expect(result.success).toBe(false);
      });

      it('should reject empty stravaId', () => {
        const invalidUser = {
          stravaId: '',
          email: 'test@example.com',
        };

        const result = userSchemas.create.safeParse(invalidUser);
        expect(result.success).toBe(false);
      });

      it('should reject stravaId exceeding max length', () => {
        const invalidUser = {
          stravaId: 'a'.repeat(51),
          email: 'test@example.com',
        };

        const result = userSchemas.create.safeParse(invalidUser);
        expect(result.success).toBe(false);
      });

      it('should allow null profilePicture', () => {
        const validUser = {
          email: 'test@example.com',
          profilePicture: null,
        };

        const result = userSchemas.create.safeParse(validUser);
        expect(result.success).toBe(true);
      });

      it('should default isActive to true', () => {
        const user = {
          email: 'test@example.com',
        };

        const result = userSchemas.create.safeParse(user);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.isActive).toBe(true);
        }
      });
    });

    describe('update', () => {
      it('should validate a valid user update input', () => {
        const validUpdate = {
          firstName: 'Jane',
          lastName: 'Smith',
        };

        const result = userSchemas.update.safeParse(validUpdate);
        expect(result.success).toBe(true);
      });

      it('should allow empty update object', () => {
        const result = userSchemas.update.safeParse({});
        expect(result.success).toBe(true);
      });

      it('should reject invalid email in update', () => {
        const invalidUpdate = {
          email: 'not-valid',
        };

        const result = userSchemas.update.safeParse(invalidUpdate);
        expect(result.success).toBe(false);
      });

      it('should validate settings updates with variable swatch array lengths', () => {
        const validUpdate = {
          settings: {
            selectedLineSwatchIndex: 3,
            lineColorSwatches: [
              { normal: [255, 0, 0, 0.5], hover: [255, 100, 100, 0.7] },
              { normal: [0, 255, 0, 0.5], hover: [100, 255, 100, 0.7] },
              { normal: [0, 0, 255, 0.5], hover: [100, 100, 255, 0.7] },
              { normal: [255, 255, 0, 0.5], hover: [255, 255, 100, 0.7] },
            ],
          },
        };

        const result = userSchemas.update.safeParse(validUpdate);
        expect(result.success).toBe(true);
      });

      it('should allow selectedLineSwatchIndex at the last swatch position', () => {
        const validUpdate = {
          settings: {
            selectedLineSwatchIndex: 1,
            lineColorSwatches: [
              { normal: [255, 0, 0, 0.5], hover: [255, 100, 100, 0.7] },
              { normal: [0, 255, 0, 0.5], hover: [100, 255, 100, 0.7] },
            ],
          },
        };

        const result = userSchemas.update.safeParse(validUpdate);
        expect(result.success).toBe(true);
      });

      it('should reject out-of-bounds selectedLineSwatchIndex', () => {
        const invalidUpdate = {
          settings: {
            selectedLineSwatchIndex: 2,
            lineColorSwatches: [{ normal: [255, 0, 0, 0.5], hover: [255, 100, 100, 0.7] }],
          },
        };

        const result = userSchemas.update.safeParse(invalidUpdate);
        expect(result.success).toBe(false);
      });
    });

    describe('tokenUpdate', () => {
      it('should validate valid token update', () => {
        const validTokenUpdate = {
          accessToken: 'access123',
          refreshToken: 'refresh456',
          tokenExpiresAt: new Date(),
        };

        const result = userSchemas.tokenUpdate.safeParse(validTokenUpdate);
        expect(result.success).toBe(true);
      });

      it('should allow partial token update', () => {
        const partialUpdate = {
          accessToken: 'access123',
        };

        const result = userSchemas.tokenUpdate.safeParse(partialUpdate);
        expect(result.success).toBe(true);
      });

      it('should allow empty token update', () => {
        const result = userSchemas.tokenUpdate.safeParse({});
        expect(result.success).toBe(true);
      });
    });
  });

  describe('activitySchemas', () => {
    describe('create', () => {
      it('should validate a valid activity create input', () => {
        const validActivity = {
          stravaId: 'strava123',
          userId: '550e8400-e29b-41d4-a716-446655440000',
          name: 'Morning Run',
          type: 'Run',
          startDate: new Date(),
        };

        const result = activitySchemas.create.safeParse(validActivity);
        expect(result.success).toBe(true);
      });

      it('should validate activity with all optional fields', () => {
        const validActivity = {
          stravaId: 'strava123',
          userId: '550e8400-e29b-41d4-a716-446655440000',
          name: 'Morning Run',
          type: 'Run',
          distance: 5000,
          movingTime: 1800,
          elapsedTime: 2000,
          totalElevationGain: 100,
          startDate: new Date(),
          startLatitude: 52.5,
          startLongitude: 13.4,
          averageSpeed: 2.78,
          maxSpeed: 3.5,
          averageHeartrate: 145,
          maxHeartrate: 180,
          metadata: { weather: 'sunny' },
        };

        const result = activitySchemas.create.safeParse(validActivity);
        expect(result.success).toBe(true);
      });

      it('should reject invalid userId (not UUID)', () => {
        const invalidActivity = {
          stravaId: 'strava123',
          userId: 'not-a-uuid',
          name: 'Morning Run',
          type: 'Run',
          startDate: new Date(),
        };

        const result = activitySchemas.create.safeParse(invalidActivity);
        expect(result.success).toBe(false);
      });

      it('should reject negative distance', () => {
        const invalidActivity = {
          stravaId: 'strava123',
          userId: '550e8400-e29b-41d4-a716-446655440000',
          name: 'Morning Run',
          type: 'Run',
          startDate: new Date(),
          distance: -100,
        };

        const result = activitySchemas.create.safeParse(invalidActivity);
        expect(result.success).toBe(false);
      });

      it('should reject latitude out of range', () => {
        const invalidActivity = {
          stravaId: 'strava123',
          userId: '550e8400-e29b-41d4-a716-446655440000',
          name: 'Morning Run',
          type: 'Run',
          startDate: new Date(),
          startLatitude: 100, // Invalid: > 90
        };

        const result = activitySchemas.create.safeParse(invalidActivity);
        expect(result.success).toBe(false);
      });

      it('should reject longitude out of range', () => {
        const invalidActivity = {
          stravaId: 'strava123',
          userId: '550e8400-e29b-41d4-a716-446655440000',
          name: 'Morning Run',
          type: 'Run',
          startDate: new Date(),
          startLongitude: 200, // Invalid: > 180
        };

        const result = activitySchemas.create.safeParse(invalidActivity);
        expect(result.success).toBe(false);
      });

      it('should allow null coordinates', () => {
        const validActivity = {
          stravaId: 'strava123',
          userId: '550e8400-e29b-41d4-a716-446655440000',
          name: 'Morning Run',
          type: 'Run',
          startDate: new Date(),
          startLatitude: null,
          startLongitude: null,
        };

        const result = activitySchemas.create.safeParse(validActivity);
        expect(result.success).toBe(true);
      });

      it('should reject zero or negative heartrate', () => {
        const invalidActivity = {
          stravaId: 'strava123',
          userId: '550e8400-e29b-41d4-a716-446655440000',
          name: 'Morning Run',
          type: 'Run',
          startDate: new Date(),
          averageHeartrate: 0,
        };

        const result = activitySchemas.create.safeParse(invalidActivity);
        expect(result.success).toBe(false);
      });
    });

    describe('update', () => {
      it('should validate a valid activity update', () => {
        const validUpdate = {
          name: 'Evening Run',
          distance: 10000,
        };

        const result = activitySchemas.update.safeParse(validUpdate);
        expect(result.success).toBe(true);
      });

      it('should allow empty update object', () => {
        const result = activitySchemas.update.safeParse({});
        expect(result.success).toBe(true);
      });
    });

    describe('filters', () => {
      it('should validate valid filters', () => {
        const validFilters = {
          userId: '550e8400-e29b-41d4-a716-446655440000',
          type: 'Run',
          startDateFrom: new Date(),
          startDateTo: new Date(),
          minDistance: 0,
          maxDistance: 50000,
        };

        const result = activitySchemas.filters.safeParse(validFilters);
        expect(result.success).toBe(true);
      });

      it('should allow empty filters', () => {
        const result = activitySchemas.filters.safeParse({});
        expect(result.success).toBe(true);
      });

      it('should reject invalid userId in filters', () => {
        const invalidFilters = {
          userId: 'not-a-uuid',
        };

        const result = activitySchemas.filters.safeParse(invalidFilters);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('paginationSchema', () => {
    it('should validate valid pagination params', () => {
      const validPagination = {
        limit: 20,
        offset: 10,
        activeOnly: true,
      };

      const result = paginationSchema.safeParse(validPagination);
      expect(result.success).toBe(true);
    });

    it('should use default values when not provided', () => {
      const result = paginationSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(50);
        expect(result.data.offset).toBe(0);
        expect(result.data.activeOnly).toBe(false);
      }
    });

    it('should reject limit less than 1', () => {
      const invalidPagination = {
        limit: 0,
      };

      const result = paginationSchema.safeParse(invalidPagination);
      expect(result.success).toBe(false);
    });

    it('should reject limit greater than 100', () => {
      const invalidPagination = {
        limit: 101,
      };

      const result = paginationSchema.safeParse(invalidPagination);
      expect(result.success).toBe(false);
    });

    it('should reject negative offset', () => {
      const invalidPagination = {
        offset: -1,
      };

      const result = paginationSchema.safeParse(invalidPagination);
      expect(result.success).toBe(false);
    });

    it('should reject non-integer limit', () => {
      const invalidPagination = {
        limit: 10.5,
      };

      const result = paginationSchema.safeParse(invalidPagination);
      expect(result.success).toBe(false);
    });
  });
});
