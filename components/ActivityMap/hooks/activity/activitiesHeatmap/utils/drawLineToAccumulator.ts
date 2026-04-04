/**
 * Draws an antialiased line segment into the accumulator buffer for heatmap rendering.
 * Uses linear interpolation between points with circular brush for smooth appearance.
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
  const radius = Math.max(0.5, thickness);
  const brushRadius = Math.max(1, Math.round(radius));
  const innerRadius = Math.max(0, radius - 1);
  const innerRadiusSq = innerRadius * innerRadius;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const rawSteps = Math.max(Math.abs(dx), Math.abs(dy));
  const steps = Math.ceil(rawSteps);

  const drawBrush = (centerX: number, centerY: number): void => {
    const x = Math.round(centerX);
    const y = Math.round(centerY);

    for (let offsetX = -brushRadius; offsetX <= brushRadius; offsetX++) {
      for (let offsetY = -brushRadius; offsetY <= brushRadius; offsetY++) {
        const distSq = offsetX * offsetX + offsetY * offsetY;
        const dist = Math.sqrt(distSq);

        if (dist <= radius) {
          const px = x + offsetX;
          const py = y + offsetY;

          if (px >= 0 && px < width && py >= 0 && py < height) {
            const idx = py * width + px;

            if (distSq <= innerRadiusSq) {
              accumulator[idx] += 1;
            } else {
              accumulator[idx] += Math.max(0, radius - dist);
            }
          }
        }
      }
    }
  };

  if (steps === 0) {
    drawBrush(x0, y0);
    return;
  }

  // Interpolate along line
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    drawBrush(x0 + dx * t, y0 + dy * t);
  }
}
