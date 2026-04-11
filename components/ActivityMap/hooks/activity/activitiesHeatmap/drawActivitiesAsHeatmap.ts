'use client';

import type { RefObject } from 'react';
import L from 'leaflet';
import { createLatLngToPixelConverter } from '@/components/ActivityMap/hooks/activity/activitiesHeatmap/utils/canvasProjection';
import { createCanvasContext } from '@/components/ActivityMap/hooks/activity/activitiesHeatmap/utils/canvasSetup';
import { validateCanvasDimensions } from '@/components/ActivityMap/hooks/activity/activitiesHeatmap/utils/canvasValidation';
import { logDimensionError } from '@/components/ActivityMap/hooks/activity/activitiesHeatmap/utils/dimensionLogging';
import { HEATMAP_ACCUMULATOR_WORKER_SOURCE } from '@/components/ActivityMap/hooks/activity/activitiesHeatmap/utils/heatmapAccumulatorWorkerSource';
import { renderHeatmapPixelsFromAccumulator } from '@/components/ActivityMap/hooks/activity/activitiesHeatmap/utils/renderHeatmapPixelsFromAccumulator';
import { processTracksChunked } from '@/components/ActivityMap/hooks/activity/activitiesHeatmap/utils/trackProcessor';
import { ColorThreshold } from '@/components/ActivityMap/mapTypes';
import { createComponentLogger } from '@/lib/logger/client';
import { GPXTrack } from '@/lib/types';
import { CanvasDimensions, HeatmapRefs, PixelBounds, RenderState } from '../activityTypes';
import { ensureMapPane } from '../utils/ensureMapPane';

const logger = createComponentLogger('drawActivitiesAsHeatmap');

interface HeatmapAccumulatorWorkerRequest {
  renderId: number;
  tracks: ArrayBuffer[];
  canvasWidth: number;
  canvasHeight: number;
  lineThickness: number;
}

interface HeatmapAccumulatorWorkerSuccess {
  type: 'success';
  renderId: number;
  accumulatorBuffer: ArrayBuffer;
  touchedBounds: PixelBounds | null;
}

interface HeatmapAccumulatorWorkerError {
  type: 'error';
  renderId: number;
  message: string;
}

type HeatmapAccumulatorWorkerResponse =
  | HeatmapAccumulatorWorkerSuccess
  | HeatmapAccumulatorWorkerError;

function createHeatmapAccumulatorWorker(): Worker | null {
  if (typeof Worker === 'undefined') {
    return null;
  }

  try {
    const blob = new Blob([HEATMAP_ACCUMULATOR_WORKER_SOURCE], {
      type: 'application/javascript',
    });
    const url = URL.createObjectURL(blob);
    const worker = new Worker(url);
    URL.revokeObjectURL(url);
    return worker;
  } catch (error) {
    logger.warn('Failed to create heatmap worker, using main-thread fallback', error);
    return null;
  }
}

function projectTracksToPixelBuffers(
  tracksArray: GPXTrack[],
  latlngToPixel: (lat: number, lon: number) => { x: number; y: number }
): ArrayBuffer[] {
  const buffers: ArrayBuffer[] = [];

  for (let trackIndex = 0; trackIndex < tracksArray.length; trackIndex++) {
    const points = tracksArray[trackIndex].points;
    if (!points || points.length < 2) {
      continue;
    }

    const projected = new Float32Array(points.length * 2);
    let offset = 0;
    for (let i = 0; i < points.length; i++) {
      const p = latlngToPixel(points[i].lat, points[i].lon);
      projected[offset++] = p.x;
      projected[offset++] = p.y;
    }

    buffers.push(projected.buffer);
  }

  return buffers;
}

