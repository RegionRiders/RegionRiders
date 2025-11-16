'use client';

import { useCallback, useEffect, useState } from 'react';
import { logger } from '@/lib/logger';
import { DataLoader } from '@/lib/services/DataLoader';
import { GPXTrack } from '@/lib/types/types';

/**
 * manages gpx track data loading
 * provides add/remove/clear operations for track management
 *
 * @param autoLoad - whether to load tracks on mount (default: true)
 * @returns track map, loading state, error, and management functions
 */
export function useGPXData(autoLoad: boolean = true) {
  const [tracks, setTracks] = useState<Map<string, GPXTrack>>(new Map());
  const [loading, setLoading] = useState(autoLoad);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!autoLoad) {
      return;
    }

    const loadTracks = async () => {
      try {
        setLoading(true);
        const loadedTracks = await DataLoader.loadGPXTracks('local');

        logger.info(`[useGPXData] Loaded ${loadedTracks.size} tracks`);

        setTracks(loadedTracks);
        setError(null);
      } catch (err) {
        const errorMsg = `Failed to load GPX data: ${err}`;
        setError(errorMsg);
        logger.error(`[useGPXData] ${errorMsg}`);
      } finally {
        setLoading(false);
      }
    };

    loadTracks().catch((err) => {
      logger.error('[useGPXData] Unexpected error loading GPX data:', err);
    });
  }, [autoLoad]);

  const addTrack = useCallback((track: GPXTrack) => {
    setTracks((prev) => {
      const newMap = new Map(prev);
      // Assuming track has an 'id' property, or use filename
      const trackId = track.id || track.name || `track-${newMap.size + 1}`;
      newMap.set(trackId, track);
      return newMap;
    });
  }, []);

  const removeTrack = useCallback((trackId: string) => {
    setTracks((prev) => {
      const newMap = new Map(prev);
      newMap.delete(trackId);
      return newMap;
    });
  }, []);

  const clearTracks = useCallback(() => {
    setTracks(new Map());
  }, []);

  return {
    tracks,
    loading,
    error,
    addTrack,
    removeTrack,
    clearTracks,
    trackCount: tracks.size,
  };
}
