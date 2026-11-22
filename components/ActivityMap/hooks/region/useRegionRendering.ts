'use client';

import { useEffect, useMemo, useRef } from 'react';
import type { Map as MapLibreMap, MapSourceDataEvent } from 'maplibre-gl';
import {
  REGION_VISIT_HEATMAP_COLOR_THRESHOLDS,
  REGION_VISIT_STATIC_COLOR_THRESHOLDS,
} from '@/components/ActivityMap/config/mapConfig';
import { MAP_LAYER_IDS, MAP_SOURCE_IDS } from '@/components/ActivityMap/config/mapLayerIds';
import { getRegionTileProfileConfig } from '@/components/ActivityMap/config/regionTileProfiles';
import { RegionRenderMode } from '@/components/ActivityMap/controls/LayersPanel/types';
import { buildRegionPaintExpressions } from '@/components/ActivityMap/hooks/region/utils/buildRegionPaintExpressions';
import {
  getEffectiveColors,
  getRegionFeatureId,
  getUnvisitedRegionStyle,
  getVisitedRegionStyle,
  serializeColorThresholds,
} from '@/components/ActivityMap/hooks/region/utils/regionStyleHelpers';
import { ColorThreshold } from '@/components/ActivityMap/mapTypes';
import { resolveAbsoluteTileUrl } from '@/components/ActivityMap/utils/expandRasterTileUrls';
import { createComponentLogger } from '@/lib/logger/client';
import {
  logRegionTileError,
  markFirstRegionLayerAdded,
} from '@/lib/services/maps/regionPerfMetrics';
import { selectRegionRenderProfile } from '@/lib/services/maps/selectRenderProfile';
import { RegionVisitData } from '@/lib/utils/regionVisitAnalyzer';

const logger = createComponentLogger('useRegionRendering');

export { getRegionFeatureId, getUnvisitedRegionStyle, getVisitedRegionStyle };

function findActivityBeforeLayerId(map: MapLibreMap): string | undefined {
  if (map.getLayer(MAP_LAYER_IDS.ACTIVITIES_HEATMAP)) {
    return MAP_LAYER_IDS.ACTIVITIES_HEATMAP;
  }
  if (map.getLayer(MAP_LAYER_IDS.ACTIVITIES_LINES)) {
    return MAP_LAYER_IDS.ACTIVITIES_LINES;
  }
  return undefined;
}

