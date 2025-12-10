import { CanvasDimensions } from '@/components/ActivityMap/drawActivities/types';
import { BrowserLogger } from '@/lib/logger/logger.client';

/**
 * Logs canvas dimension validation error with proper object formatting
 */
export function logDimensionError(
  dimensions: CanvasDimensions,
  zoom: number,
  message: string,
  logger: BrowserLogger
): void {
  const errorDetails = {
    canvasWidth: dimensions.canvasWidth,
    canvasHeight: dimensions.canvasHeight,
    topLeft: `{x: ${dimensions.topLeft.x}, y: ${dimensions.topLeft.y}}`,
    bottomRight: `{x: ${dimensions.bottomRight.x}, y: ${dimensions.bottomRight.y}}`,
    zoom,
  };
  logger.warn(`${message}: ${JSON.stringify(errorDetails)}`);
}
