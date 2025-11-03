'use client';

import { useEffect, useState } from 'react';
import { GPXTrack, IntersectionPoint, HeatmapSegment } from '@/lib/types';
import {
  detectIntersections,
  createHeatmapSegments,
} from '@/lib/utils/intersectionDetector';

export function useIntersectionCalculator(
  tracks: Map<string, GPXTrack>,
  enabled: boolean = false
) {
  const [intersections, setIntersections] = useState<IntersectionPoint[]>([]);
  const [heatmapSegments, setHeatmapSegments] = useState<HeatmapSegment[]>([]);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    if (!enabled || tracks.size === 0) return;

    const calculateIntersections = () => {
      try {
        setCalculating(true);

        const tracksData = new Map(
          Array.from(tracks.values()).map((track) => [
            track.id,
            { points: track.points },
          ])
        );

        const detected = detectIntersections(tracksData);
        setIntersections(detected);

        const segments: HeatmapSegment[] = [];
        tracks.forEach((track) => {
          const trackSegments = createHeatmapSegments(
            track.points,
            track.id,
            detected
          );
          segments.push(...trackSegments);
        });

        setHeatmapSegments(segments);
        setCalculating(false);
      } catch (error) {
        console.error('Intersection calculation failed:', error);
        setCalculating(false);
      }
    };

    const timer = setTimeout(calculateIntersections, 300);
    return () => clearTimeout(timer);
  }, [tracks, enabled]);

  return {
    intersections,
    heatmapSegments,
    calculating,
    intersectionCount: intersections.length,
  };
}
