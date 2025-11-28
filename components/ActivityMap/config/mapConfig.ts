import { ColorThreshold } from '../types';


export const MAP_CONFIG = {
  HEATMAP_RENDER_DELAY: 0,
  PIXEL_DENSITY: 1,
  LINE_THICKNESS: 2,
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
  { threshold: 1, color: [34, 197, 94, 55] }, // green
  { threshold: 2, color: [234, 179, 8, 55] }, // yellow
  { threshold: 5, color: [249, 115, 22, 55] }, // orange
  { threshold: 10, color: [220, 38, 38, 55] }, // red
  { threshold: 20, color: [255, 255, 255, 55] }, // white
];
