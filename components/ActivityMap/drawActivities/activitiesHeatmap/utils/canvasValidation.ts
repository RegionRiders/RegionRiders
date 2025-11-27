import {CanvasDimensions} from "@/components/ActivityMap/drawActivities/types";

/**
 * Validates canvas dimensions for rendering
 */
export function validateCanvasDimensions(dimensions: CanvasDimensions): boolean {
  const { canvasWidth, canvasHeight } = dimensions;
  return isFinite(canvasWidth) && isFinite(canvasHeight) && canvasWidth > 0 && canvasHeight > 0;
}
