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
  // Lower zoom compresses many geographic paths into fewer pixels (raising raw pixel counts), so zoom scaling
  // must reduce normalized intensity at low zoom and increase it at high zoom.
  const referenceZoom = 10;
  const zoomScale = 2 ** (zoomLevel - referenceZoom);
  const normalizedThickness = Math.max(1, Math.round(lineThickness));

  // Accumulator brush spans [-radius, +radius] around sampled line points, so center overlap intensity
  // scales with brush diameter in pixels (2r + 1) for equivalent track density.
  const thicknessScale = normalizedThickness * 2 + 1;

  // `count` is raw pixel hit accumulation, not a 1:1 activity count.
  // A single activity can contribute multiple hits to the same pixel
  // (line rasterization, thickness, and overlap), which inflates values.
  // Divide by 10 to normalize this inflation so threshold-based coloring
  // reflects perceived density more consistently across typical views.
  const clampedCount = Math.max(0, count / 10);
  const uniqueActivities = (clampedCount * zoomScale) / thicknessScale;

  const color = getColorFromThresholds(uniqueActivities, thresholds);

  // Ensure we always return RGBA
  if (color.length === 3) {
    return [...color, 255] as RGBA;
  }

  return color as RGBA;
}
