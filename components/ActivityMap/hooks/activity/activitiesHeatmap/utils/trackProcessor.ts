import { RefObject } from 'react';
import { drawLineToAccumulator } from '@/components/ActivityMap/hooks/activity/activitiesHeatmap/utils/drawLineToAccumulator';
import { GPXTrack } from '@/lib/types';

/**
 * Processes tracks in chunks using requestAnimationFrame for non-blocking rendering
 */
export function processTracksChunked(
  tracksArray: GPXTrack[],
  coreAccumulator: Float32Array,
  canvasWidth: number,
  canvasHeight: number,
  latlngToPixel: (lat: number, lon: number) => { x: number; y: number },
  lineThickness: number,
  smoothEdges: boolean,
  edgeAccumulator: Float32Array | undefined,
  renderAbortRef: RefObject<boolean>,
  onComplete: () => void
): void {
  let trackIndex = 0;

  const processChunk = (): void => {
    if (renderAbortRef.current) {
      return;
    }

    while (trackIndex < tracksArray.length) {
      const track = tracksArray[trackIndex];
      const points = track.points;

      if (points && points.length > 0) {
        for (let i = 0; i < points.length - 1; i++) {
          const p1 = latlngToPixel(points[i].lat, points[i].lon);
          const p2 = latlngToPixel(points[i + 1].lat, points[i + 1].lon);
          drawLineToAccumulator(
            coreAccumulator,
            canvasWidth,
            canvasHeight,
            p1.x,
            p1.y,
            p2.x,
            p2.y,
            lineThickness,
            smoothEdges,
            edgeAccumulator
          );
        }
      }

      trackIndex++;
    }

    if (trackIndex < tracksArray.length) {
      requestAnimationFrame(processChunk);
    } else {
      onComplete();
    }
  };

  processChunk();
}
