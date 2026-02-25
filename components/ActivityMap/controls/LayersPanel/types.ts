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

  // Region settings
  regionMode: RegionRenderMode;
  showRegions: boolean;
  regionBorderThickness: number;
  regionStaticColorSwatches: ColorThreshold[][];
  selectedRegionStaticSwatchIndex: number;

  // Map settings
  tileLayerUrl: string;
  attribution: string;
}

export interface LayersPanelProps {
  settings: MapSettings;
  onSettingChange: <K extends keyof MapSettings>(key: K, value: MapSettings[K]) => void;
  placeholderImageUrl?: string;
}
