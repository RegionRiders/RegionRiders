'use client';

import {useEffect, useMemo, useRef, useState} from 'react';
import L from 'leaflet';
import logger from '@/lib/utils/logger';

interface UseLeafletMapOptions {
    center?: [number, number];
    zoom?: number;
    maxZoom?: number;
    minZoom?: number;
    /** tile layer url pattern with {z}/{x}/{y} placeholders */
    tileLayerUrl?: string;
    /** attribution text for map tiles */
    attribution?: string;
}

const DEFAULT_OPTIONS: UseLeafletMapOptions = {
    center: [54.352375, 18.656686], // Skrót Pluty - Gdańsk, Poland
    zoom: 11,
    maxZoom: 20,
    minZoom: 3,
    tileLayerUrl: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors © CARTO',
};

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
    options: UseLeafletMapOptions = {}
) {
    const mapRef = useRef<L.Map | null>(null);
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // merge provided options with defaults
    const config = useMemo(
        () => ({ ...DEFAULT_OPTIONS, ...options }),
        [options]
    );

    useEffect(() => {
        // prevent re-initialization if map already exists or container not ready
        if (mapRef.current || !containerRef.current) {
            return;
        }

        logger.info('[useLeafletMap] Initializing map...');

        try {
            // create leaflet map instance
            mapRef.current = L.map(containerRef.current, {
                center: config.center!,
                zoom: config.zoom!,
            });

            // add tile layer for map background
            L.tileLayer(config.tileLayerUrl!, {
                attribution: config.attribution,
                maxZoom: config.maxZoom,
                minZoom: config.minZoom,
            }).addTo(mapRef.current);

            // wait for map to be fully initialized
            mapRef.current.whenReady(() => {
                setIsReady(true);
                setError(null);
                logger.info('[useLeafletMap] Map initialized and ready');
            });
        } catch (err) {
            const errorMessage = `Failed to initialize map: ${err}`;
            logger.error('[useLeafletMap]', errorMessage);
            setError(errorMessage);
            setIsReady(false);
        }

        // cleanup function runs when component unmounts
        return () => {
            if (mapRef.current) {
                logger.info('[useLeafletMap] Cleaning up map...');
                mapRef.current.remove();
                mapRef.current = null;
                setIsReady(false);
            }
        };
    }, [containerRef]); // only re-run if container ref changes

    return {
        map: mapRef.current,
        isReady,
        error,
    };
}
