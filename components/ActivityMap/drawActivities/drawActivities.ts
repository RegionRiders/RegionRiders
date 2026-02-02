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
  renderTimeoutRef: RefObject<ReturnType<typeof setTimeout> | null>,
  mode: ActivityRenderMode = 'heatmap',
  activityThickness: number = 3,
  heatmapDensity: number = 2
): () => void {
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

  const linesRefs: LinesRefs = {
    renderAbortRef,
    renderTimeoutRef,
    lineThickness: activityThickness,
  };
  return drawActivitiesAsLines(map, tracks, linesRefs);
}
