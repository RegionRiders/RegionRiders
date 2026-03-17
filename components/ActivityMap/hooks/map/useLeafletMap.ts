'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { DEFAULT_LEAFLET_CONFIG } from '@/components/ActivityMap/config/mapConfig';
import { LeafletConfig, RGBA } from '@/components/ActivityMap/mapTypes';
import { createComponentLogger } from '@/lib/logger/client';

const logger = createComponentLogger('useLeafletMap');
const TINT_OVERLAY_Z_INDEX = 350; // Above tile layers (z=200), below vector overlays (z=400+)
const TRANSPARENT_TINT: RGBA = [0, 0, 0, 0];
const MAP_TINT_PANE = 'mapTintPane';

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
  const overlayTileLayerRef = useRef<L.TileLayer | null>(null);
  const tintOverlayRef = useRef<HTMLDivElement | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const config: LeafletConfig = useMemo(
    () => ({ ...DEFAULT_LEAFLET_CONFIG, ...options }),
    [options]
  );

  const applyMonochromeFilter = (layer: L.TileLayer | null, monochrome: boolean) => {
    const layerContainer = layer?.getContainer?.();
    if (!layerContainer) {
      return;
    }
    layerContainer.style.filter = monochrome ? 'grayscale(1)' : '';
  };

  const updateTintOverlay = (tintColor?: LeafletConfig['mapTintColor']) => {
    if (!mapRef.current) {
      return;
    }
    const getPane = mapRef.current.getPane?.bind(mapRef.current);
    const createPane = mapRef.current.createPane?.bind(mapRef.current);
    const tintPane = (getPane ? getPane(MAP_TINT_PANE) : undefined) ||
      (createPane ? createPane(MAP_TINT_PANE) : undefined);
    tintPane?.style.setProperty('z-index', String(TINT_OVERLAY_Z_INDEX));
    tintPane?.style.setProperty('pointer-events', 'none');

    if (!tintOverlayRef.current) {
      const overlay = document.createElement('div');
      overlay.style.position = 'absolute';
      overlay.style.inset = '0';
      overlay.style.width = '100%';
      overlay.style.height = '100%';
      overlay.style.pointerEvents = 'none';
      overlay.style.mixBlendMode = 'multiply';
      if (tintPane) {
        tintPane.appendChild(overlay);
      } else {
        mapRef.current.getContainer?.().appendChild(overlay);
      }
      tintOverlayRef.current = overlay;
    }

    const overlay = tintOverlayRef.current;
    const [r, g, b, alpha] = tintColor ?? TRANSPARENT_TINT;
    overlay.style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${alpha})`;
    overlay.style.display = alpha > 0 ? 'block' : 'none';
  };

  const createTileLayer = (url: string, attribution: string) =>
    L.tileLayer(url, {
      attribution,
      maxZoom: config.maxZoom,
      minZoom: config.minZoom,
    });

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

      tileLayerRef.current = createTileLayer(config.tileLayerUrl, config.attribution).addTo(
        mapRef.current
      );
      applyMonochromeFilter(tileLayerRef.current, Boolean(config.mapSourceMonochrome));
      if (config.overlayTileLayerUrl) {
        overlayTileLayerRef.current = createTileLayer(
          config.overlayTileLayerUrl,
          config.overlayAttribution ?? ''
        ).addTo(mapRef.current);
        applyMonochromeFilter(overlayTileLayerRef.current, Boolean(config.mapOverlayMonochrome));
      }
      updateTintOverlay(config.mapTintColor);

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
        overlayTileLayerRef.current = null;
        tintOverlayRef.current = null;
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

    tileLayerRef.current = createTileLayer(config.tileLayerUrl, config.attribution).addTo(mapRef.current);
    applyMonochromeFilter(tileLayerRef.current, Boolean(config.mapSourceMonochrome));

    if (overlayTileLayerRef.current) {
      mapRef.current.removeLayer(overlayTileLayerRef.current);
      overlayTileLayerRef.current = null;
    }
    if (config.overlayTileLayerUrl) {
      overlayTileLayerRef.current = createTileLayer(
        config.overlayTileLayerUrl,
        config.overlayAttribution ?? ''
      ).addTo(mapRef.current);
      applyMonochromeFilter(overlayTileLayerRef.current, Boolean(config.mapOverlayMonochrome));
    }

    updateTintOverlay(config.mapTintColor);
  }, [
    config.tileLayerUrl,
    config.attribution,
    config.overlayTileLayerUrl,
    config.overlayAttribution,
    config.mapSourceMonochrome,
    config.mapOverlayMonochrome,
    config.mapTintColor,
    config.maxZoom,
    config.minZoom,
    isReady,
  ]);

  return {
    map: mapRef.current,
    isReady,
    error,
  };
}
