'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { DEFAULT_LEAFLET_CONFIG } from '@/components/ActivityMap/config/mapConfig';
import { LeafletConfig } from '@/components/ActivityMap/mapTypes';
import { createComponentLogger } from '@/lib/logger/client';

const logger = createComponentLogger('useLeafletMap');

/**
 * react hook for initializing and managing a leaflet map instance
 * handles map lifecycle, tile layer setup, and cleanup
 *
 * @param containerRef - ref to the dom element that will contain the map
 * @param options - optional map configuration overriding defaults
 * @returns object containing map instance, ready state, and error state
 *
 * @example
 * ```
 * const mapContainerRef = useRef<HTMLDivElement>(null);
 * const { map, isReady, error } = useLeafletMap(mapContainerRef, {
 *   center: [54.352375, 18.656686],
 *   zoom: 13
 * });
 *
 * useEffect(() => {
 *   if (map && isReady) {
 *     // add markers, layers, etc.
 *   }
 * }, [map, isReady]);
 * ```
 */
export function useLeafletMap(
  containerRef: React.RefObject<HTMLDivElement | null>,
  options: Partial<LeafletConfig> = {}
) {
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const config: LeafletConfig = useMemo(
    () => ({ ...DEFAULT_LEAFLET_CONFIG, ...options }),
    [options]
  );

  // Initial map creation effect
  useEffect(() => {
    if (mapRef.current || !containerRef.current) {
      return;
    }

    logger.info('Initializing map...');

    try {
      mapRef.current = L.map(containerRef.current, {
        center: config.center,
        zoom: config.zoom,
        maxZoom: config.maxZoom,
        minZoom: config.minZoom,
      });

      tileLayerRef.current = L.tileLayer(config.tileLayerUrl, {
        attribution: config.attribution,
        maxZoom: config.maxZoom,
        minZoom: config.minZoom,
      }).addTo(mapRef.current);

      mapRef.current.whenReady(() => {
        setIsReady(true);
        setError(null);
        logger.info('Map initialized and ready');
      });
    } catch (err) {
      const errorMessage = `Failed to initialize map: ${err}`;
      logger.error(`${errorMessage}`);
      setError(errorMessage);
      setIsReady(false);
    }

    return () => {
      if (mapRef.current) {
        logger.info('Cleaning up map...');
        mapRef.current.remove();
        mapRef.current = null;
        tileLayerRef.current = null;
        setIsReady(false);
      }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !isReady) {
      return;
    }

    logger.info('Updating tile layer...');

    if (tileLayerRef.current) {
      mapRef.current.removeLayer(tileLayerRef.current);
    }

    tileLayerRef.current = L.tileLayer(config.tileLayerUrl, {
      attribution: config.attribution,
      maxZoom: config.maxZoom,
      minZoom: config.minZoom,
    }).addTo(mapRef.current);
  }, [config.tileLayerUrl, config.attribution, config.maxZoom, config.minZoom, isReady]);

  return {
    map: mapRef.current,
    isReady,
    error,
  };
}
