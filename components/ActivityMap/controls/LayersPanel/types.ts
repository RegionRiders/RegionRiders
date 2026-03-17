import type L from 'leaflet';
import { ColorThreshold, RGBA } from '@/components/ActivityMap/mapTypes';

export type RegionRenderMode = 'heatmap' | 'static';
export type ActivityRenderMode = 'heatmap' | 'lines';

export interface LineColorSwatch {
  normal: RGBA;
  hover: RGBA;
}

export interface MapSettings {
  // Activity settings
  activityMode: ActivityRenderMode;
  showActivities: boolean;
  activityThickness: number;
  heatmapDensity: number;
  lineColorSwatches: LineColorSwatch[];
  selectedLineSwatchIndex: number;
  activityHeatmapColorSwatches?: ColorThreshold[][];
  selectedActivityHeatmapSwatchIndex?: number;

  // Region settings
  regionMode: RegionRenderMode;
  showRegions: boolean;
  regionBorderThickness: number;
  regionStaticColorSwatches: ColorThreshold[][];
  selectedRegionStaticSwatchIndex: number;
  regionHeatmapColorSwatches?: ColorThreshold[][];
  selectedRegionHeatmapSwatchIndex?: number;

  // Map settings
  tileLayerUrl: string;
  attribution: string;
  overlayTileLayerUrl?: string;
  overlayAttribution?: string;
  monochromeMap?: boolean;
  mapTintSwatches?: RGBA[];
  selectedMapTintSwatchIndex?: number;
}

export interface LayersPanelProps {
  settings: MapSettings;
  onSettingChange: <K extends keyof MapSettings>(key: K, value: MapSettings[K]) => void;
  map?: L.Map | null;
  placeholderImageUrl?: string;
}
