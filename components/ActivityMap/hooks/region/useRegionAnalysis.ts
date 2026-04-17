'use client';

import { useEffect, useRef, useState } from 'react';
import { createComponentLogger } from '@/lib/logger/client';
import { GPXTrack, Regions } from '@/lib/types';
import { analyzeRegionVisitsAsync, RegionVisitData } from '@/lib/utils/regionVisitAnalyzer';

const logger = createComponentLogger('useRegionAnalysis');

/**
 * Hook to analyze which regions have been visited
 */
export function useRegionAnalysis(tracks: Map<string, GPXTrack>, regions: Regions[]) {
  const [visitData, setVisitData] = useState<Map<string, RegionVisitData>>(new Map());
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const lastTrackKeysRef = useRef<string>('');
  const lastRegionKeysRef = useRef<string>('');
  const analysisTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (tracks.size === 0 || regions.length === 0) {
      if (analysisTimeoutRef.current) {
        clearTimeout(analysisTimeoutRef.current);
      }
      lastTrackKeysRef.current = '';
      lastRegionKeysRef.current = '';
      setIsAnalyzing(false);
      setVisitData((currentVisitData) =>
        currentVisitData.size === 0 ? currentVisitData : new Map<string, RegionVisitData>()
      );
      return;
    }

    const trackKeySignature = Array.from(tracks.keys()).sort().join('|');
    const regionKeySignature = regions
      .map((r) => r.id)
      .sort()
      .join('|');

    // Skip if nothing changed
    if (
      lastTrackKeysRef.current === trackKeySignature &&
      lastRegionKeysRef.current === regionKeySignature
    ) {
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

      logger.debug(`Starting analysis: ${tracks.size} tracks × ${regions.length} regions`);

      analyzeRegionVisitsAsync(Array.from(tracks.values()), regions)
        .then((newVisitData) => {
          if (isMounted) {
            setVisitData(newVisitData);
            const duration = (performance.now() - startTime).toFixed(2);
            const visitedCount = Array.from(newVisitData.values()).filter((v) => v.visited).length;
            logger.debug(`✅ Analyzed ${visitedCount}/${regions.length} regions in ${duration}ms`);
            lastTrackKeysRef.current = trackKeySignature;
            lastRegionKeysRef.current = regionKeySignature;
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
  }, [tracks, regions]);

  return { visitData, isAnalyzing };
}
