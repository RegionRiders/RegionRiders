/**
 * Validation Schemas
 * Zod schemas for input validation across the application
 */

import { z } from 'zod';

const tripStatusSchema = z.enum(['draft', 'active', 'completed', 'archived']);
const creationModeSchema = z.enum(['manual', 'date_range', 'activity_selection', 'active']);
const dayDateSchema = z.iso.date();
const tripDateSchema = z
  .union([z.iso.datetime({ offset: true }), z.iso.datetime({ local: true }), dayDateSchema])
  .transform((value) => new Date(value));

/**
 * User validation schemas
 */
export const userSchemas = {
  create: z.object({
    stravaId: z.string().min(1).max(50).optional(),
    email: z.email(),
    firstName: z.string().min(1).max(100).optional(),
    lastName: z.string().min(1).max(100).optional(),
    profilePicture: z.url().optional().nullable(),
    isActive: z.boolean().default(true),
    metadata: z.record(z.string(), z.unknown()).optional(),
  }),

  update: z.object({
    email: z.email().optional(),
    firstName: z.string().min(1).max(100).optional(),
    lastName: z.string().min(1).max(100).optional(),
    profilePicture: z.url().optional().nullable(),
    isActive: z.boolean().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  }),

  tokenUpdate: z.object({
    accessToken: z.string().optional(),
    refreshToken: z.string().optional(),
    tokenExpiresAt: z.date().optional(),
  }),
};

/**
 * Activity validation schemas
 */
export const activitySchemas = {
  create: z.object({
    stravaId: z.string().min(1).max(50),
    userId: z.uuid(),
    name: z.string().min(1).max(255),
    type: z.string().min(1).max(50),
    distance: z.number().nonnegative().optional(),
    movingTime: z.number().int().nonnegative().optional(),
    elapsedTime: z.number().int().nonnegative().optional(),
    totalElevationGain: z.number().nonnegative().optional(),
    startDate: z.date(),
    startLatitude: z.number().min(-90).max(90).optional().nullable(),
    startLongitude: z.number().min(-180).max(180).optional().nullable(),
    averageSpeed: z.number().nonnegative().optional(),
    maxSpeed: z.number().nonnegative().optional(),
    averageHeartrate: z.number().int().positive().optional(),
    maxHeartrate: z.number().int().positive().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  }),

  update: z.object({
    name: z.string().min(1).max(255).optional(),
    type: z.string().min(1).max(50).optional(),
    distance: z.number().nonnegative().optional(),
    movingTime: z.number().int().nonnegative().optional(),
    elapsedTime: z.number().int().nonnegative().optional(),
    totalElevationGain: z.number().nonnegative().optional(),
    startDate: z.date().optional(),
    startLatitude: z.number().min(-90).max(90).optional().nullable(),
    startLongitude: z.number().min(-180).max(180).optional().nullable(),
    averageSpeed: z.number().nonnegative().optional(),
    maxSpeed: z.number().nonnegative().optional(),
    averageHeartrate: z.number().int().positive().optional(),
    maxHeartrate: z.number().int().positive().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  }),

  filters: z.object({
    userId: z.uuid().optional(),
    type: z.string().max(50).optional(),
    startDateFrom: z.date().optional(),
    startDateTo: z.date().optional(),
    minDistance: z.number().nonnegative().optional(),
    maxDistance: z.number().nonnegative().optional(),
  }),
};

export const tripSchemas = {
  create: z
    .object({
      creationMode: creationModeSchema,
      title: z.string().min(1).max(255),
      description: z.string().max(5000).optional().nullable(),
      status: tripStatusSchema.optional(),
      startDate: tripDateSchema.optional().nullable(),
      endDate: tripDateSchema.optional().nullable(),
      coverActivityId: z.uuid().optional().nullable(),
      metadata: z.record(z.string(), z.unknown()).optional().nullable(),
      activityIds: z.array(z.uuid()).optional(),
      rangeStart: dayDateSchema.optional(),
      rangeEnd: dayDateSchema.optional(),
      allowEmptyRange: z.boolean().optional(),
    })
    .superRefine((value, ctx) => {
      if (
        value.creationMode === 'activity_selection' &&
        (!value.activityIds || value.activityIds.length === 0)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'activityIds are required when creationMode is activity_selection',
          path: ['activityIds'],
        });
      }

      if (value.creationMode === 'date_range') {
        if (!value.rangeStart) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'rangeStart is required when creationMode is date_range',
            path: ['rangeStart'],
          });
        }
        if (!value.rangeEnd) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'rangeEnd is required when creationMode is date_range',
            path: ['rangeEnd'],
          });
        }
      }
    }),

  update: z.object({
    title: z.string().min(1).max(255).optional(),
    description: z.string().max(5000).optional().nullable(),
    status: tripStatusSchema.optional(),
    startDate: tripDateSchema.optional().nullable(),
    endDate: tripDateSchema.optional().nullable(),
    coverActivityId: z.uuid().optional().nullable(),
    metadata: z.record(z.string(), z.unknown()).optional().nullable(),
  }),

  listFilters: z.object({
    status: tripStatusSchema.optional(),
  }),

  attachActivities: z.object({
    activityIds: z.array(z.uuid()).min(1),
  }),

  upsertDay: z.object({
    title: z.string().min(1).max(255).optional().nullable(),
    summary: z.string().min(1).max(500).optional().nullable(),
    note: z.string().max(20000).optional().nullable(),
  }),
};

/**
 * Pagination validation schema
 */
export const paginationSchema = z.object({
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
  activeOnly: z.boolean().default(false),
});

/**
 * Type exports for use in application
 */
export type UserCreateInput = z.infer<typeof userSchemas.create>;
export type UserUpdateInput = z.infer<typeof userSchemas.update>;
export type UserTokenUpdateInput = z.infer<typeof userSchemas.tokenUpdate>;
export type ActivityCreateInput = z.infer<typeof activitySchemas.create>;
export type ActivityUpdateInput = z.infer<typeof activitySchemas.update>;
export type ActivityFilters = z.infer<typeof activitySchemas.filters>;
export type TripCreateInput = z.infer<typeof tripSchemas.create>;
export type TripUpdateInput = z.infer<typeof tripSchemas.update>;
export type TripListFilters = z.infer<typeof tripSchemas.listFilters>;
export type TripAttachActivitiesInput = z.infer<typeof tripSchemas.attachActivities>;
export type TripUpsertDayInput = z.infer<typeof tripSchemas.upsertDay>;
export type PaginationParams = z.infer<typeof paginationSchema>;
