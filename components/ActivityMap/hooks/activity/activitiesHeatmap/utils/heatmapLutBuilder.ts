import { ACTIVITY_HEATMAP_COLOR_THRESHOLDS } from '@/components/ActivityMap/config/mapConfig';
import { getActivityLineRadiusFromControl } from '@/components/ActivityMap/hooks/activity/utils/activityThickness';
import { ColorThreshold } from '@/components/ActivityMap/mapTypes';
import { getColorFromThresholds } from '@/components/ActivityMap/utils/colorInterpolation';

export const HEATMAP_LUT_SIZE = 512;

export interface HeatmapLutData {
  /** RGBA8 texels (HEATMAP_LUT_SIZE * 4 bytes) */
  data: Uint8Array;
  width: number;
  maxThreshold: number;
}

/**
 * Returns the CSS-pixel brush radius for a given activity thickness control value (1..10).
 */
export function getHeatmapBrushRadiusCssPx(lineThickness: number): number {
  return Math.max(0.85, getActivityLineRadiusFromControl(lineThickness) + 0.75);
}

/**
 * Builds a 512x1 RGBA8 logarithmic Color LUT texture from user-configured ColorThresholds.
 * Logarithmic mapping preserves crisp transitions at low overlap counts (1..2 rides)
 * while maintaining smooth gradients up to maxThreshold (e.g. 150+ rides).
 */
export function buildHeatmapColorLut(thresholds?: ColorThreshold[]): HeatmapLutData {
  const effectiveThresholds =
    thresholds && thresholds.length > 0 ? thresholds : ACTIVITY_HEATMAP_COLOR_THRESHOLDS;

  const sorted = [...effectiveThresholds].sort((a, b) => a.threshold - b.threshold);
  const maxThreshold = Math.max(1, sorted[sorted.length - 1]?.threshold ?? 150);
  const logMax = Math.log1p(maxThreshold);

  const data = new Uint8Array(HEATMAP_LUT_SIZE * 4);

  for (let i = 0; i < HEATMAP_LUT_SIZE; i++) {
    if (i === 0) {
      data[0] = 0;
      data[1] = 0;
      data[2] = 0;
      data[3] = 0;
      continue;
    }

    const u = i / (HEATMAP_LUT_SIZE - 1);
    const uniqueActivities = Math.expm1(u * logMax);
    const color = getColorFromThresholds(uniqueActivities, sorted);

    const r = Math.max(0, Math.min(255, Math.round(color[0])));
    const g = Math.max(0, Math.min(255, Math.round(color[1])));
    const b = Math.max(0, Math.min(255, Math.round(color[2])));
    const a = Math.max(0, Math.min(255, Math.round((color[3] ?? 1) * 255)));

    const offset = i * 4;
    data[offset] = r;
    data[offset + 1] = g;
    data[offset + 2] = b;
    data[offset + 3] = a;
  }

  return {
    data,
    width: HEATMAP_LUT_SIZE,
    maxThreshold,
  };
}
