'use client';

import type { Map as LeafletMap } from 'leaflet';
import { GPXTrack } from '@/lib/types';
import {
  ActivityRenderMode,
  useActivityRendering,
} from './hooks/activityRendering/useActivityRendering';
import { useRegionAnalysis } from './hooks/regionRendering/useRegionAnalysis';
import { useRegionLoading } from './hooks/regionRendering/useRegionLoading';
import { RegionRenderMode, useRegionRendering } from './hooks/regionRendering/useRegionRendering';

interface MapOrchestratorProps {
  map: LeafletMap | null;
  tracks: Map<string, GPXTrack>;
  showHeatmap?: boolean;
  showBorders?: boolean;
  activityMode?: ActivityRenderMode;
  activityThickness?: number;
  heatmapDensity?: number;
  regionMode?: RegionRenderMode;
}

export default function MapOrchestrator({
  map,
  tracks,
  showHeatmap = true,
  showBorders = true,
  activityMode = 'heatmap',
  activityThickness = 3,
  heatmapDensity = 2,
  regionMode = 'static',
}: MapOrchestratorProps) {
  const { regions } = useRegionLoading(map);
  const { visitData } = useRegionAnalysis(tracks, regions);

  useActivityRendering(map, tracks, showHeatmap, activityMode, activityThickness, heatmapDensity);
  useRegionRendering(map, regions, visitData, showBorders, regionMode);

  return null;
}
