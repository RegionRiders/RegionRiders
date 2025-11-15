'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { logger } from '@/lib/logger';
import { DataLoader } from '@/lib/services/DataLoader';
import { Regions } from '@/lib/types/types';

/**
 * Hook to handle region loading based on map viewport
 * Debounces viewport changes to avoid excessive loads
 */
export function useRegionLoading(map: L.Map | null) {
  const [regions, setRegions] = useState<Regions[]>([]);
  const lastBoundsRef = useRef<any>(null);

  const loadRegionsForViewport = useCallback(async () => {
    if (!map) {
      return;
    }

    const startTime = performance.now();
    const bounds = map.getBounds();
    lastBoundsRef.current = bounds;

    const viewportBounds = {
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest(),
    };

    const loadedRegions = await DataLoader.loadRegions(viewportBounds);
    const duration = (performance.now() - startTime).toFixed(2);
    logger.debug(`[useRegionLoading] Loaded ${loadedRegions.length} regions (${duration}ms)`);

    setRegions(loadedRegions);
  }, [map]);

  // Setup map event listeners with debouncing
  useEffect(() => {
    if (!map) {
      return;
    }

    void loadRegionsForViewport();

    let moveTimeout: NodeJS.Timeout;
    const handleMoveEnd = () => {
      clearTimeout(moveTimeout);
      moveTimeout = setTimeout(() => {
        void loadRegionsForViewport();
      }, 800);
    };

    map.on('moveend', handleMoveEnd);

    return () => {
      clearTimeout(moveTimeout);
      map.off('moveend', handleMoveEnd);
    };
  }, [map, loadRegionsForViewport]);

  return { regions };
}
