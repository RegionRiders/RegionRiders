/**
 * Validation Schemas
 * Zod schemas for input validation across the application
 */

import { z } from 'zod';

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

/**
 * Pagination validation schema
 */
export const paginationSchema = z.object({
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
  activeOnly: z.boolean().default(false).optional(),
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
export type PaginationParams = z.infer<typeof paginationSchema>;
