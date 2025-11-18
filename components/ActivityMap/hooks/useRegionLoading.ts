'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { logger } from '@/lib/logger/client';
import { DataLoader } from '@/lib/services/DataLoader';
import { Regions } from '@/lib/types';

/**
 * Hook to handle region loading based on map viewport
 * Debounces viewport changes to avoid excessive loads
 */
export function useRegionLoading(map: L.Map | null) {
  const [regions, setRegions] = useState<Regions[]>([]);
  const lastBoundsRef = useRef<string | null>(null);

  const loadRegionsForViewport = useCallback(async () => {
    if (!map) {
      return;
    }

    try {
      const startTime = performance.now();
      const bounds = map.getBounds();
      const viewportBounds = {
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
      };

      // store a simple signature to compare after async load
      const boundsSignature = `${viewportBounds.north}|${viewportBounds.south}|${viewportBounds.east}|${viewportBounds.west}`;
      lastBoundsRef.current = boundsSignature;

      const loadedRegions = await DataLoader.loadRegions(viewportBounds);

      // Ignore stale results if bounds changed during load
      if (lastBoundsRef.current !== boundsSignature) {
        logger.debug('[useRegionLoading] Ignoring stale region load');
        return;
      }

      const duration = (performance.now() - startTime).toFixed(2);
      logger.debug(`[useRegionLoading] Loaded ${loadedRegions.length} regions (${duration}ms)`);

      setRegions(loadedRegions);
    } catch (error) {
      logger.error(`[useRegionLoading] Failed to load regions: ${error}`);
    }
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
