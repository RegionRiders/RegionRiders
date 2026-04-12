import { getHeatmapColorForCount } from '@/components/ActivityMap/hooks/activity/activitiesHeatmap/utils/getHeatmapColorForCount';
import { ColorThreshold } from '@/components/ActivityMap/mapTypes';

export interface AdaptiveHeatmapQuality {
  effectiveDensity: number;
  smoothingAllowed: boolean;
  simplificationTolerancePx: number;
}

const ADAPTIVE_HIGH_COST_MS = 180;
const ADAPTIVE_SEVERE_COST_MS = 320;

export function getAdaptiveHeatmapQuality(
  baseDensity: number,
  zoom: number,
  previousRenderDurationMs: number | null
): AdaptiveHeatmapQuality {
  const safeDensity = Number.isFinite(baseDensity) ? baseDensity : 1;
  const duration = previousRenderDurationMs ?? 0;
  const zoomTolerance = zoom >= 14 ? 0 : zoom >= 12 ? 0.5 : zoom >= 10 ? 1 : 2;

  if (duration >= ADAPTIVE_SEVERE_COST_MS) {
    return {
      effectiveDensity: Math.max(0.4, safeDensity * 0.7),
      smoothingAllowed: false,
      simplificationTolerancePx: Math.max(zoomTolerance, 1.5),
    };
  }

  if (duration >= ADAPTIVE_HIGH_COST_MS) {
    return {
      effectiveDensity: Math.max(0.5, safeDensity * 0.85),
      smoothingAllowed: false,
      simplificationTolerancePx: Math.max(zoomTolerance, 1),
    };
  }

  return {
    effectiveDensity: safeDensity,
    smoothingAllowed: true,
    simplificationTolerancePx: zoomTolerance,
  };
}

export function buildHeatmapColorLut(
  maxCount: number,
  zoom: number,
  lineThickness: number,
  layerTransparency: number,
  thresholds?: ColorThreshold[]
): Uint8ClampedArray {
  const safeMax = Math.max(0, Math.floor(maxCount));
  const lut = new Uint8ClampedArray((safeMax + 1) * 4);
  const alphaScale = Math.max(0, Math.min(1, layerTransparency));

  for (let count = 1; count <= safeMax; count++) {
    const [r, g, b, a] = getHeatmapColorForCount(count, zoom, lineThickness, thresholds);
    const idx = count * 4;
    lut[idx] = r;
    lut[idx + 1] = g;
    lut[idx + 2] = b;
    lut[idx + 3] = Math.round(a * alphaScale * 255);
  }

  return lut;
}
