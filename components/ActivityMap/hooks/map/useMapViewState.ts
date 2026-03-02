'use client';

import { startTransition, useEffect, useRef, useState } from 'react';
import type L from 'leaflet';
import { latLngToTile } from '@/components/ActivityMap/utils/resolveTileUrl';
import { createComponentLogger } from '@/lib/logger/client';

const logger = createComponentLogger('useMapViewState');

/** Debounce delay (ms) — cancels stale updates during rapid scrolling */
const MOVEEND_DEBOUNCE_MS = 1000;

export interface MapViewState {
  center: [number, number];
  zoom: number;
}

/**
 * Tracks the current center and zoom of a Leaflet map instance.
 * Updates on the `moveend` event with a debounce so rapid panning
 * cancels queued updates — only the final position triggers a render.
 *
 * Optimizations:
 * - Debounces `moveend` to skip intermediate positions during fast scrolling
 * - Skips re-render when the tile coordinates haven't changed
 * - Uses `startTransition` so updates never block user interactions
 */
export function useMapViewState(map: L.Map | null): MapViewState | null {
  const [viewState, setViewState] = useState<MapViewState | null>(null);
  const prevTileRef = useRef<{ x: number; y: number; z: number } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!map || typeof map.getCenter !== 'function') {
      return;
    }

    logger.debug('Attaching moveend listener');

    const update = () => {
      const c = map.getCenter();
      const zoom = Math.round(map.getZoom());
      const { x, y } = latLngToTile(c.lat, c.lng, zoom);

      const prev = prevTileRef.current;
      if (prev && prev.x === x && prev.y === y && prev.z === zoom) {
        return;
      }

      prevTileRef.current = { x, y, z: zoom };
      logger.debug(`View updated: tile(${x}, ${y}) z${zoom}`);

      startTransition(() => {
        setViewState({
          center: [c.lat, c.lng],
          zoom,
        });
      });
    };

    const debouncedUpdate = () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(update, MOVEEND_DEBOUNCE_MS);
    };

    // Immediate first read — no debounce on mount
    update();
    map.on('moveend', debouncedUpdate);

    return () => {
      logger.debug('Detaching moveend listener');
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      map.off('moveend', debouncedUpdate);
    };
  }, [map]);

  return viewState;
}
