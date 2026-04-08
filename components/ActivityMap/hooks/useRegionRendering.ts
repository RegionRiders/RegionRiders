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

/**
 * Renders region polygons from vector tiles using Leaflet VectorGrid.
 * Uses profile-based styling tuned for mobile and desktop.
 */
export function useRegionRendering(
  map: L.Map | null,
  showBorders: boolean = true,
  _visitData: Map<string, RegionVisitData> = new Map()
) {
  const regionLayerRef = useRef<L.Layer | null>(null);
  const profile = useMemo(() => selectRegionRenderProfile(), []);
  const config = useMemo(() => getRegionTileProfileConfig(profile), [profile]);

  useEffect(() => {
    if (!map || !showBorders) {
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
      vectorTileLayerStyles: {
        [config.layerName]: {
          color: config.style.color,
          weight: config.style.weight,
          fillColor: config.style.fillColor,
          fillOpacity: config.style.fillOpacity,
          opacity: config.style.opacity,
        },
      },
    }) as L.Layer;

    const handleTileLoad = () => {
      markFirstRegionLayerAdded();
    };

    const handleTileError = (event: unknown) => {
      logRegionTileError(event);
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
    };
  }, [map, showBorders, config, profile]);
}
