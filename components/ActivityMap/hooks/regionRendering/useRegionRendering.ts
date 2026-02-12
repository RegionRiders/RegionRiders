'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { calculateWeightForZoom } from '@/components/ActivityMap/hooks/regionRendering/utils/calculateWeightForZoom';
import { createComponentLogger } from '@/lib/logger/client';
import { Regions } from '@/lib/types';
import { RegionVisitData } from '@/lib/utils/regionVisitAnalyzer';
import { RegionLayerManager } from './utils/regionLayerManager';

const logger = createComponentLogger('useRegionRendering');

export function useRegionRendering(
  map: L.Map | null,
  regions: Regions[],
  visitData: Map<string, RegionVisitData>,
  showBorders: boolean = true
) {
  const layerManagerRef = useRef<RegionLayerManager | null>(null);
  const lastVisitDataSizeRef = useRef<number>(0);

  // Initialize layer manager
  useEffect(() => {
    if (!map) {
      return;
    }

    if (!layerManagerRef.current) {
      layerManagerRef.current = new RegionLayerManager(map);
      logger.debug('Layer manager initialized');
    }

    return () => {
      if (layerManagerRef.current) {
        layerManagerRef.current.destroy();
        layerManagerRef.current = null;
        logger.debug('Layer manager destroyed');
      }
    };
  }, [map]);

  // Handle region changes (viewport changes)
  useEffect(() => {
    if (!map || !layerManagerRef.current || regions.length === 0) {
      return;
    }

    if (!showBorders) {
      layerManagerRef.current.clear();
      return;
    }

    const startTime = performance.now();

    layerManagerRef.current.syncRegions(regions, visitData, calculateWeightForZoom(map.getZoom()));

    const duration = (performance.now() - startTime).toFixed(2);
    const layerCount = layerManagerRef.current.getLayerCount();
    logger.debug(`Synced ${layerCount} region layers (${duration}ms)`);
  }, [map, regions, showBorders, calculateWeightForZoom]);

  // Handle visit data changes separately - only update styles
  useEffect(() => {
    if (!map || !layerManagerRef.current || visitData.size === 0) {
      return;
    }

    // Only update if visit data actually changed
    if (visitData.size === lastVisitDataSizeRef.current) {
      return;
    }

    const startTime = performance.now();

    // Update only styles, no layer recreation
    layerManagerRef.current.updateStyles(visitData, calculateWeightForZoom(map.getZoom()));

    const duration = (performance.now() - startTime).toFixed(2);
    const visitedCount = Array.from(visitData.values()).filter((v) => v.visited).length;
    logger.debug(`Updated styles for ${visitedCount} visited regions (${duration}ms)`);

    lastVisitDataSizeRef.current = visitData.size;
  }, [map, visitData]);

  // Handle zoom changes - only update weight
  useEffect(() => {
    if (!map || !layerManagerRef.current) {
      return;
    }

    const handleZoom = () => {
      const weight = calculateWeightForZoom(map.getZoom());
      layerManagerRef.current?.updateWeight(weight);
    };

    map.on('zoomend', handleZoom);

    return () => {
      map.off('zoomend', handleZoom);
    };
  }, [map, calculateWeightForZoom]);
}