export function useRegionRendering(
  map: MapLibreMap | null,
  visitData: Map<string, RegionVisitData>,
  showRegions: boolean = true,
  mode: RegionRenderMode = 'static',
  regionBorderThickness: number = 2,
  regionLayerTransparency: number = 1,
  regionStaticColor: ColorThreshold[] = [],
  regionHeatmapColor: ColorThreshold[] = [],
  onTileError?: (message: string) => void
) {
  const previousVisitedIdsRef = useRef<Set<string>>(new Set());
  const isLayerMountedRef = useRef<boolean>(false);
  const config = useMemo(() => getRegionTileProfileConfig(selectRegionRenderProfile()), []);

  const staticColorSignature = serializeColorThresholds(regionStaticColor);
  const heatmapColorSignature = serializeColorThresholds(regionHeatmapColor);

  const effectiveStaticColors = useMemo(
    () => getEffectiveColors(regionStaticColor, REGION_VISIT_STATIC_COLOR_THRESHOLDS),
    [staticColorSignature]
  );
  const effectiveHeatmapColors = useMemo(
    () => getEffectiveColors(regionHeatmapColor, REGION_VISIT_HEATMAP_COLOR_THRESHOLDS),
    [heatmapColorSignature]
  );

  const paintSpecs = useMemo(
    () =>
      buildRegionPaintExpressions({
        config,
        mode,
        regionBorderThickness,
        regionLayerTransparency,
        regionStaticColor: effectiveStaticColors,
        regionHeatmapColor: effectiveHeatmapColors,
      }),
    [
      config,
      mode,
      regionBorderThickness,
      regionLayerTransparency,
      effectiveStaticColors,
      effectiveHeatmapColors,
    ]
  );

  const paintSpecsRef = useRef(paintSpecs);
  paintSpecsRef.current = paintSpecs;

  // Lifecycle effect: mount / unmount vector tile source and fill+line layers
  useEffect(() => {
    if (!showRegions) {
      previousVisitedIdsRef.current = new Set();
      isLayerMountedRef.current = false;
      onTileError?.('');
      return;
    }

    if (!map) {
      return;
    }

    const tileUrl = resolveAbsoluteTileUrl(config.sourceUrl);
    const beforeId = findActivityBeforeLayerId(map);

    const handleSourceData = (event: MapSourceDataEvent) => {
      if (event.sourceId === MAP_SOURCE_IDS.REGIONS && event.isSourceLoaded) {
        markFirstRegionLayerAdded();
        onTileError?.('');
      }
    };

    const handleMapError = (event: { sourceId?: string; error?: unknown }) => {
      if (event.sourceId === MAP_SOURCE_IDS.REGIONS) {
        logRegionTileError(event);
        onTileError?.('Region overlay unavailable');
      }
    };

    try {
      if (map.getLayer(MAP_LAYER_IDS.REGIONS_LINE)) {
        map.removeLayer(MAP_LAYER_IDS.REGIONS_LINE);
      }
      if (map.getLayer(MAP_LAYER_IDS.REGIONS_FILL)) {
        map.removeLayer(MAP_LAYER_IDS.REGIONS_FILL);
      }
      if (map.getSource(MAP_SOURCE_IDS.REGIONS)) {
        map.removeSource(MAP_SOURCE_IDS.REGIONS);
      }

      map.addSource(MAP_SOURCE_IDS.REGIONS, {
        type: 'vector',
        tiles: [tileUrl],
        minzoom: Math.max(0, config.minZoom - 1),
        maxzoom: config.detailCapZoom,
        promoteId: { [config.layerName]: 'region_id' },
      });

      map.addLayer(
        {
          id: MAP_LAYER_IDS.REGIONS_FILL,
          type: 'fill',
          source: MAP_SOURCE_IDS.REGIONS,
          'source-layer': config.layerName,
          paint: paintSpecsRef.current.fillPaint,
        },
        beforeId
      );

      map.addLayer(
        {
          id: MAP_LAYER_IDS.REGIONS_LINE,
          type: 'line',
          source: MAP_SOURCE_IDS.REGIONS,
          'source-layer': config.layerName,
          paint: paintSpecsRef.current.linePaint,
        },
        beforeId
      );

      map.on('sourcedata', handleSourceData);
      map.on('error', handleMapError);
      isLayerMountedRef.current = true;
      logger.info('MapLibre vector tile regions enabled');
    } catch (error) {
      map.off('sourcedata', handleSourceData);
      map.off('error', handleMapError);
      isLayerMountedRef.current = false;
      logger.error(`Failed to initialize MapLibre region vector tile layer: ${error}`);
      onTileError?.('Region overlay unavailable');
      return;
    }

    return () => {
      map.off('sourcedata', handleSourceData);
      map.off('error', handleMapError);

      if (map.getLayer(MAP_LAYER_IDS.REGIONS_LINE)) {
        map.removeLayer(MAP_LAYER_IDS.REGIONS_LINE);
      }
      if (map.getLayer(MAP_LAYER_IDS.REGIONS_FILL)) {
        map.removeLayer(MAP_LAYER_IDS.REGIONS_FILL);
      }
      if (map.getSource(MAP_SOURCE_IDS.REGIONS)) {
        map.removeSource(MAP_SOURCE_IDS.REGIONS);
      }

      isLayerMountedRef.current = false;
      previousVisitedIdsRef.current = new Set();
    };
  }, [map, showRegions, config, onTileError]);

  // Zero-flicker GPU paint update effect (never removes or recreates layers)
  useEffect(() => {
    if (!map || !showRegions || !isLayerMountedRef.current) {
      return;
    }

    if (map.getLayer(MAP_LAYER_IDS.REGIONS_FILL)) {
      map.setPaintProperty(
        MAP_LAYER_IDS.REGIONS_FILL,
        'fill-color',
        paintSpecs.fillPaint['fill-color']
      );
      map.setPaintProperty(
        MAP_LAYER_IDS.REGIONS_FILL,
        'fill-opacity',
        paintSpecs.fillPaint['fill-opacity']
      );
    }

    if (map.getLayer(MAP_LAYER_IDS.REGIONS_LINE)) {
      map.setPaintProperty(
        MAP_LAYER_IDS.REGIONS_LINE,
        'line-color',
        paintSpecs.linePaint['line-color']
      );
      map.setPaintProperty(
        MAP_LAYER_IDS.REGIONS_LINE,
        'line-width',
        paintSpecs.linePaint['line-width']
      );
      map.setPaintProperty(
        MAP_LAYER_IDS.REGIONS_LINE,
        'line-opacity',
        paintSpecs.linePaint['line-opacity']
      );
    }
  }, [map, showRegions, paintSpecs]);

  // Sync per-region visited state via GPU feature-state
  useEffect(() => {
    if (
      !map ||
      !showRegions ||
      !isLayerMountedRef.current ||
      !map.getSource(MAP_SOURCE_IDS.REGIONS)
    ) {
      return;
    }

    const nextVisitedIds = new Set<string>();

    visitData.forEach((visit, regionId) => {
      const visited = Boolean(visit.visited) && visit.visitCount > 0;
      if (visited) {
        nextVisitedIds.add(regionId);
      }
      map.setFeatureState(
        {
          source: MAP_SOURCE_IDS.REGIONS,
          sourceLayer: config.layerName,
          id: regionId,
        },
        {
          visited,
          visitCount: visited ? visit.visitCount : 0,
        }
      );
    });

    previousVisitedIdsRef.current.forEach((staleRegionId) => {
      if (!nextVisitedIds.has(staleRegionId)) {
        map.removeFeatureState({
          source: MAP_SOURCE_IDS.REGIONS,
          sourceLayer: config.layerName,
          id: staleRegionId,
        });
      }
    });

    previousVisitedIdsRef.current = nextVisitedIds;
  }, [map, showRegions, visitData, config.layerName]);
}
