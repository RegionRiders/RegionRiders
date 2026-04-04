/**
 * Draws a line segment into the accumulator buffer for heatmap rendering.
 * This function writes only integer hit counts and does not apply visual smoothing.
 *
 * @param accumulator - Pixel count buffer (width × height)
 * @param width - Canvas width in pixels
 * @param height - Canvas height in pixels
 * @param x0 - Start x coordinate
 * @param y0 - Start y coordinate
 * @param x1 - End x coordinate
 * @param y1 - End y coordinate
 * @param thickness - Line thickness radius in pixels
 */
export function drawLineToAccumulator(
  accumulator: Float32Array,
  width: number,
  height: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  thickness: number
): void {
  const roundedThickness = Math.max(0, Math.round(thickness - 1));
  const dx = x1 - x0;
  const dy = y1 - y0;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));

  if (steps === 0) {
    const x = Math.round(x0);
    const y = Math.round(y0);
    if (x >= 0 && x < width && y >= 0 && y < height) {
      accumulator[y * width + x]++;
    }
    return;
  }

  // Interpolate along line
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = Math.round(x0 + dx * t);
    const y = Math.round(y0 + dy * t);

    // Draw circular brush at this point
    for (let offsetX = -roundedThickness; offsetX <= roundedThickness; offsetX++) {
      for (let offsetY = -roundedThickness; offsetY <= roundedThickness; offsetY++) {
        const distSq = offsetX * offsetX + offsetY * offsetY;

        if (distSq <= roundedThickness * roundedThickness) {
          const px = x + offsetX;
          const py = y + offsetY;

          if (px >= 0 && px < width && py >= 0 && py < height) {
            const idx = py * width + px;
            accumulator[idx]++;
          }
        }
      }
    }
  }
}
