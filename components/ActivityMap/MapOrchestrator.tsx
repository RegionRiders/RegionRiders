'use client';

/**
 * MapOrchestrator - Coordinates rendering of activities and regions on the map
 * Manages the lifecycle of map layers based on settings and data
 */
import type { Map as LeafletMap } from 'leaflet';
import {
  ACTIVITY_HEATMAP_COLOR_THRESHOLDS,
  REGION_VISIT_HEATMAP_COLOR_THRESHOLDS,
} from '@/components/ActivityMap/config/mapConfig';
import { MapSettings } from '@/components/ActivityMap/controls/LayersPanel/types';
import { useActivityRendering } from '@/components/ActivityMap/hooks/activity/useActivityRendering';
import { useRegionAnalysis } from '@/components/ActivityMap/hooks/region/useRegionAnalysis';
import { useRegionLoading } from '@/components/ActivityMap/hooks/region/useRegionLoading';
import { useRegionRendering } from '@/components/ActivityMap/hooks/region/useRegionRendering';
import { GPXTrack } from '@/lib/types';

interface MapOrchestratorProps {
  map: LeafletMap | null;
  tracks: Map<string, GPXTrack>;
  settings: MapSettings;
}

/**
 * MapOrchestrator orchestrates all map rendering hooks
 * @param map - Leaflet map instance
 * @param tracks - Collection of GPX tracks to render
 * @param settings - Map display settings
 * @returns null (renders through side effects on the map)
 */
export default function MapOrchestrator({ map, tracks, settings }: MapOrchestratorProps) {
  const { regions } = useRegionLoading(map);
  const { visitData } = useRegionAnalysis(tracks, regions);

  useActivityRendering(
    map,
    tracks,
    settings.showActivities,
    settings.activityMode,
    settings.activityThickness,
    settings.activityLayerTransparency ?? 1,
    settings.heatmapDensity,
    settings.activityHeatmapSmoothEdges ?? true,
    settings.lineColorSwatches[settings.selectedLineSwatchIndex],
    settings.activityHeatmapColorSwatches?.[settings.selectedActivityHeatmapSwatchIndex ?? 0] ??
      ACTIVITY_HEATMAP_COLOR_THRESHOLDS
  );
  useRegionRendering(
    map,
    regions,
    visitData,
    settings.showRegions,
    settings.regionMode,
    settings.regionBorderThickness,
    settings.regionLayerTransparency ?? 1,
    settings.regionStaticColorSwatches[settings.selectedRegionStaticSwatchIndex],
    settings.regionHeatmapColorSwatches?.[settings.selectedRegionHeatmapSwatchIndex ?? 0] ??
      REGION_VISIT_HEATMAP_COLOR_THRESHOLDS
  );

  return null;
}
