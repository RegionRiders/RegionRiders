'use client';

import type { Map as LeafletMap } from 'leaflet';
import { GPXTrack } from '@/lib/types';
import type { ActivityRenderMode } from './hooks/activityRendering/drawActivities';
import { useActivityRendering } from './hooks/activityRendering/useActivityRendering';
import { useRegionAnalysis } from './hooks/regionRendering/useRegionAnalysis';
import { useRegionLoading } from './hooks/regionRendering/useRegionLoading';
import { useRegionRendering } from './hooks/regionRendering/useRegionRendering';

interface MapOrchestratorProps {
  map: LeafletMap | null;
  tracks: Map<string, GPXTrack>;
  showHeatmap?: boolean;
  showBorders?: boolean;
  activityMode?: ActivityRenderMode;
  activityThickness?: number;
  heatmapDensity?: number;
}

export default function MapOrchestrator({
  map,
  tracks,
  showHeatmap = true,
  showBorders = true,
  activityMode = 'heatmap',
  activityThickness = 3,
  heatmapDensity = 2,
}: MapOrchestratorProps) {
  const { regions } = useRegionLoading(map);
  const { visitData, isAnalyzing } = useRegionAnalysis(tracks, regions);

  useActivityRendering(map, tracks, showHeatmap, activityMode, activityThickness, heatmapDensity);
  useRegionRendering(map, regions, visitData, showBorders);

  return null;
}
