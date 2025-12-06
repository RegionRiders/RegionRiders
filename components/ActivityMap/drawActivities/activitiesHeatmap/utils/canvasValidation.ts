import { CanvasDimensions } from '@/components/ActivityMap/drawActivities/types';

/**
 * Validates a Leaflet Point for finite, valid coordinates
 */
function isValidPoint(point: L.Point): boolean {
  return isFinite(point.x) && isFinite(point.y);
}

/**
 * Validates canvas dimensions for rendering
 * Ensures all numeric values are finite and dimensions are positive
 */
export function validateCanvasDimensions(dimensions: CanvasDimensions): boolean {
  const { canvasWidth, canvasHeight, topLeft, bottomRight } = dimensions;

  const hasValidSize =
    isFinite(canvasWidth) && isFinite(canvasHeight) && canvasWidth > 0 && canvasHeight > 0;

  const hasValidBounds = isValidPoint(topLeft) && isValidPoint(bottomRight);

  const hasLogicalBounds = bottomRight.x >= topLeft.x && bottomRight.y >= topLeft.y;

  return hasValidSize && hasValidBounds && hasLogicalBounds;
}
