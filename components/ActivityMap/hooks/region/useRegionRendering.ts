'use client';

import { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';

import 'leaflet.vectorgrid';

import {
  REGION_VISIT_HEATMAP_COLOR_THRESHOLDS,
  REGION_VISIT_STATIC_COLOR_THRESHOLDS,
} from '@/components/ActivityMap/config/mapConfig';
import { getRegionTileProfileConfig } from '@/components/ActivityMap/config/regionTileProfiles';
import { RegionRenderMode } from '@/components/ActivityMap/controls/LayersPanel/types';
import { ensureMapPane } from '@/components/ActivityMap/hooks/activity/utils/ensureMapPane';
import { getRegionColorsHeatmap } from '@/components/ActivityMap/hooks/region/renderingModes/getRegionColorsHeatmap';
import { getRegionColorsStatic } from '@/components/ActivityMap/hooks/region/renderingModes/getRegionColorsStatic';
import { ColorThreshold } from '@/components/ActivityMap/mapTypes';
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

function serializeColorThresholds(thresholds: ColorThreshold[]): string {
  return JSON.stringify(thresholds);
}

function clampOpacity(value: number): number {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.min(Math.max(value, 0), 1);
}

function getEffectiveStaticColors(regionStaticColor: ColorThreshold[]): ColorThreshold[] {
  return regionStaticColor.length > 0 ? regionStaticColor : REGION_VISIT_STATIC_COLOR_THRESHOLDS;
}

function getEffectiveHeatmapColors(regionHeatmapColor: ColorThreshold[]): ColorThreshold[] {
  return regionHeatmapColor.length > 0 ? regionHeatmapColor : REGION_VISIT_HEATMAP_COLOR_THRESHOLDS;
}

function getRegionStyleColors(
  mode: RegionRenderMode,
  visit: RegionVisitData | undefined,
  regionStaticColor: ColorThreshold[],
  regionHeatmapColor: ColorThreshold[]
): { fillColor: string; strokeColor: string } {
  if (mode === 'heatmap') {
    return getRegionColorsHeatmap(visit, getEffectiveHeatmapColors(regionHeatmapColor));
  }

  return getRegionColorsStatic(visit, getEffectiveStaticColors(regionStaticColor));
}

function getUnvisitedRegionStyle(
  config: ReturnType<typeof getRegionTileProfileConfig>,
  mode: RegionRenderMode = 'static',
  regionBorderThickness: number = config.style.weight,
  regionLayerTransparency: number = config.style.opacity,
  regionStaticColor: ColorThreshold[] = REGION_VISIT_STATIC_COLOR_THRESHOLDS,
  regionHeatmapColor: ColorThreshold[] = REGION_VISIT_HEATMAP_COLOR_THRESHOLDS
): L.PathOptions {
  const { fillColor, strokeColor } = getRegionStyleColors(
    mode,
    undefined,
    regionStaticColor,
    regionHeatmapColor
  );

  return {
    color: strokeColor,
    weight: regionBorderThickness,
    fillColor,
    fillOpacity: clampOpacity(regionLayerTransparency),
    opacity: clampOpacity(regionLayerTransparency),
  };
}

function getVisitedRegionStyle(
  config: ReturnType<typeof getRegionTileProfileConfig>,
  visit: RegionVisitData,
  mode: RegionRenderMode = 'static',
  regionBorderThickness: number = config.style.weight,
  regionLayerTransparency: number = config.style.opacity,
  regionStaticColor: ColorThreshold[] = REGION_VISIT_STATIC_COLOR_THRESHOLDS,
  regionHeatmapColor: ColorThreshold[] = REGION_VISIT_HEATMAP_COLOR_THRESHOLDS
): L.PathOptions {
  const { fillColor, strokeColor } = getRegionStyleColors(
    mode,
    visit,
    regionStaticColor,
    regionHeatmapColor
  );

  return {
    color: strokeColor,
    weight: regionBorderThickness,
    fillColor,
    fillOpacity: clampOpacity(regionLayerTransparency),
    opacity: clampOpacity(regionLayerTransparency),
  };
}

function getRegionFeatureId(feature: RegionTileFeature): string {
  const regionId = feature.properties?.region_id;

  if (typeof regionId === 'string' && regionId.trim().length > 0) {
    return regionId.trim();
  }

  if (typeof regionId === 'number' && Number.isFinite(regionId)) {
    return String(regionId);
  }

  return String(feature.id ?? '');
}

export { getRegionFeatureId, getUnvisitedRegionStyle, getVisitedRegionStyle };

export function useRegionRendering(
  map: L.Map | null,
  visitData: Map<string, RegionVisitData>,
  showRegions: boolean = true,
  mode: RegionRenderMode = 'static',
  regionBorderThickness: number = 2,
  regionLayerTransparency: number = 1,
  regionStaticColor: ColorThreshold[] = [],
  regionHeatmapColor: ColorThreshold[] = [],
  onTileError?: (message: string) => void
) {
  const regionLayerRef = useRef<RegionVectorGridLayer | null>(null);
  const previousVisitedIdsRef = useRef<Set<string>>(new Set());
  const profile = useMemo(() => selectRegionRenderProfile(), []);
  const config = useMemo(() => getRegionTileProfileConfig(profile), [profile]);
  const staticColorSignature = serializeColorThresholds(regionStaticColor);
  const heatmapColorSignature = serializeColorThresholds(regionHeatmapColor);
  const effectiveStaticColors = useMemo(
    () => getEffectiveStaticColors(regionStaticColor),
    [staticColorSignature]
  );
  const effectiveHeatmapColors = useMemo(
    () => getEffectiveHeatmapColors(regionHeatmapColor),
    [heatmapColorSignature]
  );

  useEffect(() => {
    if (!showRegions) {
      previousVisitedIdsRef.current = new Set();
      onTileError?.('');
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
      onTileError?.('Region overlay unavailable');
      return;
    }

    const handleTileLoad = () => {
      markFirstRegionLayerAdded();
      onTileError?.('');
    };

    const handleTileError = (event: unknown) => {
      logRegionTileError(event);
      onTileError?.('Region overlay unavailable');
    };

    let layer: RegionVectorGridLayer | null = null;

    try {
      layer = vectorGridFactory.protobuf(config.sourceUrl, {
        interactive: false,
        pane: config.paneName,
        minZoom: config.minZoom,
        maxZoom: config.maxZoom,
        getFeatureId: getRegionFeatureId,
        vectorTileLayerStyles: {
          [config.layerName]: getUnvisitedRegionStyle(
            config,
            mode,
            regionBorderThickness,
            regionLayerTransparency,
            effectiveStaticColors,
            effectiveHeatmapColors
          ),
        },
      }) as RegionVectorGridLayer;

      layer.on('load', handleTileLoad);
      layer.on('tileerror', handleTileError);
      layer.addTo(map);
      regionLayerRef.current = layer;
    } catch (error) {
      layer?.off('load', handleTileLoad);
      layer?.off('tileerror', handleTileError);

      if (layer && map.hasLayer(layer)) {
        map.removeLayer(layer);
      }

      logger.error(`Failed to initialize region vector tile layer: ${error}`);
      onTileError?.('Region overlay unavailable');
      return;
    }

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
  }, [
    map,
    showRegions,
    config,
    profile,
    mode,
    regionBorderThickness,
    regionLayerTransparency,
    staticColorSignature,
    heatmapColorSignature,
    onTileError,
  ]);

  useEffect(() => {
    if (!showRegions) {
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
    nextVisitedIds.forEach((regionId) => {
      if (!previousVisitedIds.has(regionId)) {
        const visit = visitData.get(regionId);

        if (visit) {
          layer.setFeatureStyle?.(
            regionId,
            getVisitedRegionStyle(
              config,
              visit,
              mode,
              regionBorderThickness,
              regionLayerTransparency,
              effectiveStaticColors,
              effectiveHeatmapColors
            )
          );
        }
      }
    });

    previousVisitedIds.forEach((regionId) => {
      if (!nextVisitedIds.has(regionId)) {
        layer.resetFeatureStyle?.(regionId);
      }
    });

    previousVisitedIdsRef.current = nextVisitedIds;
  }, [
    config,
    map,
    mode,
    showRegions,
    visitData,
    regionBorderThickness,
    regionLayerTransparency,
    staticColorSignature,
    heatmapColorSignature,
  ]);
}
