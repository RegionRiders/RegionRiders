/**
 * Draws a line segment into the accumulator buffer for heatmap rendering.
 * Uses linear interpolation between points with a solid circular brush.
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
  const dx = Math.round(x1) - Math.round(x0);
  const dy = Math.round(y1) - Math.round(y0);
  const steps = Math.max(Math.abs(dx), Math.abs(dy));

  if (steps === 0) {
    return;
  }

  const thicknessSq = thickness * thickness;

  // Interpolate along line
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = Math.round(x0 + dx * t);
    const y = Math.round(y0 + dy * t);

    // Draw circular brush at this point
    for (let offsetX = -thickness; offsetX <= thickness; offsetX++) {
      for (let offsetY = -thickness; offsetY <= thickness; offsetY++) {
        const distSq = offsetX * offsetX + offsetY * offsetY;
        if (distSq <= thicknessSq) {
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
