'use client';

import L from 'leaflet';
import type { RefObject } from 'react';

import { MAP_CONFIG } from '@/components/ActivityMap/config/mapConfig';
import { createComponentLogger } from '@/lib/logger/client';
import { GPXTrack } from '@/lib/types';

import { ensureMapPane } from '../utils/ensureMapPane';
import { createLatLngToPixelConverter } from './utils/canvasProjection';
import { drawLineToAccumulator } from './utils/drawLineToAccumulator';
import { getHeatmapColorForCount } from './utils/getHeatmapColorForCount';
import {
  CanvasDimensions,
  HeatmapRefs,
  RenderState
} from "@/components/ActivityMap/drawActivities/activitiesHeatmap/types";
import {
  validateCanvasDimensions
} from "@/components/ActivityMap/drawActivities/activitiesHeatmap/utils/canvasValidation";

const logger = createComponentLogger('drawActivitiesAsHeatmap');

/**
 * Logs canvas dimension validation error with proper object formatting
 */
function logDimensionError(
  dimensions: CanvasDimensions,
  zoom: number,
  message: string
): void {
  const errorDetails = {
    canvasWidth: dimensions.canvasWidth,
    canvasHeight: dimensions.canvasHeight,
    topLeft: `{x: ${dimensions.topLeft.x}, y: ${dimensions.topLeft.y}}`,
    bottomRight: `{x: ${dimensions.bottomRight.x}, y: ${dimensions.bottomRight.y}}`,
    zoom,
  };
  logger.warn(`${message}: ${JSON.stringify(errorDetails)}`);
}

/**
 * Creates canvas and context for heatmap rendering
 */
function createCanvasContext(
  width: number,
  height: number
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    logger.error('Failed to get canvas context');
    return null;
  }

  return { canvas, ctx };
}

/**
 * Processes tracks in chunks using requestAnimationFrame for non-blocking rendering
 */
function processTracksChunked(
  tracksArray: GPXTrack[],
  accumulator: Float32Array,
  canvasWidth: number,
  canvasHeight: number,
  latlngToPixel: (lat: number, lon: number) => { x: number; y: number },
  lineThickness: number,
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
            accumulator,
            canvasWidth,
            canvasHeight,
            p1.x,
            p1.y,
            p2.x,
            p2.y,
            lineThickness
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

/**
 * Renders accumulator data as image and adds to map
 */
function finishRender(
  state: RenderState,
  currentImageLayerRef: RefObject<L.ImageOverlay | null>,
  renderAbortRef: RefObject<boolean>,
  map: L.Map,
  lineThickness: number = MAP_CONFIG.LINE_THICKNESS
): void {
  if (renderAbortRef.current) {
    return;
  }

  const finishStartTime = performance.now();
  const { ctx, accumulator, canvasWidth, canvasHeight, currentZoom, bounds } =
    state;

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
    data[pixelIndex + 3] = a
  }

  ctx.putImageData(imageData, 0, 0);
  const imageUrl = state.canvas.toDataURL();

  if (
    currentImageLayerRef.current &&
    map.hasLayer?.(currentImageLayerRef.current)
  ) {
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

    const canvasWidth = Math.round(
      (bottomRight.x - topLeft.x) * MAP_CONFIG.PIXEL_DENSITY
    );
    const canvasHeight = Math.round(
      (bottomRight.y - topLeft.y) * MAP_CONFIG.PIXEL_DENSITY
    );

    const dimensions: CanvasDimensions = {
      canvasWidth,
      canvasHeight,
      topLeft,
      bottomRight,
    };

    if (!validateCanvasDimensions(dimensions)) {
      logDimensionError(dimensions, currentZoom, 'Invalid canvas dimensions');
      return;
    }

    const canvasResult = createCanvasContext(canvasWidth, canvasHeight);
    if (!canvasResult) {
      return;
    }

    const { canvas, ctx } = canvasResult;
    const accumulator = new Float32Array(canvasWidth * canvasHeight);
    const latlngToPixel = createLatLngToPixelConverter(map, topLeft);
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
 * @param currentImageLayerRef - Ref to current overlay layer for cleanup
 * @param renderAbortRef - Ref to abort flag for canceling renders
 * @param renderTimeoutRef - Ref to timeout for debouncing
 * @returns Cleanup function to remove listeners and cancel pending renders
 */
export function drawActivitiesAsHeatmap(
  map: L.Map | null,
  tracks: Map<string, GPXTrack>,
  currentImageLayerRef: RefObject<L.ImageOverlay | null>,
  renderAbortRef: RefObject<boolean>,
  renderTimeoutRef: RefObject<NodeJS.Timeout | null>
): () => void {
  const lineThickness = MAP_CONFIG.LINE_THICKNESS * MAP_CONFIG.PIXEL_DENSITY;
  let zoomChangeTimeout: NodeJS.Timeout | null = null;

  const refs: HeatmapRefs = {
    currentImageLayerRef,
    renderAbortRef,
    renderTimeoutRef,
  };

  const renderHeatmap = (): void => {
    if (!map) {
      return;
    }
    renderHeatmapInternal(map, tracks, refs, lineThickness);
  };

  const handleMapChange = (): void => {
    if (zoomChangeTimeout) {
      clearTimeout(zoomChangeTimeout);
    }

    zoomChangeTimeout = setTimeout(() => {
      renderHeatmap();
    }, MAP_CONFIG.HEATMAP_RENDER_DELAY);
  };

  if (map) {
    map.on('zoomend', handleMapChange);
    map.on('moveend', handleMapChange);

    // Initial render
    renderHeatmap();
  }

  return () => {
    logger.info('Cleanup');
    refs.renderAbortRef.current = true;

    if (refs.renderTimeoutRef.current) {
      clearTimeout(refs.renderTimeoutRef.current);
    }

    if (zoomChangeTimeout) {
      clearTimeout(zoomChangeTimeout);
    }

    if (map) {
      map.off('zoomend', handleMapChange);
      map.off('moveend', handleMapChange);

      if (
        refs.currentImageLayerRef.current &&
        map?.hasLayer?.(refs.currentImageLayerRef.current)
      ) {
        try {
          map.removeLayer(refs.currentImageLayerRef.current);
        } catch (e) {
          /* empty */
        }
      }
    }
  };
}
