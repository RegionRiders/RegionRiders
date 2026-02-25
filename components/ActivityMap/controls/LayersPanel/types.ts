import { RGBA } from '@/components/ActivityMap/mapTypes';

export type RegionRenderMode = 'heatmap' | 'static';
export type ActivityRenderMode = 'heatmap' | 'lines';

export interface ColorSwatch {
  normal: RGBA;
  hover: RGBA;
}

export interface MapSettings {
  // Activity settings
  activityMode: ActivityRenderMode;
  showActivities: boolean;
  activityThickness: number;
  heatmapDensity: number;
  lineColorSwatches: ColorSwatch[];
  selectedLineSwatchIndex: number;

  // Region settings
  regionMode: RegionRenderMode;
  showRegions: boolean;
  regionBorderThickness: number;

  // Map settings
  tileLayerUrl: string;
  attribution: string;
}

export interface LayersPanelProps {
  settings: MapSettings;
  onSettingChange: <K extends keyof MapSettings>(key: K, value: MapSettings[K]) => void;
  placeholderImageUrl?: string;
}
