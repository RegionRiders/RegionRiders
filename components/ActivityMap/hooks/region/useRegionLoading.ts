'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { createComponentLogger } from '@/lib/logger/client';
import { DataLoader } from '@/lib/services/DataLoader';
import { Regions } from '@/lib/types';

const logger = createComponentLogger('useRegionLoading');

// Zoom level thresholds for performance
const MIN_ZOOM_FOR_REGIONS = 6; // Don't load regions when zoomed out too far
const OPTIMAL_ZOOM_FOR_REGIONS = 8; // Optimal zoom level for region loading

/**
 * Hook to handle region loading based on map viewport
 * Debounces viewport changes to avoid excessive loads
 * Implements zoom-aware loading to prevent memory issues
 */
export function useRegionLoading(map: L.Map | null) {
  const [regions, setRegions] = useState<Regions[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const lastBoundsRef = useRef<string | null>(null);
  const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastZoomRef = useRef<number>(0);

  const loadRegionsForViewport = useCallback(async () => {
    if (!map) {
      return;
    }

    try {
      const zoom = map.getZoom();
      lastZoomRef.current = zoom;

      // Skip loading if zoomed out too far - would load too many regions
      if (zoom < MIN_ZOOM_FOR_REGIONS) {
        logger.debug(
          `Skipping region load at zoom ${zoom} (min: ${MIN_ZOOM_FOR_REGIONS}). ` +
          `Zoom in to see regions.`
        );
        setRegions([]);
        return;
      }

      const startTime = performance.now();
      const bounds = map.getBounds();
      const viewportBounds = {
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
      };

      // Store a simple signature to compare after async load
      const boundsSignature = `${viewportBounds.north}|${viewportBounds.south}|${viewportBounds.east}|${viewportBounds.west}|${zoom}`;

      // Skip if bounds haven't changed
      if (lastBoundsRef.current === boundsSignature) {
        return;
      }

      lastBoundsRef.current = boundsSignature;
      setIsLoading(true);

      const loadedRegions = await DataLoader.loadRegions(viewportBounds);

      // Ignore stale results if bounds changed during load
      if (lastBoundsRef.current !== boundsSignature) {
        logger.debug('Ignoring stale region load');
        setIsLoading(false);
        return;
      }

      const duration = (performance.now() - startTime).toFixed(2);
      
      // Log performance warnings
      if (loadedRegions.length > 3000) {
        logger.warn(
          `Large region count: ${loadedRegions.length} regions loaded (${duration}ms). ` +
          `Performance may be impacted. Consider zooming in further.`
        );
      } else {
        logger.debug(`Loaded ${loadedRegions.length} regions (${duration}ms)`);
      }
      
      setRegions(loadedRegions);
    } catch (error) {
      logger.error(`Failed to load regions: ${error}`);
    } finally {
      setIsLoading(false);
    }
  }, [map]);

  // Setup map event listeners with debouncing
  useEffect(() => {
    if (!map) {
      return;
    }

    // Initial load
    void loadRegionsForViewport();

    const handleMoveEnd = () => {
      // Clear previous timeout
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }

      const zoom = map.getZoom();
      
      // Use longer debounce for lower zoom levels (more data to process)
      const debounceMs = zoom < OPTIMAL_ZOOM_FOR_REGIONS ? 800 : 500;

      // Debounce viewport changes
      loadTimeoutRef.current = setTimeout(() => {
        void loadRegionsForViewport();
      }, debounceMs);
    };

    map.on('moveend', handleMoveEnd);
    map.on('zoomend', handleMoveEnd);

    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
      map.off('moveend', handleMoveEnd);
      map.off('zoomend', handleMoveEnd);
    };
  }, [map, loadRegionsForViewport]);

  return { regions, isLoading };
}
