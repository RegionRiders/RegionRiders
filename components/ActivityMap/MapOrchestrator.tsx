'use client';

import type { Map as LeafletMap } from 'leaflet';
import { MapSettings } from '@/components/ActivityMap/controls/LayersPanel/types';
import { GPXTrack } from '@/lib/types';
import { useActivityRendering } from './hooks/activityRendering/useActivityRendering';
import { useRegionAnalysis } from './hooks/regionRendering/useRegionAnalysis';
import { useRegionLoading } from './hooks/regionRendering/useRegionLoading';
import { useRegionRendering } from './hooks/regionRendering/useRegionRendering';

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
    settings.heatmapDensity
  );
  useRegionRendering(
    map,
    regions,
    visitData,
    settings.showRegions,
    settings.regionMode,
    settings.regionBorderThickness
  );

  return null;
}
