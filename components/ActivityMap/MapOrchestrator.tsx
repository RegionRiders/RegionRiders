'use client';

import type { Map as LeafletMap } from 'leaflet';
import { useMemo, useEffect, useState } from 'react';
import { MapSettings } from '@/components/ActivityMap/controls/LayersPanel/types';
import { useActivityRendering } from '@/components/ActivityMap/hooks/activity/useActivityRendering';
import { useRegionAnalysis } from '@/components/ActivityMap/hooks/region/useRegionAnalysis';
import { useRegionLoading } from '@/components/ActivityMap/hooks/region/useRegionLoading';
import { useRegionRendering } from '@/components/ActivityMap/hooks/region/useRegionRendering';
import { GPXTrack } from '@/lib/types';
import { filterTracksWithLimit, getBoundsSignature } from '@/lib/utils/viewportUtils';
import { createComponentLogger } from '@/lib/logger/client';

const logger = createComponentLogger('MapOrchestrator');

interface MapOrchestratorProps {
  map: LeafletMap | null;
  tracks: Map<string, GPXTrack>;
  settings: MapSettings;
}

export default function MapOrchestrator({ map, tracks, settings }: MapOrchestratorProps) {
  const [boundsSignature, setBoundsSignature] = useState<string>('');

  // Update bounds signature when map moves
  useEffect(() => {
    if (!map) return;

    const updateBounds = () => {
      const newSignature = getBoundsSignature(map.getBounds());
      setBoundsSignature(newSignature);
    };

    // Initial bounds
    updateBounds();

    // Update on map movement
    map.on('moveend', updateBounds);
    map.on('zoomend', updateBounds);

    return () => {
      map.off('moveend', updateBounds);
      map.off('zoomend', updateBounds);
    };
  }, [map]);

  // Filter tracks by viewport
  const visibleTracks = useMemo(() => {
    if (!map || !settings.showActivities) {
      return new Map<string, GPXTrack>();
    }

    const startTime = performance.now();
    const filtered = filterTracksWithLimit(tracks, map.getBounds());
    const duration = (performance.now() - startTime).toFixed(2);

    logger.debug(
      `Viewport filtering: ${filtered.size}/${tracks.size} tracks visible (${duration}ms)`
    );

    return filtered;
  }, [map, tracks, boundsSignature, settings.showActivities]);

  // Load regions based on viewport
  const { regions } = useRegionLoading(map);

  // Analyze which regions are visited (only for visible tracks)
  const { visitData, isAnalyzing } = useRegionAnalysis(visibleTracks, regions);

  // Render activities (only visible ones)
  useActivityRendering(
    map,
    visibleTracks,
    settings.showActivities,
    settings.activityMode,
    settings.activityThickness,
    settings.heatmapDensity
  );

  // Render regions
  useRegionRendering(
    map,
    regions,
    visitData,
    settings.showRegions,
    settings.regionMode,
    settings.regionBorderThickness
  );

  // Log performance stats
  useEffect(() => {
    if (map) {
      logger.debug(
        `Stats: ${visibleTracks.size}/${tracks.size} tracks, ` +
        `${regions.length} regions, ` +
        `analyzing: ${isAnalyzing}`
      );
    }
  }, [map, visibleTracks.size, tracks.size, regions.length, isAnalyzing]);

  return null;
}
