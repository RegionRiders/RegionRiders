import { drawLineToAccumulator } from '@/components/ActivityMap/hooks/activity/activitiesHeatmap/utils/drawLineToAccumulator';
import { PixelBounds } from '@/components/ActivityMap/hooks/activity/activityTypes';
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
  latlngToPixel: (lat: number, lon: number) => { x: number; y: number },
  lineThickness: number,
  shouldAbort: () => boolean,
  touchedBounds: PixelBounds,
  onComplete: () => void,
  options?: {
    simplificationTolerancePx?: number;
    maxAccumulatorCountRef?: { current: number };
  }
): void {
  let trackIndex = 0;
  let segmentIndex = 0;
  const frameBudgetMs = CHUNK_FRAME_BUDGET_MS;
  // Keep at least 1px of extra margin so segments hugging the viewport border are not incorrectly culled
  // after integer rounding in drawLineToAccumulator.
  const cullPadding = Math.max(1, getActivityLineRadiusFromControl(lineThickness) + 1);
  const simplificationTolerancePx = Math.max(0, options?.simplificationTolerancePx ?? 0);
  const simplificationToleranceSq = simplificationTolerancePx * simplificationTolerancePx;

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
        let lastKeptX: number | null = null;
        let lastKeptY: number | null = null;
        let previousX: number | null = null;
        let previousY: number | null = null;
        while (segmentIndex < points.length - 1) {
          if (previousX === null || previousY === null) {
            const initialPoint = latlngToPixel(points[segmentIndex].lat, points[segmentIndex].lon);
            previousX = initialPoint.x;
            previousY = initialPoint.y;
            lastKeptX = initialPoint.x;
            lastKeptY = initialPoint.y;
          }
          const nextPoint = latlngToPixel(
            points[segmentIndex + 1].lat,
            points[segmentIndex + 1].lon
          );

          const isLastSegment = segmentIndex + 1 === points.length - 1;
          let keepSegment = true;
          if (
            !isLastSegment &&
            lastKeptX !== null &&
            lastKeptY !== null &&
            simplificationToleranceSq > 0
          ) {
            const dx = nextPoint.x - lastKeptX;
            const dy = nextPoint.y - lastKeptY;
            keepSegment = dx * dx + dy * dy >= simplificationToleranceSq;
          }

          if (
            keepSegment &&
            previousX !== null &&
            previousY !== null &&
            !isOutsideViewport(
              previousX,
              previousY,
              nextPoint.x,
              nextPoint.y,
              canvasWidth,
              canvasHeight
            )
          ) {
            const maxAccumulatorCountRef = options?.maxAccumulatorCountRef;
            drawLineToAccumulator(
              accumulator,
              canvasWidth,
              canvasHeight,
              previousX,
              previousY,
              nextPoint.x,
              nextPoint.y,
              lineThickness,
              touchedBounds,
              ...(maxAccumulatorCountRef ? [maxAccumulatorCountRef] : [])
            );
            lastKeptX = nextPoint.x;
            lastKeptY = nextPoint.y;
            previousX = nextPoint.x;
            previousY = nextPoint.y;
          }

          segmentIndex++;
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
