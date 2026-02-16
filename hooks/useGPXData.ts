'use client';

import { useCallback, useEffect, useState } from 'react';
import { PerformanceConfig } from '@/lib/config/performanceConfig';
import { createComponentLogger } from '@/lib/logger/client';
import { DataLoader } from '@/lib/services/loaders';
import { GPXTrack } from '@/lib/types';

const logger = createComponentLogger('useGPXData');

/**
 * manages gpx track data loading with pagination and lazy loading
 * provides add/remove/clear operations for track management
 *
 * @param autoLoad - whether to load tracks on mount (default: true)
 * @param initialLimit - initial number of tracks to load (default: from config)
 * @returns track map, loading state, error, and management functions
 */
export function useGPXData(
  autoLoad: boolean = true,
  initialLimit: number = PerformanceConfig.GPX.INITIAL_LOAD_LIMIT
) {
  const [tracks, setTracks] = useState<Map<string, GPXTrack>>(new Map());
  const [loading, setLoading] = useState(autoLoad);
  const [error, setError] = useState<string | null>(null);
  const [totalAvailable, setTotalAvailable] = useState<number>(0);
  const [currentOffset, setCurrentOffset] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(true);

  // Initial load
  useEffect(() => {
    if (!autoLoad) {
      return;
    }

    const loadInitialTracks = async () => {
      try {
        setLoading(true);

        // Get total count first
        const total = await DataLoader.getTotalTrackCount();
        setTotalAvailable(total);

        // Load initial batch
        const loadedTracks = await DataLoader.loadGPXTracks('local', {
          limit: initialLimit,
          offset: 0,
        });

        logger.info(`Loaded ${loadedTracks.size}/${total} tracks initially`);

        setTracks(loadedTracks);
        setCurrentOffset(initialLimit);
        setHasMore(initialLimit < total);
        setError(null);
      } catch (err) {
        const errorMsg = `Failed to load GPX data: ${err}`;
        setError(errorMsg);
        logger.error(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    loadInitialTracks().catch((err) => {
      logger.error('Unexpected error loading GPX data:', err);
    });
  }, [autoLoad, initialLimit]);

  /**
   * Load more tracks (for infinite scroll or "load more" button)
   */
  const loadMore = useCallback(
    async (chunkSize: number = PerformanceConfig.GPX.CHUNK_SIZE) => {
      if (loading || !hasMore) {
        return;
      }

      try {
        setLoading(true);

        const moreTracks = await DataLoader.loadGPXTracks('local', {
          limit: chunkSize,
          offset: currentOffset,
        });

        logger.info(
          `Loaded ${moreTracks.size} more tracks (${currentOffset + moreTracks.size}/${totalAvailable})`
        );

        // Merge with existing tracks
        setTracks((prev) => {
          const merged = new Map(prev);
          moreTracks.forEach((track, id) => merged.set(id, track));
          return merged;
        });

        const newOffset = currentOffset + moreTracks.size;
        setCurrentOffset(newOffset);
        setHasMore(newOffset < totalAvailable);
        setError(null);
      } catch (err) {
        const errorMsg = `Failed to load more tracks: ${err}`;
        setError(errorMsg);
        logger.error(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    [loading, hasMore, currentOffset, totalAvailable]
  );

  /**
   * Load all remaining tracks at once (use with caution)
   */
  const loadAll = useCallback(async () => {
    if (loading || !hasMore) {
      return;
    }

    try {
      setLoading(true);

      const remaining = totalAvailable - currentOffset;
      logger.warn(`Loading all ${remaining} remaining tracks - this may impact performance`);

      const moreTracks = await DataLoader.loadGPXTracks('local', {
        limit: remaining,
        offset: currentOffset,
      });

      setTracks((prev) => {
        const merged = new Map(prev);
        moreTracks.forEach((track, id) => merged.set(id, track));
        return merged;
      });

      setCurrentOffset(totalAvailable);
      setHasMore(false);
      setError(null);
    } catch (err) {
      const errorMsg = `Failed to load all tracks: ${err}`;
      setError(errorMsg);
      logger.error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, currentOffset, totalAvailable]);

  const addTrack = useCallback((track: GPXTrack) => {
    setTracks((prev) => {
      const newMap = new Map(prev);
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
    setCurrentOffset(0);
    setHasMore(true);
  }, []);

  return {
    tracks,
    loading,
    error,
    addTrack,
    removeTrack,
    clearTracks,
    trackCount: tracks.size,
    // New pagination fields
    totalAvailable,
    hasMore,
    loadMore,
    loadAll,
    loadedPercentage: totalAvailable > 0 ? (tracks.size / totalAvailable) * 100 : 0,
  };
}
