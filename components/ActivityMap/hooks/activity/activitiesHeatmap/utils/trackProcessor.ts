import { RefObject } from 'react';
import { drawLineToAccumulator } from '@/components/ActivityMap/hooks/activity/activitiesHeatmap/utils/drawLineToAccumulator';
import { PixelBounds } from '@/components/ActivityMap/hooks/activity/activityTypes';
import { GPXTrack } from '@/lib/types';

/**
 * Processes tracks in chunks using requestAnimationFrame for non-blocking rendering
 */
export function processTracksChunked(
  tracksArray: GPXTrack[],
  accumulator: Float32Array,
  canvasWidth: number,
  canvasHeight: number,
  latlngToPixel: (lat: number, lon: number) => { x: number; y: number },
  lineThickness: number,
  renderAbortRef: RefObject<boolean>,
  touchedBounds: PixelBounds,
  onComplete: () => void
): void {
  let trackIndex = 0;
  let segmentIndex = 0;
  const frameBudgetMs = 8;
  const cullPadding = Math.max(1, Math.round(lineThickness));

  const isOutsideViewport = (
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    width: number,
    height: number
  ): boolean => {
    const minX = Math.min(x0, x1);
    const maxX = Math.max(x0, x1);
    const minY = Math.min(y0, y1);
    const maxY = Math.max(y0, y1);

    return (
      maxX < -cullPadding ||
      maxY < -cullPadding ||
      minX > width - 1 + cullPadding ||
      minY > height - 1 + cullPadding
    );
  };

  const processChunk = (): void => {
    if (renderAbortRef.current) {
      return;
    }

    const chunkStart = performance.now();
    while (trackIndex < tracksArray.length) {
      const track = tracksArray[trackIndex];
      const points = track.points;

      if (points && points.length > 0) {
        while (segmentIndex < points.length - 1) {
          const p1 = latlngToPixel(points[segmentIndex].lat, points[segmentIndex].lon);
          const p2 = latlngToPixel(points[segmentIndex + 1].lat, points[segmentIndex + 1].lon);
          if (!isOutsideViewport(p1.x, p1.y, p2.x, p2.y, canvasWidth, canvasHeight)) {
            drawLineToAccumulator(
              accumulator,
              canvasWidth,
              canvasHeight,
              p1.x,
              p1.y,
              p2.x,
              p2.y,
              lineThickness,
              touchedBounds
            );
          }

          segmentIndex++;
          if (performance.now() - chunkStart >= frameBudgetMs) {
            requestAnimationFrame(processChunk);
            return;
          }
        }
      }

      trackIndex++;
      segmentIndex = 0;
      if (performance.now() - chunkStart >= frameBudgetMs) {
        requestAnimationFrame(processChunk);
        return;
      }
    }

    onComplete();
  };

  processChunk();
}
