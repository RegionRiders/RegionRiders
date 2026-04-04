'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import {
  ActivityRenderMode,
  LineColorSwatch,
} from '@/components/ActivityMap/controls/LayersPanel/types';
import { drawActivitiesAsHeatmap } from '@/components/ActivityMap/hooks/activity/activitiesHeatmap/drawActivitiesAsHeatmap';
import { drawActivitiesAsLines } from '@/components/ActivityMap/hooks/activity/activitiesLines/drawActivitiesAsLines';
import type { HeatmapRefs, LinesRefs } from '@/components/ActivityMap/hooks/activity/activityTypes';
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
  activityHeatmapEdgeSmoothing: boolean = true,
  heatmapDensity: number = 2,
  activityLineColor: LineColorSwatch = {
    normal: [255, 0, 0, 0.5],
    hover: [255, 100, 100, 0.7],
  },
  heatmapColorThresholds?: ColorThreshold[]
) {
  const currentImageLayerRef = useRef<L.ImageOverlay | null>(null);
  const renderTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const renderAbortRef = useRef<boolean>(false);

  useEffect(() => {
    if (!map || !showActivities || tracks.size === 0) {
      logger.debug('Skipping render: map not ready or no tracks');
      return;
    }

    logger.debug(`Rendering ${tracks.size} tracks in ${mode} mode`);

    // Heatmap
    if (mode === 'heatmap') {
      const heatmapRefs: HeatmapRefs = {
        currentImageLayerRef,
        renderAbortRef,
        renderTimeoutRef,
        heatmapDensity,
        lineThickness: activityThickness,
        layerTransparency: activityLayerTransparency,
        edgeSmoothingEnabled: activityHeatmapEdgeSmoothing,
        heatmapColorThresholds,
      };
      return drawActivitiesAsHeatmap(map, tracks, heatmapRefs);
    }

    // DEFAULT: Draw as lines
    const linesRefs: LinesRefs = {
      renderAbortRef,
      renderTimeoutRef,
      lineThickness: activityThickness,
      lineColor: activityLineColor.normal,
      lineHoverColor: activityLineColor.hover,
      layerTransparency: activityLayerTransparency,
    };
    return drawActivitiesAsLines(map, tracks, linesRefs);
  }, [
    map,
    tracks,
    showActivities,
    mode,
    activityThickness,
    activityLayerTransparency,
    activityHeatmapEdgeSmoothing,
    heatmapDensity,
    activityLineColor,
    heatmapColorThresholds,
  ]);
}
