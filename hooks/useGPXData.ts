'use client';

import { useEffect, useState, useCallback } from 'react';
import { DataLoader } from '@/lib/services/DataLoader';
import {GPXTrack} from "@/lib/types/types";

export function useGPXData(autoLoad: boolean = true) {
  const [tracks, setTracks] = useState<Map<string, GPXTrack>>(new Map());
  const [loading, setLoading] = useState(autoLoad);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!autoLoad) {return;}

    const loadTracks = async () => {
      try {
        setLoading(true);
        const loadedTracks = await DataLoader.loadGPXTracks('local');

        const trackMap = new Map(loadedTracks.map((t) => [t.id, t]));
        setTracks(trackMap);
        setError(null);
      } catch (err) {
        setError(`Failed to load GPX data: ${err}`);
      } finally {
        setLoading(false);
      }
    };

    loadTracks().catch((err) => {
        console.error('Unexpected error loading GPX data:', err);
    });
  }, [autoLoad]);

  const addTrack = useCallback((track: GPXTrack) => {
    setTracks((prev) => new Map(prev).set(track.id, track));
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
