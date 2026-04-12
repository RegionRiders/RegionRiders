/// <reference lib="webworker" />

import {
  HeatmapWorkerRequest,
  HeatmapWorkerResponse,
  WorkerTrackPayload,
} from '@/components/ActivityMap/hooks/activity/activitiesHeatmap/utils/heatmapWorkerTypes';
import { getActivityLineRadiusFromControl } from '@/components/ActivityMap/hooks/activity/utils/activityThickness';

type BrushOffset = [number, number];

const brushOffsetsCache = new Map<number, BrushOffset[]>();
const worldProjectionCache = new Map<string, Float32Array>();
const WORLD_CACHE_LIMIT = 256;

function projectLatLonToWorldPixel(lat: number, lon: number, zoom: number): [number, number] {
  const scale = 256 * 2 ** zoom;
  const x = ((lon + 180) / 360) * scale;
  const clampedLat = Math.max(-85.05112878, Math.min(85.05112878, lat));
  const rad = (clampedLat * Math.PI) / 180;
  const y = (0.5 - Math.log((1 + Math.sin(rad)) / (1 - Math.sin(rad))) / (4 * Math.PI)) * scale;
  return [x, y];
}

function buildProjectionCacheKey(track: WorkerTrackPayload, zoom: number): string {
  const first = track.points[0];
  const last = track.points[track.points.length - 1];
  return `${track.id}:${zoom}:${track.points.length}:${first?.lat ?? 0}:${first?.lon ?? 0}:${last?.lat ?? 0}:${last?.lon ?? 0}`;
}

function getWorldProjectedTrack(track: WorkerTrackPayload, zoom: number): Float32Array {
  const cacheKey = buildProjectionCacheKey(track, zoom);
  const cached = worldProjectionCache.get(cacheKey);
  if (cached) {
    worldProjectionCache.delete(cacheKey);
    worldProjectionCache.set(cacheKey, cached);
    return cached;
  }

  const projected = new Float32Array(track.points.length * 2);
  for (let i = 0; i < track.points.length; i++) {
    const [x, y] = projectLatLonToWorldPixel(track.points[i].lat, track.points[i].lon, zoom);
    projected[i * 2] = x;
    projected[i * 2 + 1] = y;
  }

  if (worldProjectionCache.size >= WORLD_CACHE_LIMIT) {
    const oldestKey = worldProjectionCache.keys().next().value;
    if (typeof oldestKey === 'string') {
      worldProjectionCache.delete(oldestKey);
    }
  }
  worldProjectionCache.set(cacheKey, projected);
  return projected;
}

function getBrushOffsets(radius: number): BrushOffset[] {
  const cached = brushOffsetsCache.get(radius);
  if (cached) {
    return cached;
  }

  if (radius <= 0) {
    const single: BrushOffset[] = [[0, 0]];
    brushOffsetsCache.set(radius, single);
    return single;
  }

  const offsets: BrushOffset[] = [];
  const radiusSq = radius * radius;
  for (let offsetX = -radius; offsetX <= radius; offsetX++) {
    for (let offsetY = -radius; offsetY <= radius; offsetY++) {
      if (offsetX * offsetX + offsetY * offsetY <= radiusSq) {
        offsets.push([offsetX, offsetY]);
      }
    }
  }
  brushOffsetsCache.set(radius, offsets);
  return offsets;
}

function stampBrush(
  accumulator: Float32Array,
  width: number,
  height: number,
  x: number,
  y: number,
  brushRadius: number,
  touchedBounds: { minX: number; minY: number; maxX: number; maxY: number },
  maxAccumulatorCountRef: { current: number }
): void {
  const offsets = getBrushOffsets(brushRadius);
  for (let i = 0; i < offsets.length; i++) {
    const [offsetX, offsetY] = offsets[i];
    const px = x + offsetX;
    const py = y + offsetY;
    if (px >= 0 && px < width && py >= 0 && py < height) {
      const idx = py * width + px;
      const nextValue = accumulator[idx] + 1;
      accumulator[idx] = nextValue;
      if (nextValue > maxAccumulatorCountRef.current) {
        maxAccumulatorCountRef.current = nextValue;
      }
      if (px < touchedBounds.minX) {
        touchedBounds.minX = px;
      }
      if (py < touchedBounds.minY) {
        touchedBounds.minY = py;
      }
      if (px > touchedBounds.maxX) {
        touchedBounds.maxX = px;
      }
      if (py > touchedBounds.maxY) {
        touchedBounds.maxY = py;
      }
    }
  }
}

