import { ACTIVITY_HEATMAP_COLOR_THRESHOLDS } from '@/components/ActivityMap/config/mapConfig';
import { ColorThreshold, RGBA } from '@/components/ActivityMap/mapTypes';
import { getColorFromThresholds } from '@/components/ActivityMap/utils/colorInterpolation';

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
  unusedZoomLevel: number = 10,
  lineThickness: number = 1,
  thresholds: ColorThreshold[] = ACTIVITY_HEATMAP_COLOR_THRESHOLDS
): RGBA {
  // Keep color mapping stable across zoom and line thickness.
  // Each draw step stamps a circular brush, so center pixel intensity scales with brush diameter.
  const normalizedThickness = Math.max(1, Math.round(lineThickness));
  const normalizationFactor = normalizedThickness * 2 + 1;
  const clampedCount = Math.max(0, count);
  const uniqueActivities = clampedCount / normalizationFactor;
  void unusedZoomLevel;

  const color = getColorFromThresholds(uniqueActivities, thresholds);

  // Ensure we always return RGBA
  if (color.length === 3) {
    return [...color, 255] as RGBA;
  }

  return color as RGBA;
}
