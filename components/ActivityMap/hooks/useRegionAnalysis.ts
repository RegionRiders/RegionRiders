'use client';

import { useEffect, useRef, useState } from 'react';
import { logger } from '@/lib/logger/client';
import { GPXTrack, Regions } from '@/lib/types/types';
import { analyzeRegionVisitsAsync, RegionVisitData } from '@/lib/utils/regionVisitAnalyzer';

/**
 * Hook to analyze which regions have been visited
 * Debounce analysis to avoid excessive calculations
 */
export function useRegionAnalysis(tracks: Map<string, GPXTrack>, regions: Regions[]) {
  const [visitData, setVisitData] = useState<Map<string, RegionVisitData>>(new Map());
  const lastAnalysisRef = useRef<{ trackKeys: string; regionIds: string } | null>(null);
  const analysisTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (regions.length === 0 || tracks.size === 0) {
      return;
    }

    const trackKeySignature = Array.from(tracks.keys()).sort().join('|');
    const regionIdSignature = regions
      .map((region) => region.id)
      .sort()
      .join('|');

    // Skip if nothing changed
    if (
      lastAnalysisRef.current?.trackKeys === trackKeySignature &&
      lastAnalysisRef.current?.regionIds === regionIdSignature
    ) {
      return;
    }

    // Clear previous timeout (call unconditionally so tests can spy on it)
    clearTimeout(analysisTimeoutRef.current as any);

    let isMounted = true;
    const startTime = performance.now();

    analysisTimeoutRef.current = setTimeout(() => {
      analyzeRegionVisitsAsync(Array.from(tracks.values()), regions)
        .then((visitData) => {
          if (isMounted) {
            setVisitData(visitData);
            const duration = (performance.now() - startTime).toFixed(2);
            const visitedCount = Array.from(visitData.values()).filter((v) => v.visited).length;

            logger.info(
              `[useRegionAnalysis] ${visitedCount}/${regions.length} regions visited (${duration}ms)`
            );

            lastAnalysisRef.current = {
              trackKeys: trackKeySignature,
              regionIds: regionIdSignature,
            };
          }
        })
        .catch((error) => {
          logger.error('[useRegionAnalysis] Analysis failed:', error);
        });
    }, 500);

    return () => {
      isMounted = false;
      if (analysisTimeoutRef.current) {
        clearTimeout(analysisTimeoutRef.current);
      }
    };
  }, [tracks, regions]);

  return { visitData };
}
