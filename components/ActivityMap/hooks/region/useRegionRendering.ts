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
import { calculateWeightForZoom } from '@/components/ActivityMap/hooks/region/utils/calculateWeightForZoom';
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
  redraw?: () => void;
  _updateStyles?: (feature: unknown, renderer: unknown, style: L.PathOptions) => void;
  _vectorTiles?: Record<
    string,
    {
      _features?: Record<
        string,
        {
          layerName?: string;
          feature: unknown;
        }
      >;
    }
  >;
  options?: {
    vectorTileLayerStyles?: Record<
      string,
      L.PathOptions | ((properties?: Record<string, unknown>, tileZoom?: number) => L.PathOptions)
    >;
  };
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

function getColorAlpha(color: string): number | null {
  const rgbaMatch = color.match(
    /^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*([0-9]*\.?[0-9]+)\s*)?\)$/i
  );

  if (!rgbaMatch) {
    return null;
  }

  if (rgbaMatch[1] === undefined) {
    return 1;
  }

  const alpha = Number(rgbaMatch[1]);

  return Number.isFinite(alpha) ? alpha : null;
}

function getVisibleFillColor(
  fillColor: string,
  strokeOpacity: number,
  config: ReturnType<typeof getRegionTileProfileConfig>
): string {
  const fillAlpha = getColorAlpha(fillColor);

  if (strokeOpacity > 0 || fillAlpha === null || fillAlpha > 0) {
    return fillColor;
  }

  return config.style.fillColor;
}

function getRegionStrokeOpacity(
  currentZoom: number,
  config: ReturnType<typeof getRegionTileProfileConfig>,
  regionLayerTransparency: number
): number {
  if (currentZoom < config.strokeHideBelowZoom) {
    return 0;
  }

  if (currentZoom >= config.strokeFadeStartZoom) {
    return clampOpacity(regionLayerTransparency);
  }

  const fadeRange = config.strokeFadeStartZoom - config.strokeHideBelowZoom;
  if (fadeRange <= 0) {
    return clampOpacity(regionLayerTransparency);
  }

  const fadeProgress = (currentZoom - config.strokeHideBelowZoom) / fadeRange;
  return clampOpacity(regionLayerTransparency * fadeProgress);
}

function getRegionFillOpacity(
  currentZoom: number,
  config: ReturnType<typeof getRegionTileProfileConfig>,
  regionLayerTransparency: number
): number {
  if (currentZoom < config.strokeFadeStartZoom) {
    return clampOpacity(Math.max(regionLayerTransparency, config.minimumLowDetailFillOpacity));
  }

  return clampOpacity(regionLayerTransparency);
}

function getUnvisitedRegionStyle(
  config: ReturnType<typeof getRegionTileProfileConfig>,
  mode: RegionRenderMode = 'static',
  regionBorderThickness: number = config.style.weight,
  regionLayerTransparency: number = config.style.opacity,
  regionStaticColor: ColorThreshold[] = REGION_VISIT_STATIC_COLOR_THRESHOLDS,
  regionHeatmapColor: ColorThreshold[] = REGION_VISIT_HEATMAP_COLOR_THRESHOLDS,
  currentZoom: number = config.detailCapZoom
): L.PathOptions {
  const { fillColor, strokeColor } = getRegionStyleColors(
    mode,
    undefined,
    regionStaticColor,
    regionHeatmapColor
  );
  const opacity = getRegionStrokeOpacity(currentZoom, config, regionLayerTransparency);
  const fillOpacity = getRegionFillOpacity(currentZoom, config, regionLayerTransparency);

  return {
    color: strokeColor,
    weight: calculateWeightForZoom(currentZoom, regionBorderThickness),
    fill: true,
    fillColor: getVisibleFillColor(fillColor, opacity, config),
    fillOpacity,
    opacity,
  };
}

