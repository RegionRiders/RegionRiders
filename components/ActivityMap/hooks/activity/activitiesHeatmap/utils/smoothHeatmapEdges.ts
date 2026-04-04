import { PixelBounds } from '@/components/ActivityMap/hooks/activity/activityTypes';

/**
 * Applies alpha-only edge smoothing for heatmap pixels.
 * This never changes RGB values and never adds new non-zero pixels.
 */
export function smoothHeatmapEdges(
  data: Uint8ClampedArray,
  accumulator: Float32Array,
  width: number,
  height: number,
  bounds?: PixelBounds
): void {
  const originalAlpha = new Uint8ClampedArray(width * height);
  const minX = bounds ? Math.max(0, bounds.minX - 1) : 0;
  const minY = bounds ? Math.max(0, bounds.minY - 1) : 0;
  const maxX = bounds ? Math.min(width - 1, bounds.maxX + 1) : width - 1;
  const maxY = bounds ? Math.min(height - 1, bounds.maxY + 1) : height - 1;

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const idx = y * width + x;
      originalAlpha[idx] = data[idx * 4 + 3];
    }
  }

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const idx = y * width + x;
      const alpha = originalAlpha[idx];
      if (alpha === 0 || accumulator[idx] <= 0) {
        continue;
      }

      const left = x > 0 && accumulator[idx - 1] > 0;
      const right = x < width - 1 && accumulator[idx + 1] > 0;
      const up = y > 0 && accumulator[idx - width] > 0;
      const down = y < height - 1 && accumulator[idx + width] > 0;
      const cardinalCount = Number(left) + Number(right) + Number(up) + Number(down);

      let alphaFactor = 1;
      const hasHorizontal = left || right;
      const hasVertical = up || down;
      const isCorner = cardinalCount === 2 && hasHorizontal && hasVertical;

      if (isCorner) {
        alphaFactor = 0.6;
      } else if (cardinalCount <= 1) {
        alphaFactor = 0.75;
      }

      data[idx * 4 + 3] = Math.max(0, Math.min(255, Math.round(alpha * alphaFactor)));
    }
  }
}
