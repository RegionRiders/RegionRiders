import { BrowserLogger } from '@/lib/logger/logger.client';

/**
 * Creates canvas and context for heatmap rendering
 */
export function createCanvasContext(
  width: number,
  height: number,
  logger: BrowserLogger
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    logger.error('Failed to get canvas context');
    return null;
  }

  return { canvas, ctx };
}
