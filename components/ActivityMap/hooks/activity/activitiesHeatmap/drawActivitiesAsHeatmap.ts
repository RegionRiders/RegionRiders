'use client';

import type { RefObject } from 'react';
import L from 'leaflet';
import { createLatLngToPixelConverter } from '@/components/ActivityMap/hooks/activity/activitiesHeatmap/utils/canvasProjection';
import { createCanvasContext } from '@/components/ActivityMap/hooks/activity/activitiesHeatmap/utils/canvasSetup';
import { validateCanvasDimensions } from '@/components/ActivityMap/hooks/activity/activitiesHeatmap/utils/canvasValidation';
import { logDimensionError } from '@/components/ActivityMap/hooks/activity/activitiesHeatmap/utils/dimensionLogging';
import {
  buildHeatmapColorLut,
  getAdaptiveHeatmapQuality,
} from '@/components/ActivityMap/hooks/activity/activitiesHeatmap/utils/heatmapPerformance';
import { smoothHeatmapEdges } from '@/components/ActivityMap/hooks/activity/activitiesHeatmap/utils/smoothHeatmapEdges';
import { processTracksChunked } from '@/components/ActivityMap/hooks/activity/activitiesHeatmap/utils/trackProcessor';
import {
  processTracksWithWorker,
  supportsHeatmapWorker,
} from '@/components/ActivityMap/hooks/activity/activitiesHeatmap/utils/workerProcessor';
import { ColorThreshold } from '@/components/ActivityMap/mapTypes';
import { createComponentLogger } from '@/lib/logger/client';
import { GPXTrack } from '@/lib/types';
import { CanvasDimensions, HeatmapRefs, PixelBounds, RenderState } from '../activityTypes';
import { ensureMapPane } from '../utils/ensureMapPane';

const logger = createComponentLogger('drawActivitiesAsHeatmap');
// Skip smoothing when touched area exceeds half the canvas to avoid expensive full-frame post-processing.
const SMOOTHING_ADAPTIVE_THRESHOLD = 0.5;
const CROPPED_EXPORT_AREA_THRESHOLD = 0.6;
// Keep full-viewport overlays to avoid visible pop-out/pop-in during pan updates.
const ENABLE_CROPPED_EXPORT = false;

function terminateActiveWorker(refs: HeatmapRefs): void {
  if (refs.processingWorkerRef?.current) {
    refs.processingWorkerRef.current.terminate();
    refs.processingWorkerRef.current = null;
  }
}

