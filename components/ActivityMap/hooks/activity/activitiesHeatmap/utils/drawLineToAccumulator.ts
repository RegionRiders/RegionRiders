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
  coreAccumulator: Float32Array,
  width: number,
  height: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  thickness: number,
  smoothEdges: boolean = true,
  edgeAccumulator?: Float32Array
): void {
  const MIN_THICKNESS_PX = 0.5;
  const ANTIALIAS_FALLOFF_WIDTH_PX = 1;

  const radius = Math.max(MIN_THICKNESS_PX, thickness);
  const innerRadius = Math.max(0, radius - ANTIALIAS_FALLOFF_WIDTH_PX);
  const innerRadiusSq = innerRadius * innerRadius;
  const radiusSq = radius * radius;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const segmentLengthSq = dx * dx + dy * dy;

  const minX = Math.max(0, Math.floor(Math.min(x0, x1) - radius));
  const maxX = Math.min(width - 1, Math.ceil(Math.max(x0, x1) + radius));
  const minY = Math.max(0, Math.floor(Math.min(y0, y1) - radius));
  const maxY = Math.min(height - 1, Math.ceil(Math.max(y0, y1) + radius));

  for (let py = minY; py <= maxY; py++) {
    const sampleY = py + 0.5;
    for (let px = minX; px <= maxX; px++) {
      const sampleX = px + 0.5;

      let closestX = x0;
      let closestY = y0;

      if (segmentLengthSq > 0) {
        const tRaw = ((sampleX - x0) * dx + (sampleY - y0) * dy) / segmentLengthSq;
        const t = Math.max(0, Math.min(1, tRaw));
        closestX = x0 + dx * t;
        closestY = y0 + dy * t;
      }

      const distX = sampleX - closestX;
      const distY = sampleY - closestY;
      const distSq = distX * distX + distY * distY;

      if (distSq > radiusSq) {
        continue;
      }

      const idx = py * width + px;
      if (!smoothEdges || distSq <= innerRadiusSq) {
        coreAccumulator[idx] += 1;
      } else if (edgeAccumulator) {
        const dist = Math.sqrt(distSq);
        const falloff = (radius - dist) / ANTIALIAS_FALLOFF_WIDTH_PX;
        edgeAccumulator[idx] = Math.max(
          edgeAccumulator[idx],
          Math.max(0, Math.min(1, falloff))
        );
      }
    }
  }
}
