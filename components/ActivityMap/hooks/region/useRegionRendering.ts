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
import { applyRegionLayerStyles, shouldHideCoveredRegionTiles } from '@/components/ActivityMap/hooks/region/utils/regionLayerStyleSync';
import {
  getBaseRegionStyle,
  getEffectiveColors,
  getRegionFeatureId,
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
  syncCoveredRegionTiles,
  syncRegionPaneOpacity,
} from '@/components/ActivityMap/hooks/region/utils/regionVectorGridHelpers';
import {
  createRegionVectorGridLayer,
  RegionTileEvent,
  RegionVectorGridLayer,
} from '@/components/ActivityMap/hooks/region/utils/regionVectorGridRuntime';
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

  const applyLayerStyles = (layer: RegionVectorGridLayer, zoom: number) => {
    previousVisitedIdsRef.current = applyRegionLayerStyles({
      config,
      layer,
      map,
      previousVisitedIds: previousVisitedIdsRef.current,
      styleSettings: styleSettingsRef.current,
      visitData: visitDataRef.current,
      zoom,
      zoomState: zoomStateRef.current,
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

    const createBaseStyle = () =>
      getBaseRegionStyle(
        config,
        styleSettingsRef.current,
        zoomStateRef.current.visibleStyleZoom ||
          zoomStateRef.current.committedStyleZoom ||
          zoomState.currentZoom ||
          config.detailCapZoom
      );

    const handleTileLoad = () => {
      const nextZoomState = zoomStateRef.current;

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
      markPendingTileReady(zoomStateRef.current, event.coords?.z);

      syncCoveredRegionTiles(
        regionLayerRef.current,
        map,
        config.paneName,
        shouldHideCoveredRegionTiles(zoomStateRef.current)
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
      applyLayerStyles(regionLayerRef.current, liveZoom);
    };

    const handleZoomAnim = (event: RegionZoomAnimationEvent) => {
      if (!regionLayerRef.current || event.zoom === undefined) {
        return;
      }

      syncVisibleZoom(zoomStateRef.current, event.zoom);
      applyLayerStyles(regionLayerRef.current, event.zoom);
    };

    let layer: RegionVectorGridLayer | null = null;

    try {
      layer = createRegionVectorGridLayer({
        config,
        getFeatureId: getRegionFeatureId,
        createBaseStyle,
      });

      if (!layer) {
        logger.error('Leaflet.VectorGrid plugin not available');
        clearRegionPaneOpacity(map, config.paneName);
        onTileError?.('Region overlay unavailable');
        return;
      }

      layer.on('load', handleTileLoad);
      layer.on('tileload', handlePerTileLoad);
      layer.on('tileerror', handleTileError);
      layer.addTo(map);
      regionLayerRef.current = layer;
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
