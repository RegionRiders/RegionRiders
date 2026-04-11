import { ACTIVITY_HEATMAP_COLOR_THRESHOLDS } from '@/components/ActivityMap/config/mapConfig';
import { getHeatmapColorForCount } from '@/components/ActivityMap/hooks/activity/activitiesHeatmap/utils/getHeatmapColorForCount';
import { smoothHeatmapEdges } from '@/components/ActivityMap/hooks/activity/activitiesHeatmap/utils/smoothHeatmapEdges';
import { PixelBounds } from '@/components/ActivityMap/hooks/activity/activityTypes';
import { ColorThreshold } from '@/components/ActivityMap/mapTypes';

const SMOOTHING_ADAPTIVE_THRESHOLD = 0.5;

type CachedColor = readonly [r: number, g: number, b: number, a: number];

export function renderHeatmapPixelsFromAccumulator(
  accumulator: Float32Array,
  canvasWidth: number,
  canvasHeight: number,
  currentZoom: number,
  lineThickness: number = 2,
  layerTransparency: number = 1,
  colorThresholds?: ColorThreshold[],
  touchedBounds?: PixelBounds | null
): Uint8ClampedArray {
  const data = new Uint8ClampedArray(canvasWidth * canvasHeight * 4);
  if (!touchedBounds) {
    return data;
  }

  const minX = Math.max(0, touchedBounds.minX);
  const minY = Math.max(0, touchedBounds.minY);
  const maxX = Math.min(canvasWidth - 1, touchedBounds.maxX);
  const maxY = Math.min(canvasHeight - 1, touchedBounds.maxY);
  const thresholdsToUse =
    colorThresholds && colorThresholds.length > 0
      ? colorThresholds
      : ACTIVITY_HEATMAP_COLOR_THRESHOLDS;
  const colorCache = new Map<number, CachedColor>();

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const i = y * canvasWidth + x;
      const count = accumulator[i];
      if (count === 0) {
        continue;
      }

      let cachedColor = colorCache.get(count);
      if (!cachedColor) {
        const color = getHeatmapColorForCount(count, currentZoom, lineThickness, thresholdsToUse);
        cachedColor = [
          color[0],
          color[1],
          color[2],
          Math.round(color[3] * layerTransparency * 255),
        ] as const;
        colorCache.set(count, cachedColor);
      }

      const pixelIndex = i * 4;
      data[pixelIndex] = cachedColor[0];
      data[pixelIndex + 1] = cachedColor[1];
      data[pixelIndex + 2] = cachedColor[2];
      data[pixelIndex + 3] = cachedColor[3];
    }
  }

  const touchedArea = (maxX - minX + 1) * (maxY - minY + 1);
  const totalArea = canvasWidth * canvasHeight;
  const smoothingAllowed = touchedArea / totalArea <= SMOOTHING_ADAPTIVE_THRESHOLD;
  if (smoothingAllowed) {
    smoothHeatmapEdges(data, accumulator, canvasWidth, canvasHeight, touchedBounds);
  }

  return data;
}
