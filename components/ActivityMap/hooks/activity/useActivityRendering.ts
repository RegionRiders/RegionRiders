'use client';

import { useCallback, useEffect, useRef } from 'react';
import L from 'leaflet';
import {
  ActivityRenderMode,
  LineColorSwatch,
} from '@/components/ActivityMap/controls/LayersPanel/types';
import { drawActivitiesAsHeatmap } from '@/components/ActivityMap/hooks/activity/activitiesHeatmap/drawActivitiesAsHeatmap';
import { drawActivitiesAsLines } from '@/components/ActivityMap/hooks/activity/activitiesLines/drawActivitiesAsLines';
import type {
  HeatmapRefs,
  LinesRefs,
  ProjectedTrackCacheEntry,
} from '@/components/ActivityMap/hooks/activity/activityTypes';
import { ColorThreshold } from '@/components/ActivityMap/mapTypes';
import { createComponentLogger } from '@/lib/logger/client';
import { GPXTrack } from '@/lib/types';

const logger = createComponentLogger('useActivityRendering');

export function useActivityRendering(
  map: L.Map | null,
  tracks: Map<string, GPXTrack>,
  showActivities: boolean = true,
  mode: ActivityRenderMode = 'heatmap',
  activityThickness: number = 3,
  activityLayerTransparency: number = 1,
  heatmapDensity: number = 2,
  activityLineColor: LineColorSwatch = {
    normal: [255, 0, 0, 0.5],
    hover: [255, 100, 100, 0.7],
  },
  heatmapColorThresholds?: ColorThreshold[]
) {
  const currentImageLayerRef = useRef<L.ImageOverlay | null>(null);
  const currentImageUrlRef = useRef<string | null>(null);
  const activeRenderIdRef = useRef<number>(0);
  const lastRenderSignatureRef = useRef<string | null>(null);
  const projectedTrackCacheRef = useRef<Map<string, ProjectedTrackCacheEntry>>(new Map());
  const heatmapCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const heatmapContextRef = useRef<CanvasRenderingContext2D | null>(null);
  const renderTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const renderAbortRef = useRef<boolean>(false);
  const lineModeTransparency = mode === 'lines' ? activityLayerTransparency : 1;
  const resetHeatmapOverlayRefs = useCallback((): void => {
    currentImageLayerRef.current = null;
    if (currentImageUrlRef.current?.startsWith('blob:')) {
      URL.revokeObjectURL(currentImageUrlRef.current);
    }
    currentImageUrlRef.current = null;
    lastRenderSignatureRef.current = null;
  }, []);
  const clearHeatmapOverlay = useCallback((): void => {
    if (!map) {
      resetHeatmapOverlayRefs();
      return;
    }

    if (currentImageLayerRef.current && map.hasLayer(currentImageLayerRef.current)) {
      try {
        map.removeLayer(currentImageLayerRef.current);
      } catch (error) {
        logger.warn('Failed to remove heatmap layer', error);
      }
    }
    resetHeatmapOverlayRefs();
  }, [map, resetHeatmapOverlayRefs]);

  useEffect(() => {
    if (!map || !showActivities || tracks.size === 0) {
      clearHeatmapOverlay();
      logger.debug('Skipping render: map not ready or no tracks');
      return;
    }

    logger.debug(`Rendering ${tracks.size} tracks in ${mode} mode`);

    // Heatmap
    if (mode === 'heatmap') {
      const heatmapRefs: HeatmapRefs = {
        currentImageLayerRef,
        currentImageUrlRef,
        activeRenderIdRef,
        lastRenderSignatureRef,
        projectedTrackCacheRef,
        heatmapCanvasRef,
        heatmapContextRef,
        renderAbortRef,
        renderTimeoutRef,
        heatmapDensity,
        lineThickness: activityThickness,
        layerTransparency: activityLayerTransparency,
        heatmapColorThresholds,
      };
      return drawActivitiesAsHeatmap(map, tracks, heatmapRefs, {
        preserveLayerOnCleanup: true,
      });
    }

    clearHeatmapOverlay();
    // DEFAULT: Draw as lines
    const linesRefs: LinesRefs = {
      renderAbortRef,
      renderTimeoutRef,
      lineThickness: activityThickness,
      lineColor: activityLineColor.normal,
      lineHoverColor: activityLineColor.hover,
      layerTransparency: lineModeTransparency,
    };
    return drawActivitiesAsLines(map, tracks, linesRefs);
  }, [
    map,
    tracks,
    showActivities,
    mode,
    activityThickness,
    lineModeTransparency,
    heatmapDensity,
    activityLineColor,
    heatmapColorThresholds,
    clearHeatmapOverlay,
  ]);

  useEffect(() => {
    if (!map || !showActivities || mode !== 'heatmap') {
      return;
    }
    if (currentImageLayerRef.current) {
      currentImageLayerRef.current.setOpacity(activityLayerTransparency);
    }
  }, [activityLayerTransparency, map, mode, showActivities]);

  useEffect(() => {
    return () => {
      clearHeatmapOverlay();
    };
  }, [clearHeatmapOverlay]);
}
