'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { logger } from '@/lib/logger';
import { GPXTrack } from '@/lib/types/types';
import { drawActivities, type ActivityRenderMode } from '../drawActivities/drawActivities';

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
    `[useActivityRendering] Hook called with: ${{
      hasMap: !!map,
      tracksSize: tracks.size,
      showActivities,
      mode,
      tracksType: tracks instanceof Map ? 'Map' : typeof tracks,
    }}`
  );

  useEffect(() => {
    logger.info(
      `[useActivityRendering] Effect running: ${{
        hasMap: !!map,
        tracksSize: tracks.size,
        showActivities,
        mode,
      }}`
    );

    if (!map || !showActivities || tracks.size === 0) {
      logger.info(
        `[useActivityRendering] Skipping render: ${{
          noMap: !map,
          notShowing: !showActivities,
          noTracks: tracks.size === 0,
        }}`
      );
      return;
    }

    logger.info('[useActivityRendering] Calling drawActivities...');
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
