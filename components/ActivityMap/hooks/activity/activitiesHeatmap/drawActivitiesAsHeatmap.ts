'use client';

import type { RefObject } from 'react';
import L from 'leaflet';
import { createLatLngToPixelConverter } from '@/components/ActivityMap/hooks/activity/activitiesHeatmap/utils/canvasProjection';
import { createCanvasContext } from '@/components/ActivityMap/hooks/activity/activitiesHeatmap/utils/canvasSetup';
import { validateCanvasDimensions } from '@/components/ActivityMap/hooks/activity/activitiesHeatmap/utils/canvasValidation';
import { logDimensionError } from '@/components/ActivityMap/hooks/activity/activitiesHeatmap/utils/dimensionLogging';
import { getHeatmapColorForCount } from '@/components/ActivityMap/hooks/activity/activitiesHeatmap/utils/getHeatmapColorForCount';
import { smoothHeatmapEdges } from '@/components/ActivityMap/hooks/activity/activitiesHeatmap/utils/smoothHeatmapEdges';
import { processTracksChunked } from '@/components/ActivityMap/hooks/activity/activitiesHeatmap/utils/trackProcessor';
import { ColorThreshold } from '@/components/ActivityMap/mapTypes';
import { createComponentLogger } from '@/lib/logger/client';
import { GPXTrack } from '@/lib/types';
import { CanvasDimensions, HeatmapRefs, PixelBounds, RenderState } from '../activityTypes';
import { ensureMapPane } from '../utils/ensureMapPane';

const logger = createComponentLogger('drawActivitiesAsHeatmap');
const SMOOTHING_ADAPTIVE_THRESHOLD = 0.5;

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
  edgeSmoothingEnabled: boolean = true,
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
    return;
  }

  const minX = touchedBounds ? Math.max(0, touchedBounds.minX) : 0;
  const minY = touchedBounds ? Math.max(0, touchedBounds.minY) : 0;
  const maxX = touchedBounds ? Math.min(canvasWidth - 1, touchedBounds.maxX) : canvasWidth - 1;
  const maxY = touchedBounds ? Math.min(canvasHeight - 1, touchedBounds.maxY) : canvasHeight - 1;

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const i = y * canvasWidth + x;
      const count = accumulator[i];
      if (count === 0) {
        continue;
      }

      const [r, g, b, a] = getHeatmapColorForCount(
        count,
        currentZoom,
        lineThickness,
        colorThresholds && colorThresholds.length > 0 ? colorThresholds : undefined
      );
      const pixelIndex = i * 4;

      data[pixelIndex] = r;
      data[pixelIndex + 1] = g;
      data[pixelIndex + 2] = b;
      data[pixelIndex + 3] = Math.round(a * layerTransparency * 255);
    }
  }

  const touchedArea = (maxX - minX + 1) * (maxY - minY + 1);
  const totalArea = canvasWidth * canvasHeight;
  const smoothingAllowed = touchedArea / totalArea <= SMOOTHING_ADAPTIVE_THRESHOLD;
  if (edgeSmoothingEnabled && touchedBounds && smoothingAllowed) {
    smoothHeatmapEdges(data, accumulator, canvasWidth, canvasHeight, touchedBounds);
  }

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
  renderId: number
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
    const accumulator = new Float32Array(canvasWidth * canvasHeight);
    const latlngToPixel = createLatLngToPixelConverter(map, topLeft, refs.heatmapDensity, currentZoom);
    const tracksArray = Array.from(tracks.values());
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
      latlngToPixel,
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
          refs.edgeSmoothingEnabled,
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
