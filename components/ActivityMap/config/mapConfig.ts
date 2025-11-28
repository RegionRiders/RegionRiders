import { ColorThreshold } from '../types';


export const MAP_CONFIG = {
  HEATMAP_RENDER_DELAY: 0,
  PIXEL_DENSITY: 1,
  ACTIVITY_LINE_THICKNESS: 2,
  REGION_LINE_THICKNESS: 3,
} as const;

export const ACTIVITY_HEATMAP_COLOR_THRESHOLDS: ColorThreshold[] = [
  { threshold: 1, color: [139, 0, 0, 255] }, // dark red
  { threshold: 2, color: [220, 20, 20, 255] }, // red
  { threshold: 10, color: [255, 100, 0, 255] }, // orange-red
  { threshold: 25, color: [255, 165, 0, 255] }, // orange
  { threshold: 50, color: [255, 255, 0, 255] }, // yellow
  { threshold: 150, color: [255, 255, 255, 255] }, // white
];

export const REGION_VISIT_COLOR_THRESHOLDS: ColorThreshold[] = [
  { threshold: 0, color: [60, 60, 60, 0] }, // transparent
  { threshold: 1, color: [220, 20, 20, 0.1] }, // red
  { threshold: 5, color: [255, 165, 0, 0.1] }, // orange
  { threshold: 10, color: [255, 255, 0, 0.1] }, // yellow
  { threshold: 25, color: [255, 255, 255, 0.1] }, // white
];
