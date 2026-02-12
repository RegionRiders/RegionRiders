'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { createComponentLogger } from '@/lib/logger/client';
import { GPXTrack } from '@/lib/types';
import { drawActivities, type ActivityRenderMode } from '../../drawActivities/drawActivities';

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

    return drawActivities(
      map,
      tracks,
      currentImageLayerRef,
      renderAbortRef,
      renderTimeoutRef,
      mode,
      activityThickness,
      heatmapDensity
    );
  }, [map, tracks, showActivities, mode, activityThickness, heatmapDensity]);
}
