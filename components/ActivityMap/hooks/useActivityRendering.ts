'use client';

import {useEffect, useRef} from 'react';
import {GPXTrack} from '@/lib/types/types';
import {drawActivities} from '../drawActivities/drawActivities';
import L from 'leaflet';

/**
 * Hook to handle heatmap rendering
 * Manages canvas overlay and render lifecycle
 */
export function useActivityRendering(
  map: L.Map | null,
  tracks: Map<string, GPXTrack>,
  showHeatmap: boolean = true
) {
  const currentImageLayerRef = useRef<any>(null);
  const renderTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const renderAbortRef = useRef<boolean>(false);

  useEffect(() => {
    if (!map || !showHeatmap || tracks.size === 0) {return;}

    return drawActivities(
        map,
        tracks,
        currentImageLayerRef,
        renderAbortRef,
        renderTimeoutRef
    );
  }, [map, tracks, showHeatmap]);
}
