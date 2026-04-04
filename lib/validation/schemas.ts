/**
 * Validation Schemas
 * Zod schemas for input validation across the application
 */

import { z } from 'zod';

const rgbaSchema = z.tuple([
  z.number().min(0).max(255),
  z.number().min(0).max(255),
  z.number().min(0).max(255),
  z.number().min(0).max(1),
]);
const colorThresholdSchema = z.object({
  threshold: z.number(),
  color: rgbaSchema,
});
const lineColorSwatchSchema = z.object({
  normal: rgbaSchema,
  hover: rgbaSchema,
});
const mapSettingsSchema = z
  .object({
    activityMode: z.enum(['heatmap', 'lines']).optional(),
    showActivities: z.boolean().optional(),
    activityLayerTransparency: z.number().min(0).max(1).optional(),
    activityThickness: z.number().min(0).max(100).optional(),
    heatmapDensity: z.number().min(0).max(10).optional(),
    activityHeatmapSmoothEdges: z.boolean().optional(),
    lineColorSwatches: z.array(lineColorSwatchSchema).optional(),
    selectedLineSwatchIndex: z.number().int().min(0).optional(),
    activityHeatmapColorSwatches: z.array(z.array(colorThresholdSchema)).optional(),
    selectedActivityHeatmapSwatchIndex: z.number().int().min(0).optional(),
    regionMode: z.enum(['heatmap', 'static']).optional(),
    showRegions: z.boolean().optional(),
    regionTransparency: z.number().min(0).max(1).optional(),
    regionBorderThickness: z.number().min(0).max(100).optional(),
    regionStaticColorSwatches: z.array(z.array(colorThresholdSchema)).optional(),
    selectedRegionStaticSwatchIndex: z.number().int().min(0).optional(),
    regionHeatmapColorSwatches: z.array(z.array(colorThresholdSchema)).optional(),
    selectedRegionHeatmapSwatchIndex: z.number().int().min(0).optional(),
    tileLayerUrl: z.string().optional(),
    attribution: z.string().optional(),
    overlayTileLayerUrl: z.string().optional(),
    overlayAttribution: z.string().optional(),
    mapSourceMonochrome: z.boolean().optional(),
    mapOverlayMonochrome: z.boolean().optional(),
    mapTintSwatches: z.array(rgbaSchema).optional(),
    selectedMapTintSwatchIndex: z.number().int().min(0).optional(),
  })
  .refine(
    (data) =>
      data.selectedLineSwatchIndex == null ||
      data.lineColorSwatches == null ||
      data.selectedLineSwatchIndex < data.lineColorSwatches.length,
    {
      message: 'selectedLineSwatchIndex must be within lineColorSwatches bounds',
      path: ['selectedLineSwatchIndex'],
    }
  )
  .refine(
    (data) =>
      data.selectedActivityHeatmapSwatchIndex == null ||
      data.activityHeatmapColorSwatches == null ||
      data.selectedActivityHeatmapSwatchIndex < data.activityHeatmapColorSwatches.length,
    {
      message:
        'selectedActivityHeatmapSwatchIndex must be within activityHeatmapColorSwatches bounds',
      path: ['selectedActivityHeatmapSwatchIndex'],
    }
  )
  .refine(
    (data) =>
      data.selectedRegionStaticSwatchIndex == null ||
      data.regionStaticColorSwatches == null ||
      data.selectedRegionStaticSwatchIndex < data.regionStaticColorSwatches.length,
    {
      message: 'selectedRegionStaticSwatchIndex must be within regionStaticColorSwatches bounds',
      path: ['selectedRegionStaticSwatchIndex'],
    }
  )
  .refine(
    (data) =>
      data.selectedRegionHeatmapSwatchIndex == null ||
      data.regionHeatmapColorSwatches == null ||
      data.selectedRegionHeatmapSwatchIndex < data.regionHeatmapColorSwatches.length,
    {
      message: 'selectedRegionHeatmapSwatchIndex must be within regionHeatmapColorSwatches bounds',
      path: ['selectedRegionHeatmapSwatchIndex'],
    }
  )
  .refine(
    (data) =>
      data.selectedMapTintSwatchIndex == null ||
      data.mapTintSwatches == null ||
      data.selectedMapTintSwatchIndex < data.mapTintSwatches.length,
    {
      message: 'selectedMapTintSwatchIndex must be within mapTintSwatches bounds',
      path: ['selectedMapTintSwatchIndex'],
    }
  );

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
  }),

  update: z.object({
    email: z.email().optional(),
    firstName: z.string().min(1).max(100).optional(),
    lastName: z.string().min(1).max(100).optional(),
    profilePicture: z.url().optional().nullable(),
    isActive: z.boolean().optional(),
  }),

  tokenUpdate: z.object({
    accessToken: z.string().optional(),
    refreshToken: z.string().optional(),
    tokenExpiresAt: z.date().optional(),
  }),
};

/**
 * User settings validation schemas
 */
export const userSettingsSchemas = {
  create: z.object({
    userId: z.uuid(),
    settings: mapSettingsSchema.optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  }),

  update: z.object({
    settings: mapSettingsSchema.optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
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
  activeOnly: z.boolean().default(false),
});

/**
 * Type exports for use in application
 */
export type UserCreateInput = z.infer<typeof userSchemas.create>;
export type UserUpdateInput = z.infer<typeof userSchemas.update>;
export type UserTokenUpdateInput = z.infer<typeof userSchemas.tokenUpdate>;
export type UserSettingsCreateInput = z.infer<typeof userSettingsSchemas.create>;
export type UserSettingsUpdateInput = z.infer<typeof userSettingsSchemas.update>;
export type ActivityCreateInput = z.infer<typeof activitySchemas.create>;
export type ActivityUpdateInput = z.infer<typeof activitySchemas.update>;
export type ActivityFilters = z.infer<typeof activitySchemas.filters>;
export type PaginationParams = z.infer<typeof paginationSchema>;
