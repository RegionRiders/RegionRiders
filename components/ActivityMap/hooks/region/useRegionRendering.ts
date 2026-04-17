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
import {
  getBaseRegionStyle,
  getEffectiveColors,
  getRegionFeatureId,
  getRegionPathStyle,
  getUnvisitedRegionStyle,
  getVisitedRegionStyle,
  RegionStyleSettings,
  serializeColorThresholds,
} from '@/components/ActivityMap/hooks/region/utils/regionStyleHelpers';
import {
  commitPendingZoom,
  clearPendingZoomState,
  getVisibleStyleZoom,
  markPendingTileReady,
  preparePendingCommit,
  RegionZoomAnimationEvent,
  RegionZoomState,
  syncVisibleZoom,
} from '@/components/ActivityMap/hooks/region/utils/regionZoomState';
import {
  clearRegionPaneOpacity,
  getVisitedRegionIds,
  RegionTileEvent,
  RegionVectorGridLayer,
  optimizeRegionVectorGridLayer,
  syncCoveredRegionTiles,
  syncRenderedRegionPanePaths,
  syncRegionPaneOpacity,
  updateRenderedTileStyles,
} from '@/components/ActivityMap/hooks/region/utils/regionVectorGridHelpers';
import { ColorThreshold } from '@/components/ActivityMap/mapTypes';
import { createComponentLogger } from '@/lib/logger/client';
import {
  logRegionTileError,
  markFirstRegionLayerAdded,
} from '@/lib/services/maps/regionPerfMetrics';
import { selectRegionRenderProfile } from '@/lib/services/maps/selectRenderProfile';
import { RegionVisitData } from '@/lib/utils/regionVisitAnalyzer';

const logger = createComponentLogger('useRegionRendering');

export { getRegionFeatureId, getUnvisitedRegionStyle, getVisitedRegionStyle };

function getRegionRendererFactory() {
  return (L as any).canvas?.tile ?? (L as any).svg?.tile;
}

