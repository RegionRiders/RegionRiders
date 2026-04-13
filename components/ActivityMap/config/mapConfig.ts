import { MapSettings } from '@/components/ActivityMap/controls/LayersPanel/types';
import { ColorThreshold, LeafletConfig, RGBA } from '../mapTypes';
import { TILE_PRESETS } from './tilePresets';

export const DEFAULT_ACTIVITY_LINE_COLOR_SWATCHES: MapSettings['lineColorSwatches'] = [
  {
    normal: [255, 0, 0, 0.5],
    hover: [255, 100, 100, 0.7],
  },
  {
    normal: [255, 255, 0, 0.5],
    hover: [255, 255, 100, 0.7],
  },
  {
    normal: [0, 255, 0, 0.5],
    hover: [100, 255, 100, 0.7],
  },
  {
    normal: [0, 255, 255, 0.5],
    hover: [100, 255, 255, 0.7],
  },
  {
    normal: [0, 0, 255, 0.5],
    hover: [100, 100, 255, 0.7],
  },
];

export const DEFAULT_ACTIVITY_HEATMAP_COLOR_SWATCHES: ColorThreshold[][] = [
  [
    { threshold: 1, color: [139, 0, 0, 1] },
    { threshold: 2, color: [220, 20, 20, 1] },
    { threshold: 10, color: [255, 100, 0, 1] },
    { threshold: 25, color: [255, 165, 0, 1] },
    { threshold: 50, color: [255, 255, 0, 1] },
    { threshold: 150, color: [255, 255, 255, 1] },
  ],
  [
    { threshold: 1, color: [0, 0, 80, 1] },
    { threshold: 2, color: [0, 0, 160, 1] },
    { threshold: 10, color: [0, 80, 220, 1] },
    { threshold: 25, color: [0, 180, 255, 1] },
    { threshold: 50, color: [150, 235, 255, 1] },
    { threshold: 150, color: [240, 250, 255, 1] },
  ],
  [
    { threshold: 1, color: [0, 80, 0, 1] },
    { threshold: 2, color: [0, 140, 0, 1] },
    { threshold: 10, color: [80, 200, 0, 1] },
    { threshold: 25, color: [160, 230, 0, 1] },
    { threshold: 50, color: [220, 255, 0, 1] },
    { threshold: 150, color: [255, 255, 220, 1] },
  ],
  [
    { threshold: 1, color: [65, 0, 110, 1] },
    { threshold: 2, color: [120, 0, 190, 1] },
    { threshold: 10, color: [170, 55, 230, 1] },
    { threshold: 25, color: [220, 140, 255, 1] },
    { threshold: 50, color: [245, 210, 255, 1] },
    { threshold: 150, color: [255, 245, 255, 1] },
  ],
  [
    { threshold: 1, color: [0, 70, 70, 1] },
    { threshold: 2, color: [0, 125, 125, 1] },
    { threshold: 10, color: [0, 180, 180, 1] },
    { threshold: 25, color: [60, 220, 220, 1] },
    { threshold: 50, color: [160, 245, 245, 1] },
    { threshold: 150, color: [235, 255, 255, 1] },
  ],
];

export const DEFAULT_REGION_STATIC_COLOR_SWATCHES: ColorThreshold[][] = [
  [
    { threshold: 0, color: [60, 60, 60, 0.08] },
    { threshold: 1, color: [76, 107, 34, 0.2] },
  ],
  [
    { threshold: 0, color: [70, 70, 70, 0.08] },
    { threshold: 1, color: [25, 102, 66, 0.2] },
  ],
  [
    { threshold: 0, color: [80, 80, 80, 0.08] },
    { threshold: 1, color: [38, 88, 140, 0.2] },
  ],
  [
    { threshold: 0, color: [90, 90, 90, 0.08] },
    { threshold: 1, color: [124, 73, 31, 0.2] },
  ],
  [
    { threshold: 0, color: [100, 100, 100, 0.08] },
    { threshold: 1, color: [110, 51, 121, 0.2] },
  ],
];

