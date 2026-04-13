'use client';

import type { RefObject } from 'react';
import L from 'leaflet';
import { validateCanvasDimensions } from '@/components/ActivityMap/hooks/activity/activitiesHeatmap/utils/canvasValidation';
import { logDimensionError } from '@/components/ActivityMap/hooks/activity/activitiesHeatmap/utils/dimensionLogging';
import { getHeatmapColorForCount } from '@/components/ActivityMap/hooks/activity/activitiesHeatmap/utils/getHeatmapColorForCount';
import { smoothHeatmapEdges } from '@/components/ActivityMap/hooks/activity/activitiesHeatmap/utils/smoothHeatmapEdges';
import { processTracksChunked } from '@/components/ActivityMap/hooks/activity/activitiesHeatmap/utils/trackProcessor';
import { ColorThreshold } from '@/components/ActivityMap/mapTypes';
import { createComponentLogger } from '@/lib/logger/client';
import { GPXTrack } from '@/lib/types';
import {
  CanvasDimensions,
  HeatmapRefs,
  PixelBounds,
  PixelPoint,
  ProjectedTrackCacheEntry,
  RenderState,
} from '../activityTypes';
import { ensureMapPane } from '../utils/ensureMapPane';

const logger = createComponentLogger('drawActivitiesAsHeatmap');
// Skip smoothing when touched area exceeds half the canvas to avoid expensive full-frame post-processing.
const SMOOTHING_ADAPTIVE_THRESHOLD = 0.5;
const MAX_COLOR_LUT_SIZE = 65536;
const MAP_CHANGE_DEBOUNCE_MS = 75;

const SIGNATURE_DECIMALS = 6;

function getTrackShapeSignature(track: GPXTrack): string {
  const points = track.points ?? [];
  if (points.length === 0) {
    return '0';
  }
  const first = points[0];
  const last = points[points.length - 1];
  return `${points.length}:${first.lat},${first.lon}:${last.lat},${last.lon}`;
}

function getOrCreateRenderSurface(
  refs: HeatmapRefs,
  width: number,
  height: number
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
  let canvas = refs.heatmapCanvasRef.current;
  let ctx = refs.heatmapContextRef.current;
  const needsResize = !canvas || !ctx || canvas.width !== width || canvas.height !== height;

  if (needsResize) {
    if (!canvas) {
      canvas = document.createElement('canvas');
      refs.heatmapCanvasRef.current = canvas;
    }
    canvas.width = width;
    canvas.height = height;
    ctx = canvas.getContext('2d');
    refs.heatmapContextRef.current = ctx;
  }

  if (!canvas || !ctx) {
    logger.error('Failed to get canvas context');
    return null;
  }

  return { canvas, ctx };
}

function getOrCreateProjectedPoints(
  map: L.Map,
  track: GPXTrack,
  zoom: number,
  projectedTrackCacheRef: RefObject<Map<string, ProjectedTrackCacheEntry>>
): PixelPoint[] {
  const trackShapeSignature = getTrackShapeSignature(track);
  const cache = projectedTrackCacheRef.current;
  const cached = cache.get(track.id);
  if (cached && cached.zoom === zoom && cached.trackShapeSignature === trackShapeSignature) {
    return cached.projectedPoints;
  }

  const projectedPoints = (track.points ?? []).map((point) => {
    const projected = map.project({ lat: point.lat, lng: point.lon }, zoom);
    return { x: projected.x, y: projected.y };
  });
  cache.set(track.id, { zoom, trackShapeSignature, projectedPoints });
  return projectedPoints;
}

function buildColorLut(
  maxCount: number,
  currentZoom: number,
  lineThickness: number,
  colorThresholds?: ColorThreshold[]
): Uint8ClampedArray {
  const cappedMaxCount = Math.min(maxCount, MAX_COLOR_LUT_SIZE - 1);
  const lut = new Uint8ClampedArray((cappedMaxCount + 1) * 4);
  for (let count = 1; count <= cappedMaxCount; count++) {
    const [r, g, b, a] = getHeatmapColorForCount(
      count,
      currentZoom,
      lineThickness,
      colorThresholds && colorThresholds.length > 0 ? colorThresholds : undefined
    );
    const lutIndex = count * 4;
    lut[lutIndex] = r;
    lut[lutIndex + 1] = g;
    lut[lutIndex + 2] = b;
    lut[lutIndex + 3] = Math.round(a * 255);
  }
  return lut;
}

