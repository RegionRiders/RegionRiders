'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { createComponentLogger } from '@/lib/logger/client';
import { GPXTrack } from '@/lib/types';
import { drawActivities, type ActivityRenderMode } from '../drawActivities/drawActivities';

const logger = createComponentLogger('useActivityRendering');

/**
 * Hook to handle activity rendering (heatmap or lines)
 * Manages canvas/layer lifecycle
 */
export function useActivityRendering(
  map: L.Map | null,
  tracks: Map<string, GPXTrack>,
  showActivities: boolean = true,
  mode: ActivityRenderMode = 'heatmap'
) {
  const currentImageLayerRef = useRef(null);
  const renderTimeoutRef = useRef(null);
  const renderAbortRef = useRef(false);

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
      mode
    );
  }, [map, tracks, showActivities, mode]);
}
