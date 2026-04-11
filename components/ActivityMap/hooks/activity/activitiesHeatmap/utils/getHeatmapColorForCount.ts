import { ACTIVITY_HEATMAP_COLOR_THRESHOLDS } from '@/components/ActivityMap/config/mapConfig';
import { getActivityLinePixelWidthFromControl } from '@/components/ActivityMap/hooks/activity/utils/activityThickness';
import { ColorThreshold, RGBA } from '@/components/ActivityMap/mapTypes';
import { getColorFromThresholds } from '@/components/ActivityMap/utils/colorInterpolation';

/**
 * Maps accumulator count to heatmap color with smooth gradients and opacity.
 * Accounts for line thickness control value to normalize unique activity count.
 *
 * @param count - Pixel accumulator value
 * @param zoomLevel - Current map zoom level
 * @param lineThickness - Line thickness control value where 1 -> radius 0 (single pixel)
 * @param thresholds - Optional custom color thresholds (defaults to COLOR_THRESHOLDS)
 * @returns RGBA tuple [r, g, b, a] where r/g/b are 0-255 and a is 0-1
 */
export function getHeatmapColorForCount(
  count: number,
  zoomLevel: number = 10,
  lineThickness: number = 1,
  thresholds: ColorThreshold[] = ACTIVITY_HEATMAP_COLOR_THRESHOLDS
): RGBA {
  // Keep color mapping stable across line thickness and zoom for the same geographic overlap density.
  // Lower zoom compresses many geographic paths into fewer pixels (raising raw pixel counts), so zoom scaling
  // attenuates normalized intensity at low zoom; above the reference zoom we apply the configured 2x boost.
  const referenceZoom = 13;
  const zoomScale = zoomLevel <= referenceZoom ? 2 ** (zoomLevel - referenceZoom) : 2;
  // Keep normalization aligned with the rendered brush footprint (1 -> radius 0 -> width 1).
  const thicknessScale = getActivityLinePixelWidthFromControl(lineThickness);

  const clampedCount = Math.max(0, count);
  const uniqueActivities = (clampedCount * zoomScale) / thicknessScale;

  const color = getColorFromThresholds(uniqueActivities, thresholds);

  // Ensure we always return RGBA
  if (color.length === 3) {
    return [...color, 255] as RGBA;
  }

  return color as RGBA;
}
