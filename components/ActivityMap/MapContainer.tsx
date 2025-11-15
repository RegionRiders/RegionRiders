'use client';

import { useRegionLoading } from './hooks/useRegionLoading';
import { useRegionAnalysis } from './hooks/useRegionAnalysis';
import { useActivityRendering } from './hooks/useActivityRendering';
import { useRegionRendering } from './hooks/useRegionRendering';
import { GPXTrack } from '@/lib/types/types';
import type { ActivityRenderMode } from './drawActivities/drawActivities';
import type { Map as LeafletMap } from 'leaflet';

interface MapContainerProps {
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
export default function MapContainer({
                                         map,
                                         tracks,
                                         showHeatmap = true,
                                         showBorders = true,
                                         activityMode = 'heatmap',
                                     }: MapContainerProps) {

    const { regions } = useRegionLoading(map);
    const { visitData } = useRegionAnalysis(tracks, regions);
    useActivityRendering(map, tracks, showHeatmap, activityMode);
    useRegionRendering(map, regions, visitData, showBorders);

    // This component is a side effect coordinator, doesn't render
    return null;
}