function getMaxAccumulatorCountInBounds(
  accumulator: Float32Array,
  canvasWidth: number,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number
): number {
  let maxCount = 0;
  for (let y = minY; y <= maxY; y++) {
    const rowStart = y * canvasWidth;
    for (let x = minX; x <= maxX; x++) {
      const value = accumulator[rowStart + x];
      if (value > maxCount) {
        maxCount = value;
      }
    }
  }
  return Math.floor(maxCount);
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
  colorThresholds?: ColorThreshold[],
  smoothingEnabled: boolean = true,
  previousRenderDurationMsRef?: RefObject<number | null>
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
      URL.revokeObjectURL(imageUrlRef.current);
      imageUrlRef.current = null;
    }
  }

  const minX = touchedBounds ? Math.max(0, touchedBounds.minX) : 0;
  const minY = touchedBounds ? Math.max(0, touchedBounds.minY) : 0;
  const maxX = touchedBounds ? Math.min(canvasWidth - 1, touchedBounds.maxX) : canvasWidth - 1;
  const maxY = touchedBounds ? Math.min(canvasHeight - 1, touchedBounds.maxY) : canvasHeight - 1;

  const maxAccumulatorCount =
    state.maxAccumulatorCount && state.maxAccumulatorCount > 0
      ? state.maxAccumulatorCount
      : getMaxAccumulatorCountInBounds(accumulator, canvasWidth, minX, minY, maxX, maxY);
  const safeMaxAccumulatorCount =
    Number.isFinite(maxAccumulatorCount) && maxAccumulatorCount > 0
      ? Math.floor(maxAccumulatorCount)
      : 1;
  const lut = buildHeatmapColorLut(
    safeMaxAccumulatorCount,
    currentZoom,
    lineThickness,
    layerTransparency,
    colorThresholds && colorThresholds.length > 0 ? colorThresholds : undefined
  );

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const i = y * canvasWidth + x;
      const count = accumulator[i];
      if (count === 0) {
        continue;
      }
      const clampedCount = Math.min(safeMaxAccumulatorCount, Math.max(0, Math.floor(count)));
      const lutIndex = clampedCount * 4;
      const pixelIndex = i * 4;

      data[pixelIndex] = lut[lutIndex];
      data[pixelIndex + 1] = lut[lutIndex + 1];
      data[pixelIndex + 2] = lut[lutIndex + 2];
      data[pixelIndex + 3] = lut[lutIndex + 3];
    }
  }

  const touchedArea = (maxX - minX + 1) * (maxY - minY + 1);
  const totalArea = canvasWidth * canvasHeight;
  const smoothingAllowed =
    smoothingEnabled && touchedArea / totalArea <= SMOOTHING_ADAPTIVE_THRESHOLD;
  if (touchedBounds && smoothingAllowed) {
    smoothHeatmapEdges(data, accumulator, canvasWidth, canvasHeight, touchedBounds);
  }

  ctx.putImageData(imageData, 0, 0);
  let imageSource = state.canvas;
  let targetBounds = bounds;
  const shouldUseCroppedExport =
    ENABLE_CROPPED_EXPORT &&
    touchedBounds !== null &&
    touchedArea / totalArea <= CROPPED_EXPORT_AREA_THRESHOLD &&
    typeof map.unproject === 'function';

  if (shouldUseCroppedExport) {
    const cropWidth = maxX - minX + 1;
    const cropHeight = maxY - minY + 1;
    const cropImageData = ctx.getImageData(minX, minY, cropWidth, cropHeight);
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = cropWidth;
    exportCanvas.height = cropHeight;
    const exportCtx = exportCanvas.getContext('2d');
    if (exportCtx) {
      exportCtx.putImageData(cropImageData, 0, 0);
      imageSource = exportCanvas;
      const nw = map.unproject(
        L.point(
          state.topLeft.x + minX / state.heatmapDensity,
          state.topLeft.y + minY / state.heatmapDensity
        ),
        currentZoom
      );
      const se = map.unproject(
        L.point(
          state.topLeft.x + (maxX + 1) / state.heatmapDensity,
          state.topLeft.y + (maxY + 1) / state.heatmapDensity
        ),
        currentZoom
      );
      targetBounds = L.latLngBounds(nw, se);
    }
  }

  imageSource.toBlob((blob) => {
    if (!blob || shouldAbort() || activeRenderIdRef.current !== renderId) {
      return;
    }
    try {
      const imageUrl = URL.createObjectURL(blob);
      const nextLayer = L.imageOverlay(imageUrl, targetBounds, {
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

      const totalDurationNumber = performance.now() - state.renderStartTime;
      if (previousRenderDurationMsRef) {
        previousRenderDurationMsRef.current = totalDurationNumber;
      }
      const totalDuration = totalDurationNumber.toFixed(2);
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
  const adaptiveQuality = getAdaptiveHeatmapQuality(
    refs.heatmapDensity,
    currentZoom,
    refs.previousRenderDurationMsRef?.current ?? null
  );
  const effectiveDensity = adaptiveQuality.effectiveDensity;
  // This render becomes the currently active generation; abort is now driven by render id changes.
  refs.renderAbortRef.current = false;

  if (refs.renderTimeoutRef.current) {
    clearTimeout(refs.renderTimeoutRef.current);
  }
  terminateActiveWorker(refs);

  try {
    ensureMapPane(map, 'heatmapPane', '450');
    const bounds = map.getBounds();
    const topLeft = map.project(bounds.getNorthWest(), map.getZoom());
    const bottomRight = map.project(bounds.getSouthEast(), map.getZoom());

    const canvasWidth = Math.max(1, Math.round((bottomRight.x - topLeft.x) * effectiveDensity));
    const canvasHeight = Math.max(1, Math.round((bottomRight.y - topLeft.y) * effectiveDensity));

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
    let accumulator = new Float32Array(canvasWidth * canvasHeight);
    const latlngToPixel = createLatLngToPixelConverter(map, topLeft, effectiveDensity, currentZoom);
    const tracksArray = Array.from(tracks.values());
    const touchedBounds: PixelBounds = {
      minX: canvasWidth,
      minY: canvasHeight,
      maxX: -1,
      maxY: -1,
    };
    const maxAccumulatorCountRef = { current: 0 };

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
      heatmapDensity: effectiveDensity,
      renderStartTime,
      touchedBounds: null,
      maxAccumulatorCount: 0,
    };

    const completeRender = (): void =>
      finishRender(
        {
          ...renderState,
          accumulator,
          touchedBounds: touchedBounds.maxX >= touchedBounds.minX ? touchedBounds : null,
          maxAccumulatorCount: Math.floor(maxAccumulatorCountRef.current),
        },
        refs.currentImageLayerRef,
        refs.currentImageUrlRef,
        refs.activeRenderIdRef,
        renderId,
        shouldAbort,
        map,
        lineThickness,
        refs.layerTransparency,
        refs.heatmapColorThresholds,
        adaptiveQuality.smoothingAllowed,
        refs.previousRenderDurationMsRef
      );

    const workerSupported = supportsHeatmapWorker() && !!refs.processingWorkerRef;
    if (workerSupported) {
      terminateActiveWorker(refs);
      const { worker, result } = processTracksWithWorker({
        tracks,
        canvasWidth,
        canvasHeight,
        topLeftX: topLeft.x,
        topLeftY: topLeft.y,
        zoom: currentZoom,
        pixelDensity: effectiveDensity,
        lineThickness,
        simplificationTolerancePx: adaptiveQuality.simplificationTolerancePx,
      });
      if (refs.processingWorkerRef) {
        refs.processingWorkerRef.current = worker;
      }
      result
        .then((workerResult) => {
          if (refs.processingWorkerRef?.current === worker) {
            refs.processingWorkerRef.current = null;
          }
          if (shouldAbort()) {
            worker.terminate();
            return;
          }
          accumulator = new Float32Array(workerResult.accumulator);
          touchedBounds.minX = workerResult.touchedBounds.minX;
          touchedBounds.minY = workerResult.touchedBounds.minY;
          touchedBounds.maxX = workerResult.touchedBounds.maxX;
          touchedBounds.maxY = workerResult.touchedBounds.maxY;
          maxAccumulatorCountRef.current = workerResult.maxAccumulatorCount;
          worker.terminate();
          completeRender();
        })
        .catch((error) => {
          if (refs.processingWorkerRef?.current === worker) {
            refs.processingWorkerRef.current = null;
          }
          worker.terminate();
          if (shouldAbort()) {
            return;
          }
          logger.warn(`Worker heatmap processing failed, falling back to main thread: ${error}`);
          processTracksChunked(
            tracksArray,
            accumulator,
            canvasWidth,
            canvasHeight,
            latlngToPixel,
            lineThickness,
            shouldAbort,
            touchedBounds,
            completeRender,
            {
              simplificationTolerancePx: adaptiveQuality.simplificationTolerancePx,
              maxAccumulatorCountRef,
            }
          );
        });
      return;
    }

    processTracksChunked(
      tracksArray,
      accumulator,
      canvasWidth,
      canvasHeight,
      latlngToPixel,
      lineThickness,
      shouldAbort,
      touchedBounds,
      completeRender,
      {
        simplificationTolerancePx: adaptiveQuality.simplificationTolerancePx,
        maxAccumulatorCountRef,
      }
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

  const renderHeatmap = (): void => {
    if (!map) {
      return;
    }
    refs.activeRenderIdRef.current += 1;
    renderHeatmapInternal(map, tracks, refs, refs.lineThickness, refs.activeRenderIdRef.current);
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

    if (zoomChangeTimeout) {
      clearTimeout(zoomChangeTimeout);
    }

    terminateActiveWorker(refs);

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
