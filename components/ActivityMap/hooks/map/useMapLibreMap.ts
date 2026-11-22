'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Map as MapLibreMap,
  type LayerSpecification,
  type SourceSpecification,
  type StyleSpecification,
} from 'maplibre-gl';
import { DEFAULT_MAP_CONFIG } from '@/components/ActivityMap/config/mapConfig';
import { MAP_LAYER_IDS, MAP_SOURCE_IDS } from '@/components/ActivityMap/config/mapLayerIds';
import { MapEngineConfig, RGBA } from '@/components/ActivityMap/mapTypes';
import { expandRasterTileUrls } from '@/components/ActivityMap/utils/expandRasterTileUrls';
import { createComponentLogger } from '@/lib/logger/client';
import { markRegionMapReady, resetRegionPerfMetrics } from '@/lib/services/maps/regionPerfMetrics';

const logger = createComponentLogger('useMapLibreMap');
const TRANSPARENT_TINT: RGBA = [0, 0, 0, 0];

function formatTintColor(tintColor?: RGBA): { color: string; opacity: number } {
  const [r, g, b, alpha] = tintColor ?? TRANSPARENT_TINT;
  const clampedAlpha = Number.isFinite(alpha) ? Math.min(Math.max(alpha, 0), 1) : 0;
  return {
    color: `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`,
    opacity: clampedAlpha,
  };
}

function createRasterSourceSpec(
  urlTemplate: string,
  attribution: string,
  minZoom: number,
  maxZoom: number
): SourceSpecification | null {
  const tiles = expandRasterTileUrls(urlTemplate);
  if (tiles.length === 0) {
    return null;
  }

  return {
    type: 'raster',
    tiles,
    tileSize: 256,
    minzoom: Math.max(0, Math.floor(minZoom)),
    maxzoom: Math.ceil(maxZoom),
    attribution,
  };
}

function buildInitialStyle(config: MapEngineConfig): StyleSpecification {
  const sources: Record<string, SourceSpecification> = {};
  const layers: LayerSpecification[] = [];

  const basemapSource = createRasterSourceSpec(
    config.tileLayerUrl,
    config.attribution,
    config.minZoom,
    config.maxZoom
  );
  if (basemapSource) {
    sources[MAP_SOURCE_IDS.BASEMAP] = basemapSource;
    layers.push({
      id: MAP_LAYER_IDS.BASEMAP_RASTER,
      type: 'raster',
      source: MAP_SOURCE_IDS.BASEMAP,
      paint: {
        'raster-saturation': config.mapSourceMonochrome ? -1 : 0,
      },
    });
  }

  const overlaySource = config.overlayTileLayerUrl
    ? createRasterSourceSpec(
        config.overlayTileLayerUrl,
        config.overlayAttribution ?? '',
        config.minZoom,
        config.maxZoom
      )
    : null;
  if (overlaySource) {
    sources[MAP_SOURCE_IDS.OVERLAY] = overlaySource;
    layers.push({
      id: MAP_LAYER_IDS.OVERLAY_RASTER,
      type: 'raster',
      source: MAP_SOURCE_IDS.OVERLAY,
      paint: {
        'raster-saturation': config.mapOverlayMonochrome ? -1 : 0,
      },
    });
  }

  const tint = formatTintColor(config.mapTintColor);
  layers.push({
    id: MAP_LAYER_IDS.MAP_TINT,
    type: 'background',
    paint: {
      'background-color': tint.color,
      'background-opacity': tint.opacity,
    },
  });

  return {
    version: 8,
    sources,
    layers,
  };
}

function syncRasterLayer(
  map: MapLibreMap,
  sourceId: string,
  layerId: string,
  urlTemplate: string | undefined,
  attribution: string,
  monochrome: boolean,
  minZoom: number,
  maxZoom: number,
  beforeId: string
): void {
  if (map.getLayer(layerId)) {
    map.removeLayer(layerId);
  }
  if (map.getSource(sourceId)) {
    map.removeSource(sourceId);
  }

  if (!urlTemplate) {
    return;
  }

  const sourceSpec = createRasterSourceSpec(urlTemplate, attribution, minZoom, maxZoom);
  if (!sourceSpec) {
    return;
  }

  map.addSource(sourceId, sourceSpec);
  const resolvedBeforeId = map.getLayer(beforeId) ? beforeId : undefined;
  map.addLayer(
    {
      id: layerId,
      type: 'raster',
      source: sourceId,
      paint: {
        'raster-saturation': monochrome ? -1 : 0,
      },
    },
    resolvedBeforeId
  );
}

/**
 * React hook for initializing and managing a MapLibre GL JS map instance.
 * Handles basemap/overlay raster layers, GPU monochrome saturation, tint layer, and cleanup.
 */