function renderHeatmapOnMainThread(
  tracksArray: GPXTrack[],
  accumulator: Float32Array,
  canvasWidth: number,
  canvasHeight: number,
  latlngToPixel: (lat: number, lon: number) => { x: number; y: number },
  lineThickness: number,
  touchedBounds: PixelBounds,
  shouldAbort: () => boolean,
  onComplete: (computedAccumulator: Float32Array, computedTouchedBounds: PixelBounds | null) => void
): void {
  processTracksChunked(
    tracksArray,
    accumulator,
    canvasWidth,
    canvasHeight,
    latlngToPixel,
    lineThickness,
    shouldAbort,
    touchedBounds,
    () => onComplete(accumulator, touchedBounds.maxX >= touchedBounds.minX ? touchedBounds : null)
  );
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

  const hasTouchedPixels = touchedBounds !== null;
  if (!hasTouchedPixels) {
    const imageLayerRef = currentImageLayerRef as { current: L.ImageOverlay | null };
    const imageUrlRef = currentImageUrlRef as { current: string | null };
    if (imageLayerRef.current) {
      map.removeLayer(imageLayerRef.current);
      imageLayerRef.current = null;
    }
    if (imageUrlRef.current) {
      URL.revokeObjectURL(imageUrlRef.current);
      imageUrlRef.current = null;
    }
    return;
  }

  const pixelData = renderHeatmapPixelsFromAccumulator(
    accumulator,
    canvasWidth,
    canvasHeight,
    currentZoom,
    lineThickness,
    layerTransparency,
    colorThresholds,
    touchedBounds
  );
  const imageData = ctx.createImageData(canvasWidth, canvasHeight);
  imageData.data.set(pixelData);

  ctx.putImageData(imageData, 0, 0);
  const imageSource = state.canvas;

  imageSource.toBlob((blob) => {
    if (!blob || shouldAbort() || activeRenderIdRef.current !== renderId) {
      return;
    }
    try {
      const imageUrl = URL.createObjectURL(blob);
      const nextLayer = L.imageOverlay(imageUrl, bounds, {
        pane: 'heatmapPane',
      }).addTo(map);

      if (shouldAbort() || activeRenderIdRef.current !== renderId) {
        if (map.hasLayer(nextLayer)) {
          map.removeLayer(nextLayer);
        }
        URL.revokeObjectURL(imageUrl);
        return;
      }

      const previousLayer = currentImageLayerRef.current;
      const previousUrl = currentImageUrlRef.current;
      currentImageLayerRef.current = nextLayer;
      currentImageUrlRef.current = imageUrl;
      if (previousLayer && map.hasLayer(previousLayer)) {
        map.removeLayer(previousLayer);
      }
      if (previousUrl) {
        URL.revokeObjectURL(previousUrl);
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
  renderId: number,
  computeWorker: Worker | null
): void {
  if (!map?.getBounds) {
    logger.warn('Map not available');
    return;
  }

  const renderStartTime = performance.now();
  const currentZoom = map.getZoom();
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

    const canvasResult = createCanvasContext(canvasWidth, canvasHeight, logger);
    if (!canvasResult) {
      return;
    }

    const { canvas, ctx } = canvasResult;
    const latlngToPixel = createLatLngToPixelConverter(
      map,
      topLeft,
      refs.heatmapDensity,
      currentZoom
    );
    const tracksArray = Array.from(tracks.values());
    const touchedBounds: PixelBounds = {
      minX: canvasWidth,
      minY: canvasHeight,
      maxX: -1,
      maxY: -1,
    };
    const accumulator = new Float32Array(canvasWidth * canvasHeight);

    const shouldAbort = (): boolean =>
      refs.renderAbortRef.current || refs.activeRenderIdRef.current !== renderId;

    const onComputed = (
      computedAccumulator: Float32Array,
      computedTouchedBounds: PixelBounds | null
    ): void => {
      finishRender(
        {
          canvas,
          ctx,
          accumulator: computedAccumulator,
          bounds,
          canvasWidth,
          canvasHeight,
          topLeft,
          currentZoom,
          renderStartTime,
          touchedBounds: computedTouchedBounds,
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
      );
    };

    if (computeWorker) {
      let didFallback = false;
      const fallbackToMainThread = (): void => {
        if (didFallback || shouldAbort()) {
          return;
        }
        didFallback = true;
        renderHeatmapOnMainThread(
          tracksArray,
          accumulator,
          canvasWidth,
          canvasHeight,
          latlngToPixel,
          lineThickness,
          touchedBounds,
          shouldAbort,
          onComputed
        );
      };

      computeWorker.onmessage = (event: MessageEvent<HeatmapAccumulatorWorkerResponse>): void => {
        const message = event.data;
        if (message.renderId !== renderId || shouldAbort()) {
          return;
        }

        if (message.type === 'error') {
          logger.warn(`Heatmap worker failed for render ${renderId}: ${message.message}`);
          fallbackToMainThread();
          return;
        }

        onComputed(new Float32Array(message.accumulatorBuffer), message.touchedBounds);
      };

      computeWorker.onerror = (error): void => {
        logger.warn('Heatmap worker runtime error, using main-thread fallback', error);
        fallbackToMainThread();
      };

      const projectedTrackBuffers = projectTracksToPixelBuffers(tracksArray, latlngToPixel);
      const request: HeatmapAccumulatorWorkerRequest = {
        renderId,
        tracks: projectedTrackBuffers,
        canvasWidth,
        canvasHeight,
        lineThickness,
      };

      try {
        computeWorker.postMessage(request, projectedTrackBuffers);
        return;
      } catch (error) {
        logger.warn('Failed to post message to heatmap worker, using main-thread fallback', error);
        fallbackToMainThread();
        return;
      }
    }

    renderHeatmapOnMainThread(
      tracksArray,
      accumulator,
      canvasWidth,
      canvasHeight,
      latlngToPixel,
      lineThickness,
      touchedBounds,
      shouldAbort,
      onComputed
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
  refs: HeatmapRefs
): () => void {
  const { currentImageLayerRef, currentImageUrlRef, renderAbortRef, renderTimeoutRef } = refs;

  let zoomChangeTimeout: ReturnType<typeof setTimeout> | null = null;
  let computeWorker: Worker | null = null;

  const terminateWorker = (): void => {
    if (computeWorker) {
      computeWorker.terminate();
      computeWorker = null;
    }
  };

  const renderHeatmap = (): void => {
    if (!map) {
      return;
    }

    refs.activeRenderIdRef.current += 1;
    terminateWorker();
    computeWorker = createHeatmapAccumulatorWorker();
    renderHeatmapInternal(
      map,
      tracks,
      refs,
      refs.lineThickness,
      refs.activeRenderIdRef.current,
      computeWorker
    );
  };

  const handleMapChange = (): void => {
    if (zoomChangeTimeout) {
      clearTimeout(zoomChangeTimeout);
    }

    zoomChangeTimeout = setTimeout(() => {
      renderHeatmap();
    }, 0);
  };

  if (map) {
    map.on('zoomend', handleMapChange);
    map.on('moveend', handleMapChange);

    renderHeatmap();
  }

  return () => {
    logger.info('Cleanup');
    renderAbortRef.current = true;
    refs.activeRenderIdRef.current += 1;

    terminateWorker();

    if (renderTimeoutRef.current) {
      clearTimeout(renderTimeoutRef.current);
    }

    if (zoomChangeTimeout) {
      clearTimeout(zoomChangeTimeout);
    }

    if (map) {
      map.off('zoomend', handleMapChange);
      map.off('moveend', handleMapChange);

      if (currentImageLayerRef.current && map.hasLayer(currentImageLayerRef.current)) {
        try {
          map.removeLayer(currentImageLayerRef.current);
        } catch (e) {
          logger.warn('Failed to remove image layer during cleanup', e);
        }
      }
      if (currentImageUrlRef.current) {
        URL.revokeObjectURL(currentImageUrlRef.current);
        currentImageUrlRef.current = null;
      }
    }
  };
}