function buildRenderSignature(
  map: L.Map,
  tracks: Map<string, GPXTrack>,
  refs: HeatmapRefs
): string {
  const bounds = map.getBounds();
  const north =
    typeof (bounds as L.LatLngBounds).getNorth === 'function'
      ? (bounds as L.LatLngBounds).getNorth()
      : bounds.getNorthWest().lat;
  const south =
    typeof (bounds as L.LatLngBounds).getSouth === 'function'
      ? (bounds as L.LatLngBounds).getSouth()
      : bounds.getSouthEast().lat;
  const west =
    typeof (bounds as L.LatLngBounds).getWest === 'function'
      ? (bounds as L.LatLngBounds).getWest()
      : bounds.getNorthWest().lng;
  const east =
    typeof (bounds as L.LatLngBounds).getEast === 'function'
      ? (bounds as L.LatLngBounds).getEast()
      : bounds.getSouthEast().lng;
  const thresholdSignature = (refs.heatmapColorThresholds ?? [])
    .map(({ threshold, color }) => `${threshold}:${color.join(',')}`)
    .join('|');
  const trackSignature = Array.from(tracks.values())
    .map((track) => `${track.id}:${getTrackShapeSignature(track)}`)
    .join('|');

  return [
    map.getZoom(),
    refs.heatmapDensity,
    refs.lineThickness,
    north.toFixed(SIGNATURE_DECIMALS),
    south.toFixed(SIGNATURE_DECIMALS),
    west.toFixed(SIGNATURE_DECIMALS),
    east.toFixed(SIGNATURE_DECIMALS),
    thresholdSignature,
    trackSignature,
  ].join('~');
}

/**
 * Renders accumulator data as image and adds to map
 */