function isRegionRenderingDebugEnabled(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return (
    (
      window as Window & {
        __RR_ACTIVITY_MAP_DEBUG__?: boolean;
      }
    ).__RR_ACTIVITY_MAP_DEBUG__ === true
  );
}

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
  const zoomStateRef = useRef<RegionZoomState>({
    currentZoom: 0,
    committedStyleZoom: 0,
    visibleStyleZoom: 0,
    pendingCommitZoom: null,
    pendingTileZoom: null,
    pendingTileReady: false,
  });
  const config = useMemo(() => getRegionTileProfileConfig(selectRegionRenderProfile()), []);
  const staticColorSignature = serializeColorThresholds(regionStaticColor);
  const heatmapColorSignature = serializeColorThresholds(regionHeatmapColor);
  const styleSettingsRef = useRef<RegionStyleSettings>({
    mode,
    regionBorderThickness,
    effectiveStaticColors: [],
    effectiveHeatmapColors: [],
  });
  const visitDataRef = useRef(visitData);
  const debugLog = (message: string, payload?: Record<string, unknown>) => {
    if (!isRegionRenderingDebugEnabled()) {
      return;
    }

    if (payload) {
      logger.info(message, JSON.stringify(payload));
      return;
    }

    logger.info(message);
  };

  styleSettingsRef.current = {
    mode,
    regionBorderThickness,
    effectiveStaticColors: getEffectiveColors(
      regionStaticColor,
      REGION_VISIT_STATIC_COLOR_THRESHOLDS
    ),
    effectiveHeatmapColors: getEffectiveColors(
      regionHeatmapColor,
      REGION_VISIT_HEATMAP_COLOR_THRESHOLDS
    ),
  };
  visitDataRef.current = visitData;

  const applyVisitedRegionStyles = (layer: RegionVectorGridLayer, zoom: number) => {
    if (!layer.setFeatureStyle || !layer.resetFeatureStyle) {
      return;
    }

    const nextVisitedIds = getVisitedRegionIds(visitDataRef.current);
    const previousVisitedIds = previousVisitedIdsRef.current;

    nextVisitedIds.forEach((regionId) => {
      const regionVisit = visitDataRef.current.get(regionId);

      if (!regionVisit) {
        return;
      }

      layer.setFeatureStyle?.(
        regionId,
        getRegionPathStyle(config, regionVisit, styleSettingsRef.current, zoom)
      );
    });

    previousVisitedIds.forEach((regionId) => {
      if (!nextVisitedIds.has(regionId)) {
        layer.resetFeatureStyle?.(regionId);
      }
    });

    previousVisitedIdsRef.current = nextVisitedIds;
  };

  const shouldHideCoveredTiles = (visibleZoom: number) =>
    visibleZoom < zoomStateRef.current.committedStyleZoom ||
    (zoomStateRef.current.pendingCommitZoom !== null &&
      zoomStateRef.current.pendingCommitZoom < zoomStateRef.current.committedStyleZoom);

  const applyLayerStyles = (layer: RegionVectorGridLayer, zoom: number) => {
    const visibleZoom = getVisibleStyleZoom(zoomStateRef.current, zoom);
    const baseStyle = getBaseRegionStyle(config, styleSettingsRef.current, visibleZoom);

    if (layer.options) {
      layer.options.vectorTileLayerStyles = {
        ...(layer.options.vectorTileLayerStyles ?? {}),
        [config.layerName]: () =>
          getBaseRegionStyle(
            config,
            styleSettingsRef.current,
            getVisibleStyleZoom(zoomStateRef.current, visibleZoom)
          ),
      };
    }

    syncRenderedRegionPanePaths(map, config.paneName, baseStyle);
    updateRenderedTileStyles(layer, config.layerName, baseStyle);
    applyVisitedRegionStyles(layer, visibleZoom);
    syncCoveredRegionTiles(layer, map, config.paneName, shouldHideCoveredTiles(visibleZoom));

    debugLog('applyLayerStyles', {
      zoom,
      visibleZoom,
      currentZoom: zoomStateRef.current.currentZoom,
      committedStyleZoom: zoomStateRef.current.committedStyleZoom,
      pendingCommitZoom: zoomStateRef.current.pendingCommitZoom,
      pendingTileZoom: zoomStateRef.current.pendingTileZoom,
      pendingTileReady: zoomStateRef.current.pendingTileReady,
      weight: baseStyle.weight,
      paneStrokeWidth:
        map
          ?.getPane?.(config.paneName)
          ?.querySelector?.('path')
          ?.getAttribute?.('stroke-width') ?? null,
    });
  };

  useEffect(() => {
    if (!showRegions) {
      previousVisitedIdsRef.current = new Set();
      clearRegionPaneOpacity(map, config.paneName);
      onTileError?.('');
      return;
    }

    if (!map) {
      return;
    }

    const zoomState = zoomStateRef.current;
    zoomState.currentZoom = map.getZoom();
    zoomState.committedStyleZoom = zoomState.currentZoom;
    zoomState.visibleStyleZoom = zoomState.currentZoom;
    clearPendingZoomState(zoomState);

    ensureMapPane(map, config.paneName, '430');
    syncRegionPaneOpacity(map, config.paneName, regionLayerTransparency);

    if (regionLayerRef.current && map.hasLayer(regionLayerRef.current)) {
      map.removeLayer(regionLayerRef.current);
      regionLayerRef.current = null;
    }

    const vectorGridFactory = (L as any).vectorGrid;
    if (!vectorGridFactory?.protobuf) {
      logger.error('Leaflet.VectorGrid plugin not available');
      clearRegionPaneOpacity(map, config.paneName);
      onTileError?.('Region overlay unavailable');
      return;
    }

    const handleTileLoad = () => {
      const nextZoomState = zoomStateRef.current;

      debugLog('regionLayer:load', {
        currentZoom: nextZoomState.currentZoom,
        committedStyleZoom: nextZoomState.committedStyleZoom,
        visibleStyleZoom: nextZoomState.visibleStyleZoom,
        pendingCommitZoom: nextZoomState.pendingCommitZoom,
        pendingTileZoom: nextZoomState.pendingTileZoom,
        pendingTileReady: nextZoomState.pendingTileReady,
      });

      if (!regionLayerRef.current) {
        markFirstRegionLayerAdded();
        onTileError?.('');
        return;
      }

      commitPendingZoom(nextZoomState);
      applyLayerStyles(
        regionLayerRef.current,
        getVisibleStyleZoom(nextZoomState, nextZoomState.currentZoom || config.detailCapZoom)
      );
      markFirstRegionLayerAdded();
      onTileError?.('');
    };

    const handlePerTileLoad = (event: RegionTileEvent) => {
      debugLog('regionLayer:tileload', {
        tileZoom: event.coords?.z,
        pendingTileZoom: zoomStateRef.current.pendingTileZoom,
        pendingCommitZoom: zoomStateRef.current.pendingCommitZoom,
      });
      markPendingTileReady(zoomStateRef.current, event.coords?.z);

      syncCoveredRegionTiles(
        regionLayerRef.current,
        map,
        config.paneName,
        shouldHideCoveredTiles(
          getVisibleStyleZoom(zoomStateRef.current, zoomStateRef.current.currentZoom || config.detailCapZoom)
        )
      );
    };

    const handleTileError = (event: unknown) => {
      logRegionTileError(event);
      onTileError?.('Region overlay unavailable');
    };

    const handleZoomEnd = () => {
      const nextZoomState = zoomStateRef.current;
      const nextZoom = map.getZoom();
      syncVisibleZoom(nextZoomState, nextZoom);
      preparePendingCommit(nextZoom, nextZoomState, config.detailCapZoom);

      debugLog('map:zoomend', {
        nextZoom,
        committedStyleZoom: nextZoomState.committedStyleZoom,
        visibleStyleZoom: nextZoomState.visibleStyleZoom,
        pendingCommitZoom: nextZoomState.pendingCommitZoom,
        pendingTileZoom: nextZoomState.pendingTileZoom,
        pendingTileReady: nextZoomState.pendingTileReady,
      });

      if (regionLayerRef.current) {
        applyLayerStyles(regionLayerRef.current, nextZoom);
      }
    };

    const handleZoom = () => {
      if (!regionLayerRef.current) {
        return;
      }

      const liveZoom = map.getZoom();
      syncVisibleZoom(zoomStateRef.current, liveZoom);
      debugLog('map:zoom', {
        liveZoom,
        committedStyleZoom: zoomStateRef.current.committedStyleZoom,
        visibleStyleZoom: zoomStateRef.current.visibleStyleZoom,
      });
      applyLayerStyles(regionLayerRef.current, liveZoom);
    };

    const handleZoomAnim = (event: RegionZoomAnimationEvent) => {
      if (!regionLayerRef.current || event.zoom === undefined) {
        return;
      }

      syncVisibleZoom(zoomStateRef.current, event.zoom);
      debugLog('map:zoomanim', {
        animatedZoom: event.zoom,
        committedStyleZoom: zoomStateRef.current.committedStyleZoom,
        visibleStyleZoom: zoomStateRef.current.visibleStyleZoom,
      });
      applyLayerStyles(regionLayerRef.current, event.zoom);
    };

    let layer: RegionVectorGridLayer | null = null;
    const initialZoom = zoomState.currentZoom || config.detailCapZoom;

    try {
      layer = vectorGridFactory.protobuf(config.sourceUrl, {
        interactive: false,
        pane: config.paneName,
        minZoom: config.minZoom,
        maxZoom: config.displayMaxZoom,
        maxNativeZoom: config.detailCapZoom,
        updateWhenZooming: true,
        keepBuffer: 4,
        rendererFactory: getRegionRendererFactory(),
        getFeatureId: getRegionFeatureId,
        vectorTileLayerStyles: {
          [config.layerName]: () =>
            getUnvisitedRegionStyle(
              config,
              styleSettingsRef.current.mode,
              styleSettingsRef.current.regionBorderThickness,
              config.style.opacity,
              styleSettingsRef.current.effectiveStaticColors,
              styleSettingsRef.current.effectiveHeatmapColors,
              zoomStateRef.current.visibleStyleZoom ||
                zoomStateRef.current.committedStyleZoom ||
                initialZoom
            ),
        },
      }) as RegionVectorGridLayer;

      const optimizedLayer = optimizeRegionVectorGridLayer(layer) as RegionVectorGridLayer;

      optimizedLayer.on('load', handleTileLoad);
      optimizedLayer.on('tileload', handlePerTileLoad);
      optimizedLayer.on('tileerror', handleTileError);
      optimizedLayer.addTo(map);
      regionLayerRef.current = optimizedLayer;
      map.on('zoom', handleZoom);
      map.on('zoomanim', handleZoomAnim);
      map.on('zoomend', handleZoomEnd);
    } catch (error) {
      layer?.off('load', handleTileLoad);
      layer?.off('tileload', handlePerTileLoad);
      layer?.off('tileerror', handleTileError);

      if (layer && map.hasLayer(layer)) {
        map.removeLayer(layer);
      }

      logger.error(`Failed to initialize region vector tile layer: ${error}`);
      clearRegionPaneOpacity(map, config.paneName);
      onTileError?.('Region overlay unavailable');
      return;
    }

    logger.info('Vector tile regions enabled');

    return () => {
      layer.off('load', handleTileLoad);
      layer.off('tileload', handlePerTileLoad);
      layer.off('tileerror', handleTileError);
      map.off('zoom', handleZoom);
      map.off('zoomanim', handleZoomAnim);
      map.off('zoomend', handleZoomEnd);

      if (map.hasLayer(layer)) {
        map.removeLayer(layer);
      }

      if (regionLayerRef.current === layer) {
        regionLayerRef.current = null;
      }

      zoomStateRef.current.visibleStyleZoom = 0;
      clearPendingZoomState(zoomStateRef.current);
      previousVisitedIdsRef.current = new Set();
      clearRegionPaneOpacity(map, config.paneName);
    };
  }, [map, showRegions, config, onTileError]);

  useEffect(() => {
    if (!showRegions) {
      previousVisitedIdsRef.current = new Set();
      clearRegionPaneOpacity(map, config.paneName);
      return;
    }

    if (map) {
      ensureMapPane(map, config.paneName, '430');
      syncRegionPaneOpacity(map, config.paneName, regionLayerTransparency);
    }

    if (!regionLayerRef.current) {
      return;
    }

    applyLayerStyles(
      regionLayerRef.current,
      getVisibleStyleZoom(zoomStateRef.current, config.detailCapZoom)
    );
  }, [
    config,
    heatmapColorSignature,
    map,
    mode,
    regionBorderThickness,
    regionLayerTransparency,
    showRegions,
    staticColorSignature,
    visitData,
  ]);
}
