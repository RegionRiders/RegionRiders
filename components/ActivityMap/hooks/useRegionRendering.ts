'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { logger } from '@/lib/logger/client';
import { Regions } from '@/lib/types';
import { RegionVisitData } from '@/lib/utils/regionVisitAnalyzer';
import { drawRegions } from '../drawRegions/drawRegions';

/**
 * Hook to handle region border rendering
 * Manages layer lifecycle and Zoom-based weight adjustment
 */
export function useRegionRendering(
  map: L.Map | null,
  regions: Regions[],
  visitData: Map<string, RegionVisitData>,
  showBorders: boolean = true
) {
  const regionLayersRef = useRef<any[]>([]);

  useEffect(() => {
    if (!map || regions.length === 0) {
      return;
    }

    const startTime = performance.now();

    // Clear old layers
    if (regionLayersRef.current && Array.isArray(regionLayersRef.current)) {
      regionLayersRef.current.forEach((layer: any) => {
        if (map.hasLayer(layer)) {
          map.removeLayer(layer);
        }
      });
      regionLayersRef.current = [];
    }

    if (showBorders) {
      const calculateWeightForZoom = (zoom: number): number => {
        return 2 ** ((zoom - 10) / 2.5);
      };

      const initialWeight = calculateWeightForZoom(map.getZoom());
      // TODO: implement region onClick handling
      regionLayersRef.current = drawRegions(map, regions, visitData, undefined, initialWeight);

      const duration = (performance.now() - startTime).toFixed(2);
      const visitedCount = Array.from(visitData.values()).filter((v) => v.visited).length;

      logger.debug(
        `[useRegionRendering] Drew ${visitedCount}/${regions.length} regions (${duration}ms)`
      );

      // Handle Zoom-based weight adjustment
      const handleZoom = () => {
        const zoom = map.getZoom();
        const weight = calculateWeightForZoom(zoom);
        if (Array.isArray(regionLayersRef.current)) {
          regionLayersRef.current.forEach((layer: any) => {
            layer.setStyle({ weight });
          });
        }
      };

      map.on('zoomend', handleZoom);

      return () => {
        map.off('zoomend', handleZoom);
        if (Array.isArray(regionLayersRef.current)) {
          regionLayersRef.current.forEach((layer: any) => {
            if (map.hasLayer(layer)) {
              map.removeLayer(layer);
            }
          });
        }
      };
    }
  }, [map, regions, showBorders, visitData]);
}