function finishRender(
  state: RenderState,
  currentImageLayerRef: RefObject<L.ImageOverlay | null>,
  currentImageUrlRef: RefObject<string | null>,
  activeRenderIdRef: RefObject<number>,
  renderId: number,
  shouldAbort: () => boolean,
  map: L.Map,
  lineThickness: number = 2,
  layerTransparency: number = 1,
  colorThresholds?: ColorThreshold[]
): void {
  if (shouldAbort()) {
    return;
  }

  const finishStartTime = performance.now();
  const { ctx, accumulator, canvasWidth, canvasHeight, currentZoom, bounds, touchedBounds } = state;

  if (
    !ctx ||
    !isFinite(canvasWidth) ||
    !isFinite(canvasHeight) ||
    canvasWidth <= 0 ||
    canvasHeight <= 0
  ) {
    logger.error(
      `Invalid state in finishRender: ${JSON.stringify({
        hasCtx: !!ctx,
        canvasWidth,
        canvasHeight,
      })}`
    );
    return;
  }

  const imageData = ctx.createImageData(canvasWidth, canvasHeight);
  const data = imageData.data;
  const hasTouchedPixels = touchedBounds !== null;

  if (!hasTouchedPixels) {
    const imageLayerRef = currentImageLayerRef as { current: L.ImageOverlay | null };
    const imageUrlRef = currentImageUrlRef as { current: string | null };
    if (imageLayerRef.current) {
      map.removeLayer(imageLayerRef.current);
      imageLayerRef.current = null;
    }
    if (imageUrlRef.current) {
      if (imageUrlRef.current.startsWith('blob:')) {
        URL.revokeObjectURL(imageUrlRef.current);
      }
      imageUrlRef.current = null;
    }
  }

  const minX = touchedBounds ? Math.max(0, touchedBounds.minX) : 0;
  const minY = touchedBounds ? Math.max(0, touchedBounds.minY) : 0;
  const maxX = touchedBounds ? Math.min(canvasWidth - 1, touchedBounds.maxX) : canvasWidth - 1;
  const maxY = touchedBounds ? Math.min(canvasHeight - 1, touchedBounds.maxY) : canvasHeight - 1;

  let maxCount = 0;
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const count = Math.floor(accumulator[y * canvasWidth + x]);
      if (count > maxCount) {
        maxCount = count;
      }
    }
  }
  const colorLut = buildColorLut(maxCount, currentZoom, lineThickness, colorThresholds);

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const i = y * canvasWidth + x;
      const count = Math.floor(accumulator[i]);
      if (count === 0) {
        continue;
      }

      const pixelIndex = i * 4;
      if (count >= MAX_COLOR_LUT_SIZE) {
        const [r, g, b, a] = getHeatmapColorForCount(
          count,
          currentZoom,
          lineThickness,
          colorThresholds && colorThresholds.length > 0 ? colorThresholds : undefined
        );
        data[pixelIndex] = r;
        data[pixelIndex + 1] = g;
        data[pixelIndex + 2] = b;
        data[pixelIndex + 3] = Math.round(a * 255);
        continue;
      }

      const lutIndex = count * 4;

      data[pixelIndex] = colorLut[lutIndex];
      data[pixelIndex + 1] = colorLut[lutIndex + 1];
      data[pixelIndex + 2] = colorLut[lutIndex + 2];
      data[pixelIndex + 3] = colorLut[lutIndex + 3];
    }
  }

  const touchedArea = (maxX - minX + 1) * (maxY - minY + 1);
  const totalArea = canvasWidth * canvasHeight;
  const smoothingAllowed = touchedArea / totalArea <= SMOOTHING_ADAPTIVE_THRESHOLD;
  if (touchedBounds && smoothingAllowed) {
    smoothHeatmapEdges(data, accumulator, canvasWidth, canvasHeight, touchedBounds);
  }

  ctx.putImageData(imageData, 0, 0);
  state.canvas.toBlob((blob) => {
    if (!blob || shouldAbort() || activeRenderIdRef.current !== renderId) {
      return;
    }

    try {
      const nextUrl = URL.createObjectURL(blob);
      const previousLayer = currentImageLayerRef.current;
      const previousUrl = currentImageUrlRef.current;
      const targetOpacity =
        previousLayer && typeof previousLayer.options.opacity === 'number'
          ? previousLayer.options.opacity
          : layerTransparency;
      const nextLayer = L.imageOverlay(nextUrl, bounds, {
        pane: 'heatmapPane',
        opacity: previousLayer ? 0 : targetOpacity,
      }).addTo(map);

      const commitSwap = (): void => {
        if (shouldAbort() || activeRenderIdRef.current !== renderId) {
          if (map.hasLayer(nextLayer)) {
            map.removeLayer(nextLayer);
          }
          if (nextUrl.startsWith('blob:')) {
            URL.revokeObjectURL(nextUrl);
          }
          return;
        }

        if (previousLayer && map.hasLayer(previousLayer)) {
          map.removeLayer(previousLayer);
        }
        if (previousUrl?.startsWith('blob:')) {
          URL.revokeObjectURL(previousUrl);
        }

        currentImageLayerRef.current = nextLayer;
        currentImageUrlRef.current = nextUrl;
        nextLayer.setBounds(bounds);
        if (previousLayer) {
          nextLayer.setOpacity(targetOpacity);
        }
      };

      if (previousLayer && typeof (nextLayer as L.ImageOverlay).once === 'function') {
        (nextLayer as L.ImageOverlay).once('load', commitSwap);
      } else {
        commitSwap();
      }

      if (shouldAbort() || activeRenderIdRef.current !== renderId) {
        return;
      }

      const totalDuration = (performance.now() - state.renderStartTime).toFixed(2);
      const finishDuration = (performance.now() - finishStartTime).toFixed(2);
      logger.info(
        `Heatmap rendered at zoom ${currentZoom} (finish: ${finishDuration}ms, total: ${totalDuration}ms)`
      );
    } catch (error) {
      logger.error(`Error adding image overlay: ${error}`);
    }
  });
}

/**
 * Main heatmap rendering function
 */
