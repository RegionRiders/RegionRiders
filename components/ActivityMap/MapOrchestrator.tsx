'use client';

import type { Map as LeafletMap } from 'leaflet';
import { useMemo, useEffect, useState, useRef } from 'react';
import { MapSettings } from '@/components/ActivityMap/controls/LayersPanel/types';
import { useActivityRendering } from '@/components/ActivityMap/hooks/activity/useActivityRendering';
import { useRegionAnalysis } from '@/components/ActivityMap/hooks/region/useRegionAnalysis';
import { useRegionLoading } from '@/components/ActivityMap/hooks/region/useRegionLoading';
import { useRegionRendering } from '@/components/ActivityMap/hooks/region/useRegionRendering';
import { GPXTrack } from '@/lib/types';
import { filterTracksWithLimit, getBoundsSignature } from '@/lib/utils/viewportUtils';
import { createComponentLogger } from '@/lib/logger/client';
import { PerformanceConfig } from '@/lib/config/performanceConfig';

const logger = createComponentLogger('MapOrchestrator');

interface MapOrchestratorProps {
  map: LeafletMap | null;
  tracks: Map<string, GPXTrack>;
  settings: MapSettings;
}

export default function MapOrchestrator({ map, tracks, settings }: MapOrchestratorProps) {
  const [boundsSignature, setBoundsSignature] = useState<string>('');
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Update bounds signature when map moves (debounced)
  useEffect(() => {
    if (!map) return;

    const updateBounds = () => {
      // Clear previous debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Debounce the bounds update to avoid excessive recalculations
      debounceTimerRef.current = setTimeout(() => {
        const newSignature = getBoundsSignature(map.getBounds());
        setBoundsSignature(newSignature);
      }, PerformanceConfig.RENDERING.DEBOUNCE_MS);
    };

    // Initial bounds (no debounce)
    const initialSignature = getBoundsSignature(map.getBounds());
    setBoundsSignature(initialSignature);

    // Update on map movement (debounced)
    map.on('moveend', updateBounds);
    map.on('zoomend', updateBounds);

    return () => {
      map.off('moveend', updateBounds);
      map.off('zoomend', updateBounds);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
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
