'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { DEFAULT_LEAFLET_CONFIG } from '@/components/ActivityMap/config/mapConfig';
import { LeafletConfig, RGBA } from '@/components/ActivityMap/mapTypes';
import { createComponentLogger } from '@/lib/logger/client';

const logger = createComponentLogger('useLeafletMap');
const TRANSPARENT_TINT: RGBA = [0, 0, 0, 0];

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

    if (!tintOverlayRef.current) {
      const overlay = document.createElement('div');
      overlay.style.position = 'absolute';
      overlay.style.top = '-9999px';
      overlay.style.left = '-9999px';
      overlay.style.width = '20000px';
      overlay.style.height = '20000px';
      overlay.style.pointerEvents = 'none';
      overlay.style.zIndex = '250'; // above tilePane(200), below overlayPane(400)

      // Append to leaflet-map-pane
      const mapPaneEl = mapRef.current.getPane('mapPane') as HTMLElement;
      mapPaneEl.appendChild(overlay);
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

  // Update map by recreating it
  useEffect(() => {
    if (!mapRef.current || !isReady) {
      return;
    }

    logger.info('Updating tile layer...');

    if (tileLayerRef.current) {
      mapRef.current.removeLayer(tileLayerRef.current);
    }

    tileLayerRef.current = createTileLayer(config.tileLayerUrl, config.attribution).addTo(
      mapRef.current
    );
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
    config.maxZoom,
    config.minZoom,
    isReady,
  ]);

  // Update map without recreating it
  useEffect(() => {
    applyMonochromeFilter(tileLayerRef.current, Boolean(config.mapSourceMonochrome));
    if (config.overlayTileLayerUrl) {
      applyMonochromeFilter(overlayTileLayerRef.current, Boolean(config.mapOverlayMonochrome));
    }

    updateTintOverlay(config.mapTintColor);
  }, [config.mapSourceMonochrome, config.mapOverlayMonochrome, config.mapTintColor]);

  return {
    map: mapRef.current,
    isReady,
    error,
  };
}