function renderHeatmapInternal(
  map: L.Map,
  tracks: Map<string, GPXTrack>,
  refs: HeatmapRefs,
  lineThickness: number,
  renderId: number
): void {
  if (!map?.getBounds) {
    logger.warn('Map not available');
    return;
  }

  const renderStartTime = performance.now();
  const currentZoom = map.getZoom();
  // This render becomes the currently active generation; abort is now driven by render id changes.
  refs.renderAbortRef.current = false;

  if (refs.renderTimeoutRef.current) {
    clearTimeout(refs.renderTimeoutRef.current);
  }

  try {
    ensureMapPane(map, 'heatmapPane', '450');
    const bounds = map.getBounds();
    const topLeft = map.project(bounds.getNorthWest(), map.getZoom());
    const bottomRight = map.project(bounds.getSouthEast(), map.getZoom());

    const canvasWidth = Math.max(1, Math.round((bottomRight.x - topLeft.x) * refs.heatmapDensity));
    const canvasHeight = Math.max(1, Math.round((bottomRight.y - topLeft.y) * refs.heatmapDensity));

    const dimensions: CanvasDimensions = {
      canvasWidth,
      canvasHeight,
      topLeft,
      bottomRight,
    };

    if (!validateCanvasDimensions(dimensions)) {
      logDimensionError(dimensions, currentZoom, 'Invalid canvas dimensions', logger);
      return;
    }

    const canvasResult = getOrCreateRenderSurface(refs, canvasWidth, canvasHeight);
    if (!canvasResult) {
      return;
    }

    const { canvas, ctx } = canvasResult;
    const accumulator = new Float32Array(canvasWidth * canvasHeight);
    const tracksArray = Array.from(tracks.values());
    const projectedTracks = new Map<string, PixelPoint[]>();
    for (const track of tracksArray) {
      projectedTracks.set(
        track.id,
        getOrCreateProjectedPoints(map, track, currentZoom, refs.projectedTrackCacheRef)
      );
    }
    const touchedBounds: PixelBounds = {
      minX: canvasWidth,
      minY: canvasHeight,
      maxX: -1,
      maxY: -1,
    };

    const shouldAbort = (): boolean =>
      refs.renderAbortRef.current || refs.activeRenderIdRef.current !== renderId;

    const renderState: RenderState = {
      canvas,
      ctx,
      accumulator,
      bounds,
      canvasWidth,
      canvasHeight,
      topLeft,
      currentZoom,
      renderStartTime,
      touchedBounds: null,
    };

    processTracksChunked(
      tracksArray,
      accumulator,
      canvasWidth,
      canvasHeight,
      projectedTracks,
      topLeft.x,
      topLeft.y,
      refs.heatmapDensity,
      lineThickness,
      shouldAbort,
      touchedBounds,
      () =>
        finishRender(
          {
            ...renderState,
            touchedBounds: touchedBounds.maxX >= touchedBounds.minX ? touchedBounds : null,
          },
          refs.currentImageLayerRef,
          refs.currentImageUrlRef,
          refs.activeRenderIdRef,
          renderId,
          shouldAbort,
          map,
          lineThickness,
          refs.layerTransparency,
          refs.heatmapColorThresholds
        )
    );
  } catch (error) {
    logger.error(`Error rendering heatmap: ${error}`);
  }
}

/**
 * Renders GPX tracks as a heatmap overlay on the map
 *
 * @param map - Leaflet map instance
 * @param tracks - Map of GPX tracks to render
 * @param refs - Refs for managing rendering state
 * @returns Cleanup function to remove listeners and cancel pending renders
 */
export function drawActivitiesAsHeatmap(
  map: L.Map | null,
  tracks: Map<string, GPXTrack>,
  refs: HeatmapRefs,
  options?: {
    preserveLayerOnCleanup?: boolean;
  }
): () => void {
  const { currentImageLayerRef, currentImageUrlRef, renderAbortRef, renderTimeoutRef } = refs;
  const preserveLayerOnCleanup = options?.preserveLayerOnCleanup === true;

  const renderHeatmap = (): void => {
    if (!map || typeof map.getBounds !== 'function') {
      return;
    }
    const renderSignature = buildRenderSignature(map, tracks, refs);
    if (
      refs.lastRenderSignatureRef.current === renderSignature &&
      refs.currentImageLayerRef.current !== null
    ) {
      return;
    }
    refs.lastRenderSignatureRef.current = renderSignature;
    refs.activeRenderIdRef.current += 1;
    renderHeatmapInternal(map, tracks, refs, refs.lineThickness, refs.activeRenderIdRef.current);
  };

  const handleMapChange = (): void => {
    if (renderTimeoutRef.current) {
      clearTimeout(renderTimeoutRef.current);
    }

    renderTimeoutRef.current = setTimeout(() => {
      renderHeatmap();
      renderTimeoutRef.current = null;
    }, MAP_CHANGE_DEBOUNCE_MS);
  };

  if (map) {
    map.on('zoomend', handleMapChange);
    map.on('moveend', handleMapChange);

    // Initial render
    renderHeatmap();
  }

  return () => {
    logger.info('Cleanup');
    renderAbortRef.current = true;
    refs.activeRenderIdRef.current += 1;

    if (renderTimeoutRef.current) {
      clearTimeout(renderTimeoutRef.current);
    }

    if (map) {
      map.off('zoomend', handleMapChange);
      map.off('moveend', handleMapChange);

      if (!preserveLayerOnCleanup) {
        if (currentImageLayerRef.current && map.hasLayer(currentImageLayerRef.current)) {
          try {
            map.removeLayer(currentImageLayerRef.current);
          } catch (e) {
            logger.warn('Failed to remove image layer during cleanup', e);
          }
        }
        currentImageLayerRef.current = null;
        if (currentImageUrlRef.current) {
          if (currentImageUrlRef.current.startsWith('blob:')) {
            URL.revokeObjectURL(currentImageUrlRef.current);
          }
          currentImageUrlRef.current = null;
        }
      }
    }
  };
}
