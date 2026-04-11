import { PixelBounds } from '@/components/ActivityMap/hooks/activity/activityTypes';

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
 * @param thickness - Line thickness diameter in pixels (UI control)
 */
export function drawLineToAccumulator(
  accumulator: Float32Array,
  width: number,
  height: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  thickness: number,
  touchedBounds?: PixelBounds
): void {
  // Guard against non-finite inputs that could cause infinite loops
  if (
    !Number.isFinite(x0) ||
    !Number.isFinite(y0) ||
    !Number.isFinite(x1) ||
    !Number.isFinite(y1) ||
    !Number.isFinite(thickness)
  ) {
    return;
  }

  // Normalize and clamp thickness to ensure brushRadius is a finite non-negative integer
  const normalizedThickness = Math.max(0, thickness);

  // Thickness is interpreted as brush diameter from UI settings.
  // Derive radius from diameter: radius = floor(diameter / 2)
  // This ensures the stamped footprint matches the specified diameter:
  // e.g., thickness=4 -> brushRadius=2 -> loop bounds [-2, +2] -> 5×5 grid with 4px effective diameter
  const brushRadius = Math.floor(normalizedThickness / 2);
  const dx = x1 - x0;
  const dy = y1 - y0;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  const roundedX0 = Math.round(x0);
  const roundedY0 = Math.round(y0);
  const roundedX1 = Math.round(x1);
  const roundedY1 = Math.round(y1);

  if (steps === 0) {
    stampBrush(accumulator, width, height, roundedX0, roundedY0, brushRadius, touchedBounds);
    return;
  }

  let x = roundedX0;
  let y = roundedY0;
  const deltaX = Math.abs(roundedX1 - roundedX0);
  const deltaY = Math.abs(roundedY1 - roundedY0);
  const stepX = roundedX0 < roundedX1 ? 1 : -1;
  const stepY = roundedY0 < roundedY1 ? 1 : -1;
  let err = deltaX - deltaY;

  while (true) {
    stampBrush(accumulator, width, height, x, y, brushRadius, touchedBounds);

    if (x === roundedX1 && y === roundedY1) {
      break;
    }

    const err2 = err * 2;
    if (err2 > -deltaY) {
      err -= deltaY;
      x += stepX;
    }
    if (err2 < deltaX) {
      err += deltaX;
      y += stepY;
    }
  }
}

type BrushOffset = [number, number];

const brushOffsetsCache = new Map<number, BrushOffset[]>();
// Cache remains intentionally small: brush radii come from a narrow UI range and this avoids unbounded growth.
const MAX_BRUSH_CACHE_ENTRIES = 32;

function getBrushOffsets(radius: number): BrushOffset[] {
  const cached = brushOffsetsCache.get(radius);
  if (cached) {
    brushOffsetsCache.delete(radius);
    brushOffsetsCache.set(radius, cached);
    return cached;
  }

  if (radius <= 0) {
    const single: BrushOffset[] = [[0, 0]];
    brushOffsetsCache.set(radius, single);
    return single;
  }

  const offsets: BrushOffset[] = [];
  const radiusSq = radius * radius;
  for (let offsetX = -radius; offsetX <= radius; offsetX++) {
    for (let offsetY = -radius; offsetY <= radius; offsetY++) {
      if (offsetX * offsetX + offsetY * offsetY <= radiusSq) {
        offsets.push([offsetX, offsetY]);
      }
    }
  }

  if (brushOffsetsCache.size >= MAX_BRUSH_CACHE_ENTRIES) {
    const oldestKey = brushOffsetsCache.keys().next().value;
    if (typeof oldestKey === 'number') {
      brushOffsetsCache.delete(oldestKey);
    }
  }
  brushOffsetsCache.set(radius, offsets);
  return offsets;
}

function stampBrush(
  accumulator: Float32Array,
  width: number,
  height: number,
  x: number,
  y: number,
  brushRadius: number,
  touchedBounds?: PixelBounds
): void {
  const offsets = getBrushOffsets(brushRadius);
  for (let i = 0; i < offsets.length; i++) {
    const [offsetX, offsetY] = offsets[i];
    const px = x + offsetX;
    const py = y + offsetY;
    if (px >= 0 && px < width && py >= 0 && py < height) {
      accumulator[py * width + px]++;
      if (touchedBounds) {
        if (px < touchedBounds.minX) {
          touchedBounds.minX = px;
        }
        if (py < touchedBounds.minY) {
          touchedBounds.minY = py;
        }
        if (px > touchedBounds.maxX) {
          touchedBounds.maxX = px;
        }
        if (py > touchedBounds.maxY) {
          touchedBounds.maxY = py;
        }
      }
    }
  }
}