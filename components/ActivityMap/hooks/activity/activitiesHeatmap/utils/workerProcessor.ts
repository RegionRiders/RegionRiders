import {
  HeatmapWorkerRequest,
  HeatmapWorkerResponse,
  WorkerTrackPayload,
} from '@/components/ActivityMap/hooks/activity/activitiesHeatmap/utils/heatmapWorkerTypes';
import { GPXTrack } from '@/lib/types';

export interface WorkerProcessorParams {
  tracks: Map<string, GPXTrack>;
  canvasWidth: number;
  canvasHeight: number;
  topLeftX: number;
  topLeftY: number;
  zoom: number;
  pixelDensity: number;
  lineThickness: number;
  simplificationTolerancePx: number;
}

export function supportsHeatmapWorker(): boolean {
  return typeof window !== 'undefined' && typeof Worker !== 'undefined';
}

function toWorkerTracks(tracks: Map<string, GPXTrack>): WorkerTrackPayload[] {
  const payload: WorkerTrackPayload[] = [];
  tracks.forEach((track, id) => {
    payload.push({
      id,
      points: track.points.map((point) => ({ lat: point.lat, lon: point.lon })),
    });
  });
  return payload;
}

export function processTracksWithWorker(params: WorkerProcessorParams): {
  worker: Worker;
  result: Promise<HeatmapWorkerResponse>;
} {
  const worker = new Worker(new URL('./heatmap.worker.ts', import.meta.url));

  const request: HeatmapWorkerRequest = {
    tracks: toWorkerTracks(params.tracks),
    canvasWidth: params.canvasWidth,
    canvasHeight: params.canvasHeight,
    topLeftX: params.topLeftX,
    topLeftY: params.topLeftY,
    zoom: params.zoom,
    pixelDensity: params.pixelDensity,
    lineThickness: params.lineThickness,
    simplificationTolerancePx: params.simplificationTolerancePx,
  };

  const result = new Promise<HeatmapWorkerResponse>((resolve, reject) => {
    worker.onmessage = (event: MessageEvent<HeatmapWorkerResponse>) => resolve(event.data);
    worker.onerror = (error: ErrorEvent) => reject(error);
    worker.postMessage(request);
  });

  return { worker, result };
}
