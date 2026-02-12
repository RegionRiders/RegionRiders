'use client';

import type { Map as LeafletMap } from 'leaflet';
import { GPXTrack } from '@/lib/types';
import type { ActivityRenderMode } from './drawActivities/drawActivities';
import { useActivityRendering } from './hooks/useActivityRendering';
import { useRegionAnalysis } from './hooks/useRegionAnalysis';
import { useRegionLoading } from './hooks/useRegionLoading';
import { useRegionRendering } from './hooks/useRegionRendering';

interface MapOrchestratorProps {
  map: LeafletMap | null;
  tracks: Map<string, GPXTrack>;
  showHeatmap?: boolean;
  showBorders?: boolean;
  activityMode?: ActivityRenderMode;
  activityThickness?: number;
  heatmapDensity?: number;
}

/**
 * Orchestrator component that coordinates map rendering
 * Delegates specific concerns to focused hooks
 */
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
  const { visitData } = useRegionAnalysis(tracks, regions);

  useActivityRendering(map, tracks, showHeatmap, activityMode, activityThickness, heatmapDensity);
  useRegionRendering(map, regions, visitData, showBorders);

  return null;
}
