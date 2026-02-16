'use client';

import { useEffect, useRef, useState } from 'react';
import { createComponentLogger } from '@/lib/logger/client';
import { GPXTrack, Regions } from '@/lib/types';
import { analyzeRegionVisitsAsync, RegionVisitData } from '@/lib/utils/regionVisitAnalyzer';
import { PerformanceConfig } from '@/lib/config/performanceConfig';

const logger = createComponentLogger('useRegionAnalysis');

/**
 * Hook to analyze which regions have been visited
 * Optimized to only analyze visible tracks and limit analysis scope
 */
export function useRegionAnalysis(tracks: Map<string, GPXTrack>, regions: Regions[]) {
  const [visitData, setVisitData] = useState<Map<string, RegionVisitData>>(new Map());
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const lastTrackSizeRef = useRef<number>(0);
  const lastTrackKeysRef = useRef<string>('');
  const lastRegionKeysRef = useRef<string>('');
  const analysisTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (tracks.size === 0 || regions.length === 0) {
      // Clear visit data if no tracks or regions
      if (visitData.size > 0) {
        setVisitData(new Map());
      }
      return;
    }

    // Fast path: check size first before expensive sort
    if (lastTrackSizeRef.current !== tracks.size) {
      lastTrackSizeRef.current = tracks.size;
      // Size changed, so definitely different - skip signature check
    } else {
      // Size same, check if keys actually changed (expensive)
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

      lastTrackKeysRef.current = trackKeySignature;
      lastRegionKeysRef.current = regionKeySignature;
    }

    // Warn if approaching limits
    if (tracks.size > PerformanceConfig.ANALYSIS.MAX_TRACKS_FOR_ANALYSIS) {
      logger.warn(
        `Large track count (${tracks.size}) may impact analysis performance. ` +
        `Consider using viewport filtering.`
      );
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

      // Limit tracks if needed (take first N)
      const tracksToAnalyze = Array.from(tracks.values());
      const limitedTracks = 
        tracksToAnalyze.length > PerformanceConfig.ANALYSIS.MAX_TRACKS_FOR_ANALYSIS
          ? tracksToAnalyze.slice(0, PerformanceConfig.ANALYSIS.MAX_TRACKS_FOR_ANALYSIS)
          : tracksToAnalyze;

      if (limitedTracks.length < tracksToAnalyze.length) {
        logger.warn(
          `Analyzing only ${limitedTracks.length}/${tracksToAnalyze.length} tracks ` +
          `due to performance limits`
        );
      }

      analyzeRegionVisitsAsync(limitedTracks, regions)
        .then((newVisitData) => {
          if (isMounted) {
            setVisitData(newVisitData);
            const duration = (performance.now() - startTime).toFixed(2);
            const visitedCount = Array.from(newVisitData.values()).filter((v) => v.visited).length;
            
            logger.debug(
              `✅ Analyzed ${visitedCount}/${regions.length} regions ` +
              `(${limitedTracks.length} tracks) in ${duration}ms`
            );
            
            setIsAnalyzing(false);
          }
        })
        .catch((error) => {
          if (isMounted) {
            logger.error('Analysis failed:', error);
            setIsAnalyzing(false);
          }
        });
    }, PerformanceConfig.ANALYSIS.DEBOUNCE_MS);

    return () => {
      isMounted = false;
      if (analysisTimeoutRef.current) {
        clearTimeout(analysisTimeoutRef.current);
      }
    };
  }, [tracks, regions]);

  return { visitData, isAnalyzing };
}