function getVisitedRegionStyle(
  config: ReturnType<typeof getRegionTileProfileConfig>,
  visit: RegionVisitData,
  mode: RegionRenderMode = 'static',
  regionBorderThickness: number = config.style.weight,
  regionLayerTransparency: number = config.style.opacity,
  regionStaticColor: ColorThreshold[] = REGION_VISIT_STATIC_COLOR_THRESHOLDS,
  regionHeatmapColor: ColorThreshold[] = REGION_VISIT_HEATMAP_COLOR_THRESHOLDS,
  currentZoom: number = config.detailCapZoom
): L.PathOptions {
  const { fillColor, strokeColor } = getRegionStyleColors(
    mode,
    visit,
    regionStaticColor,
    regionHeatmapColor
  );
  const opacity = getRegionStrokeOpacity(currentZoom, config, regionLayerTransparency);
  const fillOpacity = getRegionFillOpacity(currentZoom, config, regionLayerTransparency);

  return {
    color: strokeColor,
    weight: calculateWeightForZoom(currentZoom, regionBorderThickness),
    fill: true,
    fillColor: getVisibleFillColor(fillColor, opacity, config),
    fillOpacity,
    opacity,
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

function getVisitedRegionIds(visitData: Map<string, RegionVisitData>): Set<string> {
  return new Set(
    Array.from(visitData.entries())
      .filter(([, data]) => data.visited || data.visitCount > 0)
      .map(([regionId]) => regionId)
  );
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
  const currentZoomRef = useRef<number>(0);
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
  const styleSettingsRef = useRef({
    mode,
    regionBorderThickness,
    regionLayerTransparency,
    effectiveStaticColors,
    effectiveHeatmapColors,
  });
  const visitDataRef = useRef(visitData);

  styleSettingsRef.current = {
    mode,
    regionBorderThickness,
    regionLayerTransparency,
    effectiveStaticColors,
    effectiveHeatmapColors,
  };
  visitDataRef.current = visitData;

  const applyVisitedRegionStyles = (layerToUpdate: RegionVectorGridLayer, zoom: number) => {
    if (!layerToUpdate.setFeatureStyle || !layerToUpdate.resetFeatureStyle) {
      return;
    }

    const {
      mode: currentMode,
      regionBorderThickness: currentBorderThickness,
      regionLayerTransparency: currentLayerTransparency,
      effectiveStaticColors: currentStaticColors,
      effectiveHeatmapColors: currentHeatmapColors,
    } = styleSettingsRef.current;
    const currentVisitData = visitDataRef.current;
    const nextVisitedIds = getVisitedRegionIds(currentVisitData);
    const previousVisitedIds = previousVisitedIdsRef.current;

    nextVisitedIds.forEach((regionId) => {
      const visit = currentVisitData.get(regionId);

      if (visit) {
        layerToUpdate.setFeatureStyle?.(
          regionId,
          getVisitedRegionStyle(
            config,
            visit,
            currentMode,
            currentBorderThickness,
            currentLayerTransparency,
            currentStaticColors,
            currentHeatmapColors,
            zoom
          )
        );
      }
    });

    previousVisitedIds.forEach((regionId) => {
      if (!nextVisitedIds.has(regionId)) {
        layerToUpdate.resetFeatureStyle?.(regionId);
      }
    });

    previousVisitedIdsRef.current = nextVisitedIds;
  };

  const applyLayerStyles = (layerToUpdate: RegionVectorGridLayer, zoom: number) => {
    const getBaseStyleForZoom = (targetZoom: number) => {
      const {
        mode: currentMode,
        regionBorderThickness: currentBorderThickness,
        regionLayerTransparency: currentLayerTransparency,
        effectiveStaticColors: currentStaticColors,
        effectiveHeatmapColors: currentHeatmapColors,
      } = styleSettingsRef.current;

      return getUnvisitedRegionStyle(
        config,
        currentMode,
        currentBorderThickness,
        currentLayerTransparency,
        currentStaticColors,
        currentHeatmapColors,
        targetZoom
      );
    };
    const nextBaseStyle = getBaseStyleForZoom(zoom);

    if (layerToUpdate.options) {
      layerToUpdate.options.vectorTileLayerStyles = {
        ...(layerToUpdate.options.vectorTileLayerStyles ?? {}),
        [config.layerName]: () =>
          getBaseStyleForZoom(currentZoomRef.current || config.detailCapZoom),
      };
    }

    const renderedTiles = layerToUpdate._vectorTiles;
    const updateStyles = layerToUpdate._updateStyles;

    if (renderedTiles && updateStyles) {
      Object.values(renderedTiles).forEach((tile) => {
        Object.values(tile._features ?? {}).forEach((entry) => {
          if (entry.layerName !== config.layerName) {
            return;
          }

          updateStyles(entry.feature, tile, nextBaseStyle);
        });
      });
    } else {
      layerToUpdate.redraw?.();
    }

    applyVisitedRegionStyles(layerToUpdate, zoom);
  };

  useEffect(() => {
    if (!showRegions) {
      previousVisitedIdsRef.current = new Set();
      onTileError?.('');
      return;
    }

    if (!map) {
      return;
    }

    currentZoomRef.current = map.getZoom();

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
      if (regionLayerRef.current) {
        applyLayerStyles(regionLayerRef.current, currentZoomRef.current || map.getZoom());
      }

      markFirstRegionLayerAdded();
      onTileError?.('');
    };

    const handleTileError = (event: unknown) => {
      logRegionTileError(event);
      onTileError?.('Region overlay unavailable');
    };

    const handleZoomEnd = () => {
      const nextZoom = map.getZoom();
      currentZoomRef.current = nextZoom;

      if (regionLayerRef.current) {
        applyLayerStyles(regionLayerRef.current, nextZoom);
      }
    };

    let layer: RegionVectorGridLayer | null = null;
    const initialZoom = currentZoomRef.current || config.detailCapZoom;

    try {
      layer = vectorGridFactory.protobuf(config.sourceUrl, {
        interactive: false,
        pane: config.paneName,
        minZoom: config.minZoom,
        maxZoom: config.displayMaxZoom,
        maxNativeZoom: config.detailCapZoom,
        updateWhenZooming: false,
        keepBuffer: 4,
        getFeatureId: getRegionFeatureId,
        vectorTileLayerStyles: {
          [config.layerName]: () =>
            getUnvisitedRegionStyle(
              config,
              styleSettingsRef.current.mode,
              styleSettingsRef.current.regionBorderThickness,
              styleSettingsRef.current.regionLayerTransparency,
              styleSettingsRef.current.effectiveStaticColors,
              styleSettingsRef.current.effectiveHeatmapColors,
              currentZoomRef.current || initialZoom
            ),
        },
      }) as RegionVectorGridLayer;

      layer.on('load', handleTileLoad);
      layer.on('tileerror', handleTileError);
      layer.addTo(map);
      regionLayerRef.current = layer;
      map.on('zoomend', handleZoomEnd);
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
      map.off('zoomend', handleZoomEnd);

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
    onTileError,
  ]);

  useEffect(() => {
    if (!showRegions) {
      previousVisitedIdsRef.current = new Set();
      return;
    }

    const layer = regionLayerRef.current;
    const currentZoom = currentZoomRef.current || config.detailCapZoom;

    if (!layer) {
      return;
    }

    applyLayerStyles(layer, currentZoom);
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
