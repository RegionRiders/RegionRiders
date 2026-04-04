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
  zoomLevel: number = 10,
  lineThickness: number = 1,
  thresholds: ColorThreshold[] = ACTIVITY_HEATMAP_COLOR_THRESHOLDS
): RGBA {
  // Keep color mapping stable across line thickness and zoom for the same geographic overlap density.
  // Leaflet projected pixel distances scale by 2^zoom, so accumulator counts for the same geometry scale
  // proportionally with 2^(zoom - referenceZoom).
  const referenceZoom = 10;
  const zoomScale = 2 ** (zoomLevel - referenceZoom);
  const normalizedThickness = Math.max(1, Math.round(lineThickness));
  // Accumulator brush spans [-radius, +radius] around sampled line points, so center overlap intensity
  // scales with brush diameter in pixels (2r + 1) for equivalent track density.
  const thicknessScale = normalizedThickness * 2 + 1;
  const clampedCount = Math.max(0, count);
  const uniqueActivities = clampedCount / (thicknessScale * zoomScale);

  const color = getColorFromThresholds(uniqueActivities, thresholds);

  // Ensure we always return RGBA
  if (color.length === 3) {
    return [...color, 255] as RGBA;
  }

  return color as RGBA;
}
