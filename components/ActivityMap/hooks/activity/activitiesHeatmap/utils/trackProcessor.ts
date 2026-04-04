import { drawLineToAccumulator } from '@/components/ActivityMap/hooks/activity/activitiesHeatmap/utils/drawLineToAccumulator';
import { PixelBounds } from '@/components/ActivityMap/hooks/activity/activityTypes';
import { GPXTrack } from '@/lib/types';

const CHUNK_FRAME_BUDGET_MS = 8;
const TRACKS_PER_CHUNK = 24;

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
  shouldAbort: () => boolean,
  touchedBounds: PixelBounds,
  onComplete: () => void
): void {
  let trackIndex = 0;
  let segmentIndex = 0;
  const frameBudgetMs = CHUNK_FRAME_BUDGET_MS;
  // Keep at least 1px of margin so segments hugging the viewport border are not incorrectly culled.
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
    if (shouldAbort()) {
      return;
    }

    const chunkStartTime = performance.now();
    let processedTracks = 0;
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
          if (segmentIndex % 32 === 0 && performance.now() - chunkStartTime >= frameBudgetMs) {
            requestAnimationFrame(processChunk);
            return;
          }
        }
      }

      trackIndex++;
      segmentIndex = 0;
      processedTracks++;
      if (processedTracks >= TRACKS_PER_CHUNK) {
        requestAnimationFrame(processChunk);
        return;
      }
    }

    if (!shouldAbort()) {
      onComplete();
    }
  };

  processChunk();
}
