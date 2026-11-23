import { ACTIVITY_HEATMAP_COLOR_THRESHOLDS } from '@/components/ActivityMap/config/mapConfig';
import { ColorThreshold } from '@/components/ActivityMap/mapTypes';
import { getColorFromThresholds } from '@/components/ActivityMap/utils/colorInterpolation';

export const HEATMAP_LUT_SIZE = 512;
export const HEATMAP_REFERENCE_ZOOM = 14;

export interface HeatmapLutData {
  /** RGBA8 texels (HEATMAP_LUT_SIZE * 4 bytes) */
  data: Uint8Array;
  width: number;
  maxThreshold: number;
}

/**
 * Computes zoom-aware overlap scaling for multi-track density above a single ride.
 *
 * Physical rationale:
 * - Along-track GPS point density (self-overlap) is already normalized to ~1.0 per track
 *   in the capsule shader via segment-length weighting.
 * - Across-track convergence (parallel nearby roads merging into one brush footprint as you zoom out)
 *   grows sub-linearly (~2^(0.38 * deltaZoom)).
 * - Clamping to [0.14, 1.5] ensures regional (Pomerania, z≈8) and country-wide (Poland, z≈5.5)
 *   views retain the full color spectrum from 1 ride (dark red) to 150+ rides (yellow/white core).
 */
export function getHeatmapZoomScale(maplibreZoom: number): number {
  const effectiveZoom = maplibreZoom + 1;
  if (effectiveZoom >= HEATMAP_REFERENCE_ZOOM + 1) {
    return 1.5;
  }

  const delta = effectiveZoom - HEATMAP_REFERENCE_ZOOM;
  if (delta >= 0) {
    // Smooth transition from 1.0 at effectiveZoom=14 to 1.5 at effectiveZoom=15
    return 1.0 + 0.5 * delta;
  }

  const scale = 2 ** (0.38 * delta);
  return Math.max(0.14, Math.min(1.5, scale));
}

/**
 * Converts raw accumulated track density into normalized unique activity count.
 * Anchors a single ride (`rawDensity = 1.0`) to `1.0` at every zoom level so isolated
 * rides never collapse below threshold 1 when zooming out to country/continent views.
 */
export function computeUniqueActivitiesFromDensity(
  rawDensity: number,
  maplibreZoom: number
): number {
  if (rawDensity <= 0) {
    return 0;
  }
  if (rawDensity <= 1.0) {
    return rawDensity;
  }
  return 1.0 + (rawDensity - 1.0) * getHeatmapZoomScale(maplibreZoom);
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
