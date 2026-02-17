'use client';

import { useEffect, useRef, useState } from 'react';
import { createComponentLogger } from '@/lib/logger/client';
import { GPXTrack, Regions } from '@/lib/types';
import { analyzeRegionVisitsAsync, RegionVisitData } from '@/lib/utils/regionVisitAnalyzer';

const logger = createComponentLogger('useRegionAnalysis');

// Performance limits to prevent browser freezing
const MAX_TRACKS_TO_ANALYZE = 100; // Limit tracks to analyze at once
const MAX_REGIONS_TO_ANALYZE = 3000; // Limit regions to analyze
const WARN_TRACK_THRESHOLD = 50;
const WARN_REGION_THRESHOLD = 1500;

/**
 * Hook to analyze which regions have been visited
 * Implements safety limits to prevent excessive memory usage and computation
 */
export function useRegionAnalysis(tracks: Map<string, GPXTrack>, regions: Regions[]) {
  const [visitData, setVisitData] = useState<Map<string, RegionVisitData>>(new Map());
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLimited, setIsLimited] = useState(false);

  const lastTrackKeysRef = useRef<string>('');
  const lastRegionKeysRef = useRef<string>('');
  const analysisTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (tracks.size === 0 || regions.length === 0) {
      setVisitData(new Map());
      setIsLimited(false);
      return;
    }

    // Check if data is too large
    const trackCount = tracks.size;
    const regionCount = regions.length;
    
    if (trackCount > MAX_TRACKS_TO_ANALYZE || regionCount > MAX_REGIONS_TO_ANALYZE) {
      logger.warn(
        `Analysis skipped: data too large (${trackCount} tracks × ${regionCount} regions). ` +
        `Limits: ${MAX_TRACKS_TO_ANALYZE} tracks, ${MAX_REGIONS_TO_ANALYZE} regions. ` +
        `Consider filtering or zooming in.`
      );
      setIsLimited(true);
      return;
    }

    // Warn about large datasets
    if (trackCount > WARN_TRACK_THRESHOLD || regionCount > WARN_REGION_THRESHOLD) {
      logger.warn(
        `Large dataset detected: ${trackCount} tracks × ${regionCount} regions. ` +
        `Analysis may take longer. Consider filtering for better performance.`
      );
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
    setIsLimited(false);

    // Adaptive debounce: longer delay for larger datasets
    const dataSize = trackCount * regionCount;
    const debounceMs = dataSize > 50000 ? 800 : dataSize > 10000 ? 500 : 300;

    // Debounce to avoid excessive analysis
    analysisTimeoutRef.current = setTimeout(() => {
      const startTime = performance.now();

      logger.debug(`Starting analysis: ${trackCount} tracks × ${regionCount} regions`);

      analyzeRegionVisitsAsync(Array.from(tracks.values()), regions)
        .then((newVisitData) => {
          if (isMounted) {
            setVisitData(newVisitData);
            const duration = (performance.now() - startTime).toFixed(2);
            const visitedCount = Array.from(newVisitData.values()).filter((v) => v.visited).length;
            
            if (duration > 1000) {
              logger.warn(
                `Analysis completed in ${duration}ms. ` +
                `Consider reducing data size for better performance.`
              );
            } else {
              logger.debug(`✅ Analyzed ${visitedCount}/${regionCount} regions in ${duration}ms`);
            }
            
            lastTrackKeysRef.current = trackKeySignature;
            lastRegionKeysRef.current = regionKeySignature;
            setIsAnalyzing(false);
          }
        })
        .catch((error) => {
          logger.error('Analysis failed:', error);
          setIsAnalyzing(false);
        });
    }, debounceMs);

    return () => {
      isMounted = false;
      if (analysisTimeoutRef.current) {
        clearTimeout(analysisTimeoutRef.current);
      }
    };
  }, [tracks, regions]);

  return { 
    visitData, 
    isAnalyzing,
    isLimited, // Indicates if analysis was skipped due to size limits
    trackCount: tracks.size,
    regionCount: regions.length,
  };
}
