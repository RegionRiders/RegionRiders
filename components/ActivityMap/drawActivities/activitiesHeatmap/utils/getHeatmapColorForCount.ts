import { ACTIVITY_HEATMAP_COLOR_THRESHOLDS } from '@/components/ActivityMap/config/mapConfig';
import { getColorFromThresholds } from '@/components/ActivityMap/utils/colorInterpolation';
import {ColorThreshold} from "@/components/ActivityMap/drawActivities/types";

/**
 * Maps accumulator count to heatmap color with smooth gradients and opacity.
 * Accounts for line thickness to normalize unique activity count.
 *
 * @param count - Pixel accumulator value
 * @param zoomLevel - Current map zoom level
 * @param lineThickness - Thickness of drawn lines
 * @param thresholds - Optional custom color thresholds (defaults to COLOR_THRESHOLDS)
 * @returns RGBA tuple [r, g, b, a] where each value is 0-255
 */
export function getHeatmapColorForCount(
  count: number,
  zoomLevel: number = 10,
  lineThickness: number = 1,
  thresholds: ColorThreshold[] = ACTIVITY_HEATMAP_COLOR_THRESHOLDS
): number[] {
  // Normalize for line thickness (both sides of the line)
  const uniqueActivities = (count / (lineThickness * 2)) * (zoomLevel / 10);

  return getColorFromThresholds(uniqueActivities, thresholds);
}
