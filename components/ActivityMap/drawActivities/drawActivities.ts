'use client';

import { GPXTrack } from '@/lib/types/types';
import { drawActivitiesAsHeatmap } from './drawActivitiesAsHeatmap';
import { drawActivitiesAsLines } from './drawActivitiesAsLines';

export type ActivityRenderMode = 'heatmap' | 'lines';

/**
 * renders gpx tracks as either heatmap or individual lines
 *
 * @param map - leaflet map instance
 * @param tracks - map of gpx tracks to render
 * @param currentImageLayerRef - ref to current overlay layer for cleanup
 * @param renderAbortRef - ref to abort flag for canceling renders
 * @param renderTimeoutRef - ref to timeout for debouncing
 * @param mode - 'heatmap' for density visualization or 'lines' for individual tracks
 * @returns cleanup function
 */
export function drawActivities(
  map: any,
  tracks: Map<string, GPXTrack>,
  currentImageLayerRef: any,
  renderAbortRef: any,
  renderTimeoutRef: any,
  mode: ActivityRenderMode = 'heatmap'
) {
  if (mode === 'heatmap') {
    return drawActivitiesAsHeatmap(
      map,
      tracks,
      currentImageLayerRef,
      renderAbortRef,
      renderTimeoutRef
    );
  }
  return drawActivitiesAsLines(map, tracks, renderAbortRef, renderTimeoutRef);
}
