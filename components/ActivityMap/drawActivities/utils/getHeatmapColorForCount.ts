import { getColorFromThresholds } from '@/components/ActivityMap/utils/colorInterpolation';

export const COLOR_THRESHOLDS = [
  { threshold: 1, color: [139, 0, 0] }, // dark red
  { threshold: 2, color: [220, 20, 20] }, // red
  { threshold: 10, color: [255, 100, 0] }, // orange-red
  { threshold: 25, color: [255, 165, 0] }, // orange
  { threshold: 50, color: [255, 255, 0] }, // yellow
  { threshold: 150, color: [255, 255, 255] }, // white
];

/**
 * Maps accumulator count to heatmap color with smooth gradients
 * Accounts for line thickness to normalize unique activity count
 * @param count - Pixel accumulator value
 * @param zoomLevel - Current map zoom level
 * @param lineThickness - Thickness of drawn lines
 * @param thresholds - Optional custom color thresholds (defaults to COLOR_THRESHOLDS)
 * @returns RGB tuple [r, g, b]
 */
export function getHeatmapColorForCount(
  count: number,
  zoomLevel: number = 10,
  lineThickness: number = 1,
  thresholds: Array<{ threshold: number; color: number[] }> = COLOR_THRESHOLDS
): number[] {
  // Normalize for line thickness (both sides of the line)
  const uniqueActivities = (count / (lineThickness * 2)) * (zoomLevel / 10);

  return getColorFromThresholds(uniqueActivities, thresholds);
}
