import { ACTIVITY_HEATMAP_COLOR_THRESHOLDS } from '@/components/ActivityMap/config/mapConfig';
import { ColorThreshold, RGBA } from '@/components/ActivityMap/mapTypes';
import { getColorFromThresholds } from '@/components/ActivityMap/utils/colorInterpolation';

/**
 * Maps accumulator count to heatmap color with smooth gradients and opacity.
 * Accounts for line thickness (UI diameter) to normalize unique activity count.
 *
 * @param count - Pixel accumulator value
 * @param zoomLevel - Current map zoom level
 * @param lineThickness - Brush diameter in pixels from UI settings
 * @param thresholds - Optional custom color thresholds (defaults to COLOR_THRESHOLDS)
 * @returns RGBA tuple [r, g, b, a] where each value is 0-255
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
  const normalizedThickness = Math.max(1, Math.round(lineThickness));

  // Accumulator brush spans [-radius, +radius] around sampled line points, so center overlap intensity
  // scales with brush diameter in pixels (2r + 1) for equivalent track density.
  const thicknessScale = normalizedThickness * 2 + 1;

  const clampedCount = Math.max(0, count);
  const uniqueActivities = (clampedCount * zoomScale) / thicknessScale;

  const color = getColorFromThresholds(uniqueActivities, thresholds);

  // Ensure we always return RGBA
  if (color.length === 3) {
    return [...color, 255] as RGBA;
  }

  return color as RGBA;
}
