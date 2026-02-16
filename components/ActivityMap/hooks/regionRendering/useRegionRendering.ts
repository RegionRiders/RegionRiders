'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { RegionRenderMode } from '@/components/ActivityMap/controls/LayersPanel/types';
import { calculateWeightForZoom } from '@/components/ActivityMap/hooks/regionRendering/utils/calculateWeightForZoom';
import { createComponentLogger } from '@/lib/logger/client';
import { Regions } from '@/lib/types';
import { RegionVisitData } from '@/lib/utils/regionVisitAnalyzer';
import { RegionLayerManager } from './renderingModes/regionLayerManager';

const logger = createComponentLogger('useRegionRendering');

export function useRegionRendering(
  map: L.Map | null,
  regions: Regions[],
  visitData: Map<string, RegionVisitData>,
  showRegions: boolean = true,
  mode: RegionRenderMode = 'static',
  regionBorderThickness: number = 2
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

    if (!showRegions) {
      layerManagerRef.current.clear();
      return;
    }

    const startTime = performance.now();

    layerManagerRef.current.syncRegions(
      regions,
      mode,
      visitData,
      calculateWeightForZoom(map.getZoom(), regionBorderThickness)
    );

    const duration = (performance.now() - startTime).toFixed(2);
    const layerCount = layerManagerRef.current.getLayerCount();
    logger.debug(`Synced ${layerCount} region layers (${duration}ms)`);
  }, [regions, showRegions, mode, regionBorderThickness]);

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
    logger.debug(`zoom ${map.getZoom()} visit data`);
    layerManagerRef.current.updateStyles(
      mode,
      visitData,
      calculateWeightForZoom(map.getZoom(), regionBorderThickness)
    );

    const duration = (performance.now() - startTime).toFixed(2);
    const visitedCount = Array.from(visitData.values()).filter((v) => v.visited).length;
    logger.debug(`Updated styles for ${visitedCount} visited regions (${duration}ms)`);

    lastVisitDataSizeRef.current = visitData.size;
  }, [map, visitData]);
}
