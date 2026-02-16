export type RegionRenderMode = 'heatmap' | 'static';
export type ActivityRenderMode = 'heatmap' | 'lines';

export interface MapSettings {
  // Activity settings
  activityMode: ActivityRenderMode;
  showHeatmap: boolean;
  activityThickness: number;
  heatmapDensity: number;

  // Region settings
  regionMode: RegionRenderMode;
  showBorders: boolean;
  regionBorderThickness: number;
}

export interface LayersPanelProps {
  settings: MapSettings;
  onSettingChange: <K extends keyof MapSettings>(key: K, value: MapSettings[K]) => void;
  placeholderImageUrl?: string;
}
