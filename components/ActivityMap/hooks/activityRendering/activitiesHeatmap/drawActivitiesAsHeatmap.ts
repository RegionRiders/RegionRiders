'use client';

import type { RefObject } from 'react';
import L from 'leaflet';
import { HEATMAP_CONFIG } from '@/components/ActivityMap/config/mapConfig';
import { createLatLngToPixelConverter } from '@/components/ActivityMap/hooks/activityRendering/activitiesHeatmap/utils/canvasProjection';
import { createCanvasContext } from '@/components/ActivityMap/hooks/activityRendering/activitiesHeatmap/utils/canvasSetup';
import { validateCanvasDimensions } from '@/components/ActivityMap/hooks/activityRendering/activitiesHeatmap/utils/canvasValidation';
import { logDimensionError } from '@/components/ActivityMap/hooks/activityRendering/activitiesHeatmap/utils/dimensionLogging';
import { getHeatmapColorForCount } from '@/components/ActivityMap/hooks/activityRendering/activitiesHeatmap/utils/getHeatmapColorForCount';
import { processTracksChunked } from '@/components/ActivityMap/hooks/activityRendering/activitiesHeatmap/utils/trackProcessor';
import { createComponentLogger } from '@/lib/logger/client';
import { GPXTrack } from '@/lib/types';
import { CanvasDimensions, HeatmapRefs, RenderState } from '../activityTypes';
import { ensureMapPane } from '../utils/ensureMapPane';

const logger = createComponentLogger('drawActivitiesAsHeatmap');

/**
 * Renders accumulator data as image and adds to map
 */
function finishRender(
  state: RenderState,
  currentImageLayerRef: RefObject<L.ImageOverlay | null>,
  renderAbortRef: RefObject<boolean>,
  map: L.Map,
  lineThickness: number = HEATMAP_CONFIG.ACTIVITY_LINE_THICKNESS
): void {
  if (renderAbortRef.current) {
    return;
  }

  const finishStartTime = performance.now();
  const { ctx, accumulator, canvasWidth, canvasHeight, currentZoom, bounds } = state;

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

  for (let i = 0; i < accumulator.length; i++) {
    const count = accumulator[i];
    if (count === 0) {
      continue;
    }

    const [r, g, b, a] = getHeatmapColorForCount(count, currentZoom, lineThickness);
    const pixelIndex = i * 4;

    data[pixelIndex] = r;
    data[pixelIndex + 1] = g;
    data[pixelIndex + 2] = b;
    data[pixelIndex + 3] = a;
  }

  ctx.putImageData(imageData, 0, 0);
  const imageUrl = state.canvas.toDataURL();

  if (currentImageLayerRef.current && map && map.hasLayer(currentImageLayerRef.current)) {
    map.removeLayer(currentImageLayerRef.current);
  }
  try {
    currentImageLayerRef.current = L.imageOverlay(imageUrl, bounds, {
      pane: 'heatmapPane',
    }).addTo(map);

    if (renderAbortRef.current) {
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
}

/**
 * Main heatmap rendering function
 */
function renderHeatmapInternal(
  map: L.Map,
  tracks: Map<string, GPXTrack>,
  refs: HeatmapRefs,
  lineThickness: number
): void {
  if (!map?.getBounds) {
    logger.warn('Map not available');
    return;
  }

  const renderStartTime = performance.now();
  const currentZoom = map.getZoom();
  refs.renderAbortRef.current = true;

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
    const latlngToPixel = createLatLngToPixelConverter(map, topLeft, refs.heatmapDensity);
    const tracksArray = Array.from(tracks.values());

    refs.renderAbortRef.current = false;

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
    };

    processTracksChunked(
      tracksArray,
      accumulator,
      canvasWidth,
      canvasHeight,
      latlngToPixel,
      lineThickness,
      refs.renderAbortRef,
      () =>
        finishRender(
          renderState,
          refs.currentImageLayerRef,
          refs.renderAbortRef,
          map,
          lineThickness
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
  const { currentImageLayerRef, renderAbortRef, renderTimeoutRef } = refs;

  let zoomChangeTimeout: ReturnType<typeof setTimeout> | null = null;

  const renderHeatmap = (): void => {
    if (!map) {
      return;
    }
    renderHeatmapInternal(map, tracks, refs, refs.lineThickness);
  };

  const handleMapChange = (): void => {
    if (zoomChangeTimeout) {
      clearTimeout(zoomChangeTimeout);
    }

    zoomChangeTimeout = setTimeout(() => {
      renderHeatmap();
    }, HEATMAP_CONFIG.HEATMAP_RENDER_DELAY);
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
    }
  };
}