function drawLineToAccumulator(
  accumulator: Float32Array,
  width: number,
  height: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  thickness: number,
  touchedBounds: { minX: number; minY: number; maxX: number; maxY: number },
  maxAccumulatorCountRef: { current: number }
): void {
  if (
    !Number.isFinite(x0) ||
    !Number.isFinite(y0) ||
    !Number.isFinite(x1) ||
    !Number.isFinite(y1)
  ) {
    return;
  }

  const brushRadius = getActivityLineRadiusFromControl(thickness);
  const roundedX0 = Math.round(x0);
  const roundedY0 = Math.round(y0);
  const roundedX1 = Math.round(x1);
  const roundedY1 = Math.round(y1);
  const dx = Math.abs(roundedX1 - roundedX0);
  const dy = Math.abs(roundedY1 - roundedY0);

  if (dx === 0 && dy === 0) {
    stampBrush(
      accumulator,
      width,
      height,
      roundedX0,
      roundedY0,
      brushRadius,
      touchedBounds,
      maxAccumulatorCountRef
    );
    return;
  }

  let x = roundedX0;
  let y = roundedY0;
  const stepX = roundedX0 < roundedX1 ? 1 : -1;
  const stepY = roundedY0 < roundedY1 ? 1 : -1;
  let err = dx - dy;

  while (true) {
    stampBrush(
      accumulator,
      width,
      height,
      x,
      y,
      brushRadius,
      touchedBounds,
      maxAccumulatorCountRef
    );
    if (x === roundedX1 && y === roundedY1) {
      break;
    }
    const err2 = err * 2;
    if (err2 > -dy) {
      err -= dy;
      x += stepX;
    }
    if (err2 < dx) {
      err += dx;
      y += stepY;
    }
  }
}

function isOutsideViewport(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  width: number,
  height: number,
  cullPadding: number
): boolean {
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
}

function shouldKeepPoint(
  x: number,
  y: number,
  lastKeptX: number,
  lastKeptY: number,
  toleranceSq: number
): boolean {
  if (toleranceSq <= 0) {
    return true;
  }
  const dx = x - lastKeptX;
  const dy = y - lastKeptY;
  return dx * dx + dy * dy >= toleranceSq;
}

const workerSelf = self as DedicatedWorkerGlobalScope;

workerSelf.onmessage = (event: MessageEvent<HeatmapWorkerRequest>): void => {
  const {
    tracks,
    canvasWidth,
    canvasHeight,
    topLeftX,
    topLeftY,
    zoom,
    pixelDensity,
    lineThickness,
    simplificationTolerancePx,
  } = event.data;

  const accumulator = new Float32Array(canvasWidth * canvasHeight);
  const touchedBounds = {
    minX: canvasWidth,
    minY: canvasHeight,
    maxX: -1,
    maxY: -1,
  };
  const maxAccumulatorCountRef = { current: 0 };
  const brushRadius = getActivityLineRadiusFromControl(lineThickness);
  const cullPadding = Math.max(1, brushRadius + 1);
  const toleranceSq = simplificationTolerancePx * simplificationTolerancePx;

  for (let trackIndex = 0; trackIndex < tracks.length; trackIndex++) {
    const track = tracks[trackIndex];
    if (!track.points || track.points.length < 2) {
      continue;
    }

    const worldProjected = getWorldProjectedTrack(track, zoom);
    if (worldProjected.length < 4) {
      continue;
    }
    let lastKeptX = (worldProjected[0] - topLeftX) * pixelDensity;
    let lastKeptY = (worldProjected[1] - topLeftY) * pixelDensity;
    let prevX = lastKeptX;
    let prevY = lastKeptY;

    for (let pointIdx = 1; pointIdx < track.points.length; pointIdx++) {
      const x = (worldProjected[pointIdx * 2] - topLeftX) * pixelDensity;
      const y = (worldProjected[pointIdx * 2 + 1] - topLeftY) * pixelDensity;
      const isLast = pointIdx === track.points.length - 1;

      if (!isLast && !shouldKeepPoint(x, y, lastKeptX, lastKeptY, toleranceSq)) {
        continue;
      }

      if (!isOutsideViewport(prevX, prevY, x, y, canvasWidth, canvasHeight, cullPadding)) {
        drawLineToAccumulator(
          accumulator,
          canvasWidth,
          canvasHeight,
          prevX,
          prevY,
          x,
          y,
          lineThickness,
          touchedBounds,
          maxAccumulatorCountRef
        );
      }

      prevX = x;
      prevY = y;
      lastKeptX = x;
      lastKeptY = y;
    }
  }

  const response: HeatmapWorkerResponse = {
    accumulator: accumulator.buffer,
    touchedBounds,
    maxAccumulatorCount: Math.floor(maxAccumulatorCountRef.current),
  };

  workerSelf.postMessage(response, [response.accumulator]);
};
