/**
 * Canonical MapLibre source and layer IDs for RegionRiders.
 * Enforces deterministic Z-ordering across basemap, overlay, tint, regions, and activities.
 */
export const MAP_SOURCE_IDS = {
  BASEMAP: 'rr-basemap-source',
  OVERLAY: 'rr-overlay-source',
  REGIONS: 'rr-regions-source',
  ACTIVITIES_LINES: 'rr-activities-lines-source',
} as const;

export const MAP_LAYER_IDS = {
  BASEMAP_RASTER: 'rr-basemap-raster',
  OVERLAY_RASTER: 'rr-overlay-raster',
  MAP_TINT: 'rr-map-tint',
  REGIONS_FILL: 'rr-regions-fill',
  REGIONS_LINE: 'rr-regions-line',
  ACTIVITIES_HEATMAP: 'rr-activities-heatmap',
  ACTIVITIES_LINES: 'rr-activities-lines',
} as const;
