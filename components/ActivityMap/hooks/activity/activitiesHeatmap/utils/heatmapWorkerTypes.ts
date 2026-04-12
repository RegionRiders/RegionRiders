export interface WorkerTrackPoint {
  lat: number;
  lon: number;
}

export interface WorkerTrackPayload {
  id: string;
  points: WorkerTrackPoint[];
}

export interface HeatmapWorkerRequest {
  tracks: WorkerTrackPayload[];
  canvasWidth: number;
  canvasHeight: number;
  topLeftX: number;
  topLeftY: number;
  zoom: number;
  pixelDensity: number;
  lineThickness: number;
  simplificationTolerancePx: number;
}

export interface HeatmapWorkerResponse {
  accumulator: ArrayBuffer;
  touchedBounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
  maxAccumulatorCount: number;
}
