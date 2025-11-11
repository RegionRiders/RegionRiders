'use client';

import { useRegionLoading } from './hooks/useRegionLoading';
import { useRegionAnalysis } from './hooks/useRegionAnalysis';
import { useActivityRendering } from './hooks/useActivityRendering';
import { useRegionRendering } from './hooks/useRegionRendering';
import { GPXTrack } from '@/lib/types/types';
import L from 'leaflet';

interface MapContainerProps {
    map: L.Map | null;
    tracks: Map<string, GPXTrack>;
    showHeatmap?: boolean;
    showBorders?: boolean;
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
                                     }: MapContainerProps) {
    // Load regions based on viewport
    const { regions } = useRegionLoading(map);

    // Analyze which regions have been visited
    const { visitData } = useRegionAnalysis(tracks, regions);

    // Render heatmap of activities
    useActivityRendering(map, tracks, showHeatmap);

    // Render region borders with zoom handling
    useRegionRendering(map, regions, visitData, showBorders);

    // This component is a side-effect coordinator, doesn't render
    return null;
}
