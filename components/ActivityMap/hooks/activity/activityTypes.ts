import { ColorThreshold, RGBA } from '@/components/ActivityMap/mapTypes';

export interface ActivityHeatmapOptions {
  heatmapDensity: number;
  lineThickness: number;
  layerTransparency: number;
  heatmapColorThresholds?: ColorThreshold[];
}

export interface ActivityLinesOptions {
  lineThickness: number;
  lineColor: RGBA;
  lineHoverColor: RGBA;
  layerTransparency: number;
}
