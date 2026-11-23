import { ACTIVITY_HEATMAP_COLOR_THRESHOLDS } from '@/components/ActivityMap/config/mapConfig';
import { getActivityLineRadiusFromControl } from '@/components/ActivityMap/hooks/activity/utils/activityThickness';
import { ColorThreshold } from '@/components/ActivityMap/mapTypes';
import { getColorFromThresholds } from '@/components/ActivityMap/utils/colorInterpolation';

export const HEATMAP_LUT_SIZE = 512;

/**
 * Street-level reference zoom in MapLibre 512px scale (~10m/px, equivalent to legacy 256px z14).
 * At or above this zoom level, individual roads are already resolved so gamma = 1.0 (exact ride count).
 */
export const HEATMAP_REFERENCE_MAPLIBRE_ZOOM = 13;

/** Reference CSS brush radius (px) corresponding to default `activityThickness = 2`. */
export const HEATMAP_REFERENCE_RADIUS_PX = 1.75;

export const DEFAULT_HEATMAP_INTENSITY = 1.0;
export const MIN_HEATMAP_INTENSITY = 0.25;
export const MAX_HEATMAP_INTENSITY = 3.0;

export const DEFAULT_HEATMAP_ZOOM_ATTENUATION = 0.08;
export const MIN_HEATMAP_ZOOM_ATTENUATION = 0.0;
export const MAX_HEATMAP_ZOOM_ATTENUATION = 0.25;

export interface HeatmapLutData {
  /** RGBA8 texels (HEATMAP_LUT_SIZE * 4 bytes) */
  data: Uint8Array;
  width: number;
  maxThreshold: number;
}

export function clampHeatmapIntensity(value?: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_HEATMAP_INTENSITY;
  }
  return Math.min(MAX_HEATMAP_INTENSITY, Math.max(MIN_HEATMAP_INTENSITY, value));
}

export function clampHeatmapZoomAttenuation(value?: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_HEATMAP_ZOOM_ATTENUATION;
  }
  return Math.min(MAX_HEATMAP_ZOOM_ATTENUATION, Math.max(MIN_HEATMAP_ZOOM_ATTENUATION, value));
}

/**
 * Returns the CSS-pixel brush radius for a given activity thickness control value (1..10).
 */
export function getHeatmapBrushRadiusCssPx(lineThickness: number): number {
  return Math.max(0.85, getActivityLineRadiusFromControl(lineThickness) + 0.75);
}

/**
 * Computes the dimensionless log2 ratio of physical ground footprint width relative to
 * street-level reference resolution (`z_ref = 13`, `r_ref = 1.75px`):
 *
 *   deltaZoomEff = max(0, (z_ref - z) + log2(r_css / r_ref))
 *
 * Zooming out by 1 level or doubling line thickness both double the ground footprint in meters
 * and therefore increase `deltaZoomEff` by +1.0.
 */
export function getEffectiveGroundScaleDelta(
  maplibreZoom: number,
  lineThickness: number = 2
): number {
  const radiusCssPx = getHeatmapBrushRadiusCssPx(lineThickness);
  const thicknessZoomOffset = Math.log2(radiusCssPx / HEATMAP_REFERENCE_RADIUS_PX);
  return Math.max(0, HEATMAP_REFERENCE_MAPLIBRE_ZOOM - maplibreZoom + thicknessZoomOffset);
}

/**
 * Computes the log-space compression exponent `gamma = 1 / (1 + k * deltaZoomEff)`.
 *
 * Mathematical rationale:
 * - At street zoom (`deltaZoomEff = 0`), `gamma = 1.0`: `U = D * intensity` (exact physical ride count,
 *   no artificial high-zoom brightening).
 * - When zooming out (`deltaZoomEff > 0`), power-law compression `D^gamma` is linear in log-space
 *   (`log(D^gamma) = gamma * log(D)`), preserving visual separation across 1, 10, 50, and 500+ rides
 *   without crushing rural 1..10-ride corridors or blowing out dense urban hubs to solid white.
 */
export function getHeatmapGamma(
  maplibreZoom: number,
  lineThickness: number = 2,
  zoomAttenuation: number = DEFAULT_HEATMAP_ZOOM_ATTENUATION
): number {
  const k = clampHeatmapZoomAttenuation(zoomAttenuation);
  if (k <= 0) {
    return 1.0;
  }
  const deltaZoomEff = getEffectiveGroundScaleDelta(maplibreZoom, lineThickness);
  return 1.0 / (1.0 + k * deltaZoomEff);
}

/**
 * Converts exact bisector-clipped accumulated ride density `rawDensity` into effective
 * unique activity count for LUT lookup.
 */
export function computeUniqueActivitiesFromDensity(
  rawDensity: number,
  maplibreZoom: number,
  lineThickness: number = 2,
  intensity: number = DEFAULT_HEATMAP_INTENSITY,
  zoomAttenuation: number = DEFAULT_HEATMAP_ZOOM_ATTENUATION
): number {
  if (rawDensity <= 0) {
    return 0;
  }
  const adjusted = rawDensity * clampHeatmapIntensity(intensity);
  if (adjusted <= 1.0) {
    return adjusted;
  }
  const gamma = getHeatmapGamma(maplibreZoom, lineThickness, zoomAttenuation);
  return adjusted ** gamma;
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
