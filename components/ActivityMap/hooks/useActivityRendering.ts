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

  logger.info(
    `Hook called with: ${JSON.stringify({
      hasMap: !!map,
      tracksSize: tracks.size,
      showActivities,
      mode,
      tracksType: tracks instanceof Map ? 'Map' : typeof tracks,
    })}`
  );

  useEffect(() => {
    logger.info(
      `Effect running: ${JSON.stringify({
        hasMap: !!map,
        tracksSize: tracks.size,
        showActivities,
        mode,
      })}`
    );

    if (!map || !showActivities || tracks.size === 0) {
      logger.info(
        `Skipping render: ${JSON.stringify({
          noMap: !map,
          notShowing: !showActivities,
          noTracks: tracks.size === 0,
        })}`
      );
      return;
    }

    logger.info('Calling drawActivities...');
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
