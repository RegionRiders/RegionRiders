'use client';

import { useEffect, useRef, useState } from 'react';
import { createComponentLogger } from '@/lib/logger/client';
import { GPXTrack, Regions } from '@/lib/types';
import { analyzeRegionVisitsAsync, RegionVisitData } from '@/lib/utils/regionVisitAnalyzer';

const logger = createComponentLogger('useRegionAnalysis');

/**
 * Hook to analyze which regions have been visited
 * Only recalculates when tracks change, NOT when regions change
 * This prevents unnecessary analysis on map pan/zoom
 */
export function useRegionAnalysis(tracks: Map<string, GPXTrack>, regions: Regions[]) {
  const [visitData, setVisitData] = useState<Map<string, RegionVisitData>>(new Map());
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Only track changes in tracks, not regions
  const lastTrackKeysRef = useRef<string>('');
  const allRegionsRef = useRef<Regions[]>([]);
  const analysisTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Accumulate all regions we've ever seen
  useEffect(() => {
    if (regions.length === 0) {
      return;
    }

    const existingIds = new Set(allRegionsRef.current.map((r) => r.id));
    const newRegions = regions.filter((r) => !existingIds.has(r.id));

    if (newRegions.length > 0) {
      allRegionsRef.current = [...allRegionsRef.current, ...newRegions];
      logger.debug(
        `Accumulated ${newRegions.length} new regions (total: ${allRegionsRef.current.length})`
      );
    }
  }, [regions]);

  // Only analyze when tracks change
  useEffect(() => {
    if (tracks.size === 0 || allRegionsRef.current.length === 0) {
      return;
    }

    const trackKeySignature = Array.from(tracks.keys()).sort().join('|');

    // Skip if tracks haven't changed
    if (lastTrackKeysRef.current === trackKeySignature) {
      return;
    }

    // Clear previous timeout
    if (analysisTimeoutRef.current) {
      clearTimeout(analysisTimeoutRef.current);
    }

    let isMounted = true;
    setIsAnalyzing(true);

    // Debounce to avoid excessive analysis
    analysisTimeoutRef.current = setTimeout(() => {
      const startTime = performance.now();

      analyzeRegionVisitsAsync(Array.from(tracks.values()), allRegionsRef.current)
        .then((newVisitData) => {
          if (isMounted) {
            setVisitData(newVisitData);
            const duration = (performance.now() - startTime).toFixed(2);
            const visitedCount = Array.from(newVisitData.values()).filter((v) => v.visited).length;
            logger.info(
              `Analyzed ${visitedCount}/${allRegionsRef.current.length} regions visited (${duration}ms)`
            );
            lastTrackKeysRef.current = trackKeySignature;
            setIsAnalyzing(false);
          }
        })
        .catch((error) => {
          logger.error('Analysis failed:', error);
          setIsAnalyzing(false);
        });
    }, 300);

    return () => {
      isMounted = false;
      if (analysisTimeoutRef.current) {
        clearTimeout(analysisTimeoutRef.current);
      }
    };
  }, [tracks]);

  return { visitData, isAnalyzing };
}
