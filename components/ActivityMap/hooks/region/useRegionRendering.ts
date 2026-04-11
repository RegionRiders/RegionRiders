'use client';

import { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import {
  REGION_VISIT_HEATMAP_COLOR_THRESHOLDS,
  REGION_VISIT_STATIC_COLOR_THRESHOLDS,
} from '@/components/ActivityMap/config/mapConfig';
import { RegionRenderMode } from '@/components/ActivityMap/controls/LayersPanel/types';
import { calculateWeightForZoom } from '@/components/ActivityMap/hooks/region/utils/calculateWeightForZoom';
import { ColorThreshold } from '@/components/ActivityMap/mapTypes';
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
  regionBorderThickness: number = 2,
  regionLayerTransparency: number = 1,
  regionStaticColor: ColorThreshold[] = REGION_VISIT_STATIC_COLOR_THRESHOLDS,
  regionHeatmapColor: ColorThreshold[] = REGION_VISIT_HEATMAP_COLOR_THRESHOLDS
) {
  const layerManagerRef = useRef<RegionLayerManager | null>(null);
  const lastVisitDataSignatureRef = useRef<string>('');
  const visitDataSignature = useMemo(
    () =>
      Array.from(visitData.entries())
        .sort(([regionA], [regionB]) => String(regionA).localeCompare(String(regionB)))
        .map(([regionId, visit]) => `${regionId}:${visit.visitCount}:${visit.visited}`)
        .join('|'),
    [visitData]
  );

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
    if (!map || !layerManagerRef.current) {
      return;
    }

    if (!showRegions || regions.length === 0) {
      layerManagerRef.current.clear();
      return;
    }

    const startTime = performance.now();

    layerManagerRef.current.syncRegions(
      regions,
      mode,
      visitData,
      calculateWeightForZoom(map.getZoom(), regionBorderThickness),
      regionLayerTransparency,
      regionStaticColor,
      regionHeatmapColor
    );

    const duration = (performance.now() - startTime).toFixed(2);
    const layerCount = layerManagerRef.current.getLayerCount();
    logger.debug(`Synced ${layerCount} region layers (${duration}ms)`);
  }, [
    map,
    regions,
    visitData,
    showRegions,
    mode,
    regionBorderThickness,
    regionLayerTransparency,
    regionStaticColor,
    regionHeatmapColor,
  ]);

  // Handle visit data changes separately - only update styles
  useEffect(() => {
    if (!map || !layerManagerRef.current) {
      return;
    }

    // Only update if visit data actually changed
    if (visitDataSignature === lastVisitDataSignatureRef.current) {
      return;
    }

    const startTime = performance.now();

    // Update only styles, no layer recreation
    logger.debug(`zoom ${map.getZoom()} visit data`);
    layerManagerRef.current.updateStyles(
      mode,
      visitData,
      calculateWeightForZoom(map.getZoom(), regionBorderThickness),
      regionLayerTransparency,
      regionStaticColor,
      regionHeatmapColor
    );

    const duration = (performance.now() - startTime).toFixed(2);
    const visitedCount = Array.from(visitData.values()).filter((v) => v.visited).length;
    logger.debug(`Updated styles for ${visitedCount} visited regions (${duration}ms)`);

    lastVisitDataSignatureRef.current = visitDataSignature;
  }, [
    map,
    visitData,
    mode,
    regionBorderThickness,
    regionLayerTransparency,
    regionStaticColor,
    regionHeatmapColor,
  ]);
}
