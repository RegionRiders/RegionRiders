import { drawLineToAccumulator } from '@/components/ActivityMap/hooks/activity/activitiesHeatmap/utils/drawLineToAccumulator';
import { PixelBounds, PixelPoint } from '@/components/ActivityMap/hooks/activity/activityTypes';
import { getActivityLineRadiusFromControl } from '@/components/ActivityMap/hooks/activity/utils/activityThickness';
import { GPXTrack } from '@/lib/types';

/**
 * Soft per-frame processing budget for chunked heatmap rendering.
 * Once a chunk reaches this elapsed time, work yields to the next animation frame.
 */
const CHUNK_FRAME_BUDGET_MS = 8;
/**
 * Hard cap on tracks processed in a single chunk.
 * Prevents long tracks from monopolizing one frame even if time checks are infrequent.
 */
const TRACKS_PER_CHUNK = 24;
/**
 * Frequency for elapsed-time checks while iterating segments.
 * We intentionally avoid checking on every segment to reduce `performance.now()` overhead.
 */
const SEGMENT_CHECK_INTERVAL = 32;

/**
 * Processes tracks in chunks using requestAnimationFrame for non-blocking rendering
 */
export function processTracksChunked(
  tracksArray: GPXTrack[],
  accumulator: Float32Array,
  canvasWidth: number,
  canvasHeight: number,
  projectedTracks: Map<string, PixelPoint[]>,
  topLeftX: number,
  topLeftY: number,
  heatmapDensity: number,
  lineThickness: number,
  shouldAbort: () => boolean,
  touchedBounds: PixelBounds,
  onComplete: () => void
): void {
  let trackIndex = 0;
  let segmentIndex = 0;
  const frameBudgetMs = CHUNK_FRAME_BUDGET_MS;
  // Keep at least 1px of extra margin so segments hugging the viewport border are not incorrectly culled
  // after integer rounding in drawLineToAccumulator.
  const cullPadding = Math.max(1, getActivityLineRadiusFromControl(lineThickness) + 1);

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
      const projectedPoints = projectedTracks.get(track.id);
      const pointCount = projectedPoints?.length ?? 0;

      if (projectedPoints && pointCount > 1) {
        let previousX = (projectedPoints[segmentIndex].x - topLeftX) * heatmapDensity;
        let previousY = (projectedPoints[segmentIndex].y - topLeftY) * heatmapDensity;

        while (segmentIndex < pointCount - 1) {
          const nextProjected = projectedPoints[segmentIndex + 1];
          const nextX = (nextProjected.x - topLeftX) * heatmapDensity;
          const nextY = (nextProjected.y - topLeftY) * heatmapDensity;
          if (!isOutsideViewport(previousX, previousY, nextX, nextY, canvasWidth, canvasHeight)) {
            drawLineToAccumulator(
              accumulator,
              canvasWidth,
              canvasHeight,
              previousX,
              previousY,
              nextX,
              nextY,
              lineThickness,
              touchedBounds
            );
          }

          segmentIndex++;
          previousX = nextX;
          previousY = nextY;
          // Check elapsed frame budget every N segments to avoid expensive timer reads per segment.
          if (
            segmentIndex % SEGMENT_CHECK_INTERVAL === 0 &&
            performance.now() - chunkStartTime >= frameBudgetMs
          ) {
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
