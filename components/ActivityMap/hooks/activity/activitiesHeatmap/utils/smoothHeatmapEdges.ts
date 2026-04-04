/**
 * Applies alpha-only edge smoothing for heatmap pixels.
 * This never changes RGB values and never adds new non-zero pixels.
 */
export function smoothHeatmapEdges(
  data: Uint8ClampedArray,
  accumulator: Float32Array,
  width: number,
  height: number
): void {
  const originalAlpha = new Uint8ClampedArray(width * height);
  for (let i = 0; i < originalAlpha.length; i++) {
    originalAlpha[i] = data[i * 4 + 3];
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
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
