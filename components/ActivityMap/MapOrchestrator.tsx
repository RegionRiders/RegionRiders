'use client';

import type { Map as LeafletMap } from 'leaflet';
import { GPXTrack } from '@/lib/types';
import type { ActivityRenderMode } from './drawActivities/drawActivities';
import { useActivityRendering } from './hooks/useActivityRendering';
import { useRegionRendering } from './hooks/useRegionRendering';

interface MapOrchestratorProps {
  map: LeafletMap | null;
  tracks: Map<string, GPXTrack>;
  showHeatmap?: boolean;
  showBorders?: boolean;
  activityMode?: ActivityRenderMode;
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
}: MapOrchestratorProps) {
  useActivityRendering(map, tracks, showHeatmap, activityMode);
  useRegionRendering(map, showBorders);

  // This component is a side effect coordinator, doesn't render
  return null;
}