export function useMapLibreMap(
  containerRef: React.RefObject<HTMLDivElement | null>,
  options: Partial<MapEngineConfig> = {}
) {
  const mapRef = useRef<MapLibreMap | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const config: MapEngineConfig = useMemo(() => ({ ...DEFAULT_MAP_CONFIG, ...options }), [options]);

  const appliedTileConfigRef = useRef<string | null>(null);
  const getTileConfigKey = (cfg: MapEngineConfig) =>
    JSON.stringify({
      tileLayerUrl: cfg.tileLayerUrl,
      attribution: cfg.attribution,
      overlayTileLayerUrl: cfg.overlayTileLayerUrl ?? null,
      overlayAttribution: cfg.overlayAttribution ?? '',
      maxZoom: cfg.maxZoom,
      minZoom: cfg.minZoom,
    });

  // Initial map creation effect
  useEffect(() => {
    if (mapRef.current || !containerRef.current) {
      return;
    }

    logger.info('Initializing MapLibre GL JS map...');

    try {
      const [lat, lng] = config.center;
      const mapInstance = new MapLibreMap({
        container: containerRef.current,
        style: buildInitialStyle(config),
        center: [lng, lat],
        zoom: config.zoom,
        minZoom: config.minZoom,
        maxZoom: config.maxZoom,
        attributionControl: { compact: true },
      });

      mapRef.current = mapInstance;
      appliedTileConfigRef.current = getTileConfigKey(config);
      resetRegionPerfMetrics();

      const handleLoad = () => {
        markRegionMapReady();
        setIsReady(true);
        setError(null);
        logger.info('MapLibre map initialized and ready');
      };

      if (typeof mapInstance.loaded === 'function' && mapInstance.loaded()) {
        handleLoad();
      } else {
        mapInstance.once('load', handleLoad);
      }
    } catch (err) {
      const errorMessage = `Failed to initialize map: ${err}`;
      logger.error(errorMessage);
      setError(errorMessage);
      setIsReady(false);
    }

    return () => {
      if (mapRef.current) {
        logger.info('Cleaning up MapLibre map...');
        mapRef.current.remove();
        mapRef.current = null;
        setIsReady(false);
      }
    };
    // Map instance is created once on mount; subsequent updates are handled by dedicated effects.
  }, []);

  // Sync basemap and overlay tile sources without tearing down region/activity layers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isReady) {
      return;
    }

    const nextKey = getTileConfigKey(config);
    if (appliedTileConfigRef.current === nextKey) {
      return;
    }

    logger.info('Updating basemap/overlay tile layers...');

    // Basemap sits below overlay (if present) or map-tint
    const basemapBeforeId = map.getLayer(MAP_LAYER_IDS.OVERLAY_RASTER)
      ? MAP_LAYER_IDS.OVERLAY_RASTER
      : MAP_LAYER_IDS.MAP_TINT;

    syncRasterLayer(
      map,
      MAP_SOURCE_IDS.BASEMAP,
      MAP_LAYER_IDS.BASEMAP_RASTER,
      config.tileLayerUrl,
      config.attribution,
      Boolean(config.mapSourceMonochrome),
      config.minZoom,
      config.maxZoom,
      basemapBeforeId
    );

    syncRasterLayer(
      map,
      MAP_SOURCE_IDS.OVERLAY,
      MAP_LAYER_IDS.OVERLAY_RASTER,
      config.overlayTileLayerUrl,
      config.overlayAttribution ?? '',
      Boolean(config.mapOverlayMonochrome),
      config.minZoom,
      config.maxZoom,
      MAP_LAYER_IDS.MAP_TINT
    );

    appliedTileConfigRef.current = nextKey;
  }, [
    config,
    config.tileLayerUrl,
    config.attribution,
    config.overlayTileLayerUrl,
    config.overlayAttribution,
    config.maxZoom,
    config.minZoom,
    isReady,
  ]);

  // Sync GPU monochrome saturation and tint overlay without recreating tile sources
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isReady) {
      return;
    }

    if (map.getLayer(MAP_LAYER_IDS.BASEMAP_RASTER)) {
      map.setPaintProperty(
        MAP_LAYER_IDS.BASEMAP_RASTER,
        'raster-saturation',
        config.mapSourceMonochrome ? -1 : 0
      );
    }

    if (map.getLayer(MAP_LAYER_IDS.OVERLAY_RASTER)) {
      map.setPaintProperty(
        MAP_LAYER_IDS.OVERLAY_RASTER,
        'raster-saturation',
        config.mapOverlayMonochrome ? -1 : 0
      );
    }

    if (map.getLayer(MAP_LAYER_IDS.MAP_TINT)) {
      const tint = formatTintColor(config.mapTintColor);
      map.setPaintProperty(MAP_LAYER_IDS.MAP_TINT, 'background-color', tint.color);
      map.setPaintProperty(MAP_LAYER_IDS.MAP_TINT, 'background-opacity', tint.opacity);
    }
  }, [config.mapSourceMonochrome, config.mapOverlayMonochrome, config.mapTintColor, isReady]);

  return {
    map: mapRef.current,
    isReady,
    error,
  };
}
