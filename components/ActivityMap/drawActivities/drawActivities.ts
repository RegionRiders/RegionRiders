// drawActivities.ts
'use client';

import type { RefObject } from 'react';
import type L from 'leaflet';
import type { GPXTrack } from '@/lib/types';
import { drawActivitiesAsHeatmap } from './activitiesHeatmap/drawActivitiesAsHeatmap';
import { drawActivitiesAsLines } from './activitiesLines/drawActivitiesAsLines';
import type { HeatmapRefs, LinesRefs } from './activityTypes';

export type ActivityRenderMode = 'heatmap' | 'lines';

export function drawActivities(
  map: L.Map | null,
  tracks: Map<string, GPXTrack>,
  currentImageLayerRef: RefObject<L.ImageOverlay | null>,
  renderAbortRef: RefObject<boolean>,
  renderTimeoutRef: RefObject<NodeJS.Timeout | null>,
  mode: ActivityRenderMode = 'heatmap'
): () => void {
  if (mode === 'heatmap') {
    const heatmapRefs: HeatmapRefs = {
      currentImageLayerRef,
      renderAbortRef,
      renderTimeoutRef,
    };

    return drawActivitiesAsHeatmap(map, tracks, heatmapRefs);
  }
  const linesRefs: LinesRefs = {
    renderAbortRef,
    renderTimeoutRef,
  };

  return drawActivitiesAsLines(map, tracks, linesRefs);
}
