'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { drawActivitiesAsHeatmap } from '@/components/ActivityMap/hooks/activityRendering/activitiesHeatmap/drawActivitiesAsHeatmap';
import { drawActivitiesAsLines } from '@/components/ActivityMap/hooks/activityRendering/activitiesLines/drawActivitiesAsLines';
import type {
  HeatmapRefs,
  LinesRefs,
} from '@/components/ActivityMap/hooks/activityRendering/activityTypes';
import { createComponentLogger } from '@/lib/logger/client';
import { GPXTrack } from '@/lib/types';

export type ActivityRenderMode = 'heatmap' | 'lines';

const logger = createComponentLogger('useActivityRendering');

export function useActivityRendering(
  map: L.Map | null,
  tracks: Map<string, GPXTrack>,
  showActivities: boolean = true,
  mode: ActivityRenderMode = 'heatmap',
  activityThickness: number = 3,
  heatmapDensity: number = 2
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
      };
      return drawActivitiesAsHeatmap(map, tracks, heatmapRefs);
    }

    // DEFAULT: Draw as lines
    const linesRefs: LinesRefs = {
      renderAbortRef,
      renderTimeoutRef,
      lineThickness: activityThickness,
    };
    return drawActivitiesAsLines(map, tracks, linesRefs);
  }, [map, tracks, showActivities, mode, activityThickness, heatmapDensity]);
}