export const DEFAULT_REGION_HEATMAP_COLOR_SWATCHES: ColorThreshold[][] = [
  [
    { threshold: 0, color: [60, 60, 60, 0.08] },
    { threshold: 1, color: [220, 20, 20, 0.1] },
    { threshold: 5, color: [255, 165, 0, 0.1] },
    { threshold: 10, color: [255, 255, 0, 0.1] },
    { threshold: 25, color: [255, 255, 255, 0.1] },
  ],
  [
    { threshold: 0, color: [60, 60, 60, 0.08] },
    { threshold: 1, color: [20, 120, 220, 0.1] },
    { threshold: 5, color: [70, 170, 255, 0.1] },
    { threshold: 10, color: [150, 220, 255, 0.1] },
    { threshold: 25, color: [235, 250, 255, 0.1] },
  ],
  [
    { threshold: 0, color: [60, 60, 60, 0.08] },
    { threshold: 1, color: [40, 150, 60, 0.1] },
    { threshold: 5, color: [120, 200, 60, 0.1] },
    { threshold: 10, color: [190, 230, 80, 0.1] },
    { threshold: 25, color: [245, 255, 220, 0.1] },
  ],
  [
    { threshold: 0, color: [60, 60, 60, 0.08] },
    { threshold: 1, color: [150, 60, 200, 0.1] },
    { threshold: 5, color: [190, 100, 235, 0.1] },
    { threshold: 10, color: [220, 150, 250, 0.1] },
    { threshold: 25, color: [245, 225, 255, 0.1] },
  ],
  [
    { threshold: 0, color: [60, 60, 60, 0.08] },
    { threshold: 1, color: [220, 90, 40, 0.1] },
    { threshold: 5, color: [240, 150, 70, 0.1] },
    { threshold: 10, color: [255, 200, 120, 0.1] },
    { threshold: 25, color: [255, 240, 220, 0.1] },
  ],
];

export const DEFAULT_MAP_TINT_SWATCHES: RGBA[] = [
  [0, 0, 0, 0],
  [70, 70, 70, 0.18],
  [210, 70, 70, 0.16],
  [80, 80, 170, 0.16],
  [255, 200, 90, 0.14],
];

export const DEFAULT_MAP_SETTINGS: MapSettings = {
  activityMode: 'lines',
  showActivities: true,
  activityThickness: 2,
  activityLayerTransparency: 1,
  lineColorSwatches: DEFAULT_ACTIVITY_LINE_COLOR_SWATCHES,
  selectedLineSwatchIndex: 0,
  activityHeatmapColorSwatches: DEFAULT_ACTIVITY_HEATMAP_COLOR_SWATCHES,
  selectedActivityHeatmapSwatchIndex: 0,
  heatmapDensity: 0.75,
  regionMode: 'static',
  showRegions: true,
  regionBorderThickness: 2,
  regionLayerTransparency: 1,
  regionStaticColorSwatches: DEFAULT_REGION_STATIC_COLOR_SWATCHES,
  selectedRegionStaticSwatchIndex: 0,
  regionHeatmapColorSwatches: DEFAULT_REGION_HEATMAP_COLOR_SWATCHES,
  selectedRegionHeatmapSwatchIndex: 0,
  tileLayerUrl: TILE_PRESETS.standard.url,
  attribution: TILE_PRESETS.standard.attribution,
  overlayTileLayerUrl: TILE_PRESETS.none.url,
  overlayAttribution: TILE_PRESETS.none.attribution,
  mapSourceMonochrome: true,
  mapOverlayMonochrome: false,
  mapTintSwatches: DEFAULT_MAP_TINT_SWATCHES,
  selectedMapTintSwatchIndex: 0,
};

export const DEFAULT_LEAFLET_CONFIG: LeafletConfig = {
  center: [54.352375, 18.656686], // Skrót Pluty - Gdańsk, Poland
  zoom: 11,
  maxZoom: 18,
  minZoom: 3,
  tileLayerUrl: DEFAULT_MAP_SETTINGS.tileLayerUrl,
  attribution: DEFAULT_MAP_SETTINGS.attribution,
  overlayTileLayerUrl: DEFAULT_MAP_SETTINGS.overlayTileLayerUrl,
  overlayAttribution: DEFAULT_MAP_SETTINGS.overlayAttribution,
  mapSourceMonochrome: DEFAULT_MAP_SETTINGS.mapSourceMonochrome,
  mapOverlayMonochrome: DEFAULT_MAP_SETTINGS.mapOverlayMonochrome,
};

export const ACTIVITY_HEATMAP_COLOR_THRESHOLDS: ColorThreshold[] =
  DEFAULT_ACTIVITY_HEATMAP_COLOR_SWATCHES[0];

export const REGION_VISIT_HEATMAP_COLOR_THRESHOLDS: ColorThreshold[] =
  DEFAULT_REGION_HEATMAP_COLOR_SWATCHES[0];

export const REGION_VISIT_STATIC_COLOR_THRESHOLDS: ColorThreshold[] =
  DEFAULT_REGION_STATIC_COLOR_SWATCHES[0];
