'use client';

import { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';

import 'leaflet.vectorgrid';

import { getRegionTileProfileConfig } from '@/components/ActivityMap/config/regionTileProfiles';
import { ensureMapPane } from '@/components/ActivityMap/drawActivities/utils/ensureMapPane';
import { createComponentLogger } from '@/lib/logger/client';
import {
  logRegionTileError,
  markFirstRegionLayerAdded,
} from '@/lib/services/maps/regionPerfMetrics';
import { selectRegionRenderProfile } from '@/lib/services/maps/selectRenderProfile';
import { RegionVisitData } from '@/lib/utils/regionVisitAnalyzer';

const logger = createComponentLogger('useRegionRendering');

type RegionTileFeature = {
  properties?: Record<string, unknown>;
  id?: string | number;
};

type RegionVectorGridLayer = L.Layer & {
  setFeatureStyle?: (featureId: string | number, style: L.PathOptions) => void;
  resetFeatureStyle?: (featureId: string | number) => void;
};

function getUnvisitedRegionStyle(
  config: ReturnType<typeof getRegionTileProfileConfig>
): L.PathOptions {
  return {
    color: config.style.color,
    weight: config.style.weight,
    fillColor: config.style.fillColor,
    fillOpacity: config.style.fillOpacity,
    opacity: config.style.opacity,
  };
}

function getVisitedRegionStyle(
  config: ReturnType<typeof getRegionTileProfileConfig>
): L.PathOptions {
  return {
    color: '#dc1414',
    weight: Math.max(config.style.weight, 1.5),
    fillColor: '#dc1414',
    fillOpacity: Math.max(config.style.fillOpacity, 0.12),
    opacity: 1,
  };
}

function getRegionFeatureId(feature: RegionTileFeature): string {
  const regionId = feature.properties?.region_id;

  if (typeof regionId === 'string' && regionId.trim().length > 0) {
    return regionId;
  }

  return String(feature.id ?? '');
}

export { getRegionFeatureId, getUnvisitedRegionStyle, getVisitedRegionStyle };

/**
 * Renders region polygons from vector tiles using Leaflet VectorGrid.
 * Uses profile-based styling tuned for mobile and desktop.
 */
export function useRegionRendering(
  map: L.Map | null,
  showBorders: boolean = true,
  visitData: Map<string, RegionVisitData> = new Map<string, RegionVisitData>(),
  onTileError?: (message: string) => void
) {
  const regionLayerRef = useRef<RegionVectorGridLayer | null>(null);
  const previousVisitedIdsRef = useRef<Set<string>>(new Set());
  const profile = useMemo(() => selectRegionRenderProfile(), []);
  const config = useMemo(() => getRegionTileProfileConfig(profile), [profile]);

  useEffect(() => {
    if (!showBorders) {
      previousVisitedIdsRef.current = new Set();
      return;
    }

    if (!map) {
      return;
    }

    ensureMapPane(map, config.paneName, '430');

    if (regionLayerRef.current && map.hasLayer(regionLayerRef.current)) {
      map.removeLayer(regionLayerRef.current);
      regionLayerRef.current = null;
    }

    const vectorGridFactory = (L as any).vectorGrid;

    if (!vectorGridFactory?.protobuf) {
      logger.error('Leaflet.VectorGrid plugin not available');
      return;
    }

    const layer = vectorGridFactory.protobuf(config.sourceUrl, {
      interactive: false,
      pane: config.paneName,
      minZoom: config.minZoom,
      maxZoom: config.maxZoom,
      getFeatureId: getRegionFeatureId,
      vectorTileLayerStyles: {
        [config.layerName]: getUnvisitedRegionStyle(config),
      },
    }) as RegionVectorGridLayer;

    const handleTileLoad = () => {
      markFirstRegionLayerAdded();
      onTileError?.('');
    };

    const handleTileError = (event: unknown) => {
      logRegionTileError(event);
      onTileError?.('Region overlay unavailable');
    };

    layer.on('load', handleTileLoad);
    layer.on('tileerror', handleTileError);
    layer.addTo(map);
    regionLayerRef.current = layer;

    logger.info(`Vector tile regions enabled with ${profile} profile`);

    return () => {
      layer.off('load', handleTileLoad);
      layer.off('tileerror', handleTileError);

      if (map.hasLayer(layer)) {
        map.removeLayer(layer);
      }

      if (regionLayerRef.current === layer) {
        regionLayerRef.current = null;
      }

      previousVisitedIdsRef.current = new Set();
    };
  }, [map, showBorders, config, profile, onTileError]);

  useEffect(() => {
    if (!showBorders) {
      previousVisitedIdsRef.current = new Set();
      return;
    }

    const layer = regionLayerRef.current;

    if (!layer?.setFeatureStyle || !layer?.resetFeatureStyle) {
      return;
    }

    const nextVisitedIds = new Set(
      Array.from(visitData.entries())
        .filter(([, data]) => data.visited || data.visitCount > 0)
        .map(([regionId]) => regionId)
    );

    const previousVisitedIds = previousVisitedIdsRef.current;
    const visitedStyle = getVisitedRegionStyle(config);

    nextVisitedIds.forEach((regionId) => {
      if (!previousVisitedIds.has(regionId)) {
        layer.setFeatureStyle?.(regionId, visitedStyle);
      }
    });

    previousVisitedIds.forEach((regionId) => {
      if (!nextVisitedIds.has(regionId)) {
        layer.resetFeatureStyle?.(regionId);
      }
    });

    previousVisitedIdsRef.current = nextVisitedIds;
  }, [config, showBorders, visitData]);
}
