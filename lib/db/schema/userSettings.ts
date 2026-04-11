import { index, jsonb, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './users';

export type UserSettingsRgba = [number, number, number, number];

export interface UserSettingsColorThreshold {
  threshold: number;
  color: UserSettingsRgba;
}

export interface UserSettingsLineColorSwatch {
  normal: UserSettingsRgba;
  hover: UserSettingsRgba;
}

export interface UserMapSettings {
  activityMode?: 'heatmap' | 'lines';
  showActivities?: boolean;
  activityLayerTransparency?: number;
  activityThickness?: number;
  heatmapDensity?: number;
  lineColorSwatches?: UserSettingsLineColorSwatch[];
  selectedLineSwatchIndex?: number;
  activityHeatmapColorSwatches?: UserSettingsColorThreshold[][];
  selectedActivityHeatmapSwatchIndex?: number;
  regionMode?: 'heatmap' | 'static';
  showRegions?: boolean;
  regionLayerTransparency?: number;
  regionBorderThickness?: number;
  regionStaticColorSwatches?: UserSettingsColorThreshold[][];
  selectedRegionStaticSwatchIndex?: number;
  regionHeatmapColorSwatches?: UserSettingsColorThreshold[][];
  selectedRegionHeatmapSwatchIndex?: number;
  tileLayerUrl?: string;
  attribution?: string;
  overlayTileLayerUrl?: string;
  overlayAttribution?: string;
  mapSourceMonochrome?: boolean;
  mapOverlayMonochrome?: boolean;
  mapTintSwatches?: UserSettingsRgba[];
  selectedMapTintSwatchIndex?: number;
}

export const userSettings = pgTable(
  'user_settings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull()
      .unique(),
    settings: jsonb('settings').$type<Partial<UserMapSettings>>(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('user_settings_user_id_idx').on(table.userId)]
);

export type UserSettings = typeof userSettings.$inferSelect;
export type NewUserSettings = typeof userSettings.$inferInsert;
export type UserSettingsUpdate = Partial<Omit<UserSettings, 'id' | 'userId' | 'createdAt'>>;
