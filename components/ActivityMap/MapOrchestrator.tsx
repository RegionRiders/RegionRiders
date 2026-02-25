'use client';

import type { Map as LeafletMap } from 'leaflet';
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

export default function MapOrchestrator({ map, tracks, settings }: MapOrchestratorProps) {
  const { regions } = useRegionLoading(map);
  const { visitData } = useRegionAnalysis(tracks, regions);

  useActivityRendering(
    map,
    tracks,
    settings.showActivities,
    settings.activityMode,
    settings.activityThickness,
    settings.heatmapDensity,
    settings.lineColorSwatches[settings.selectedLineSwatchIndex]
  );
  useRegionRendering(
    map,
    regions,
    visitData,
    settings.showRegions,
    settings.regionMode,
    settings.regionBorderThickness,
    settings.regionStaticColorSwatches[settings.selectedRegionStaticSwatchIndex]
  );

  return null;
}
