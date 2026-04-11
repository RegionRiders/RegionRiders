'use client';

import { useMemo } from 'react';
/**
 * MapOrchestrator - Coordinates rendering of activities and regions on the map
 * Manages the lifecycle of map layers based on settings and data
 */
import type { Map as LeafletMap } from 'leaflet';
import {
  ACTIVITY_HEATMAP_COLOR_THRESHOLDS,
  DEFAULT_ACTIVITY_LINE_COLOR_SWATCHES,
  DEFAULT_REGION_STATIC_COLOR_SWATCHES,
  REGION_VISIT_HEATMAP_COLOR_THRESHOLDS,
} from '@/components/ActivityMap/config/mapConfig';
import { MapSettings } from '@/components/ActivityMap/controls/LayersPanel/types';
import { useActivityRendering } from '@/components/ActivityMap/hooks/activity/useActivityRendering';
import { useRegionRendering } from '@/components/ActivityMap/hooks/region/useRegionRendering';
import { GPXTrack } from '@/lib/types';
import type { RegionVisitData } from '@/lib/utils/regionVisitAnalyzer';

interface MapOrchestratorProps {
  map: LeafletMap | null;
  tracks: Map<string, GPXTrack>;
  settings: MapSettings;
  onRegionTileError?: (message: string) => void;
}

/**
 * MapOrchestrator orchestrates all map rendering hooks
 * @param map - Leaflet map instance
 * @param tracks - Collection of GPX tracks to render
 * @param settings - Map display settings
 * @returns null (renders through side effects on the map)
 */
export default function MapOrchestrator({
  map,
  tracks,
  settings,
  onRegionTileError,
}: MapOrchestratorProps) {
  const visitData = useMemo<Map<string, RegionVisitData>>(() => new Map(), []);

  useActivityRendering(
    map,
    tracks,
    settings.showActivities,
    settings.activityMode,
    settings.activityThickness,
    settings.activityLayerTransparency ?? 1,
    settings.heatmapDensity,
    settings.lineColorSwatches?.[settings.selectedLineSwatchIndex] ??
      DEFAULT_ACTIVITY_LINE_COLOR_SWATCHES[0],
    settings.activityHeatmapColorSwatches?.[settings.selectedActivityHeatmapSwatchIndex ?? 0] ??
      ACTIVITY_HEATMAP_COLOR_THRESHOLDS
  );
  useRegionRendering(
    map,
    visitData,
    settings.showRegions,
    settings.regionMode,
    settings.regionBorderThickness,
    settings.regionLayerTransparency ?? 1,
    settings.regionStaticColorSwatches?.[settings.selectedRegionStaticSwatchIndex] ??
      DEFAULT_REGION_STATIC_COLOR_SWATCHES[0],
    settings.regionHeatmapColorSwatches?.[settings.selectedRegionHeatmapSwatchIndex ?? 0] ??
      REGION_VISIT_HEATMAP_COLOR_THRESHOLDS,
    onRegionTileError
  );

  return null;
}
