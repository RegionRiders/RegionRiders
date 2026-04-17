import L from 'leaflet';

import {
  getBaseRegionStyle,
  getRegionPathStyle,
  RegionStyleSettings,
  RegionTileConfig,
} from '@/components/ActivityMap/hooks/region/utils/regionStyleHelpers';
import { getVisibleStyleZoom, RegionZoomState } from '@/components/ActivityMap/hooks/region/utils/regionZoomState';
import {
  syncCoveredRegionTiles,
  syncRenderedRegionPanePaths,
  updateRenderedTileStyles,
} from '@/components/ActivityMap/hooks/region/utils/regionVectorGridHelpers';
import { RegionVectorGridLayer } from '@/components/ActivityMap/hooks/region/utils/regionVectorGridRuntime';
import { RegionVisitData } from '@/lib/utils/regionVisitAnalyzer';

function getVisitedRegionIds(visitData: Map<string, RegionVisitData>): Set<string> {
  return new Set(
    Array.from(visitData.entries())
      .filter(([, data]) => data.visited || data.visitCount > 0)
      .map(([regionId]) => regionId)
  );
}

function applyVisitedRegionStyles(
  layer: RegionVectorGridLayer,
  config: RegionTileConfig,
  styleSettings: RegionStyleSettings,
  visitData: Map<string, RegionVisitData>,
  previousVisitedIds: Set<string>,
  zoom: number
): Set<string> {
  if (!layer.setFeatureStyle || !layer.resetFeatureStyle) {
    return previousVisitedIds;
  }

  const nextVisitedIds = getVisitedRegionIds(visitData);

  nextVisitedIds.forEach((regionId) => {
    const regionVisit = visitData.get(regionId);

    if (!regionVisit) {
      return;
    }

    layer.setFeatureStyle?.(regionId, getRegionPathStyle(config, regionVisit, styleSettings, zoom));
  });

  previousVisitedIds.forEach((regionId) => {
    if (!nextVisitedIds.has(regionId)) {
      layer.resetFeatureStyle?.(regionId);
    }
  });

  return nextVisitedIds;
}

export function shouldHideCoveredRegionTiles(zoomState: RegionZoomState): boolean {
  return (
    zoomState.currentZoom < zoomState.committedStyleZoom ||
    (zoomState.pendingCommitZoom !== null &&
      zoomState.pendingCommitZoom < zoomState.committedStyleZoom)
  );
}

type ApplyRegionLayerStylesArgs = {
  config: RegionTileConfig;
  layer: RegionVectorGridLayer;
  map: L.Map | null;
  previousVisitedIds: Set<string>;
  styleSettings: RegionStyleSettings;
  visitData: Map<string, RegionVisitData>;
  zoom: number;
  zoomState: RegionZoomState;
};

export function applyRegionLayerStyles({
  config,
  layer,
  map,
  previousVisitedIds,
  styleSettings,
  visitData,
  zoom,
  zoomState,
}: ApplyRegionLayerStylesArgs): Set<string> {
  const visibleZoom = getVisibleStyleZoom(zoomState, zoom);
  const baseStyle = getBaseRegionStyle(config, styleSettings, visibleZoom);

  if (layer.options) {
    layer.options.vectorTileLayerStyles = {
      ...(layer.options.vectorTileLayerStyles ?? {}),
      [config.layerName]: () => getBaseRegionStyle(config, styleSettings, visibleZoom),
    };
  }

  syncRenderedRegionPanePaths(map, config.paneName, baseStyle);
  updateRenderedTileStyles(layer, config.layerName, baseStyle);
  syncCoveredRegionTiles(layer, map, config.paneName, shouldHideCoveredRegionTiles(zoomState));

  return applyVisitedRegionStyles(
    layer,
    config,
    styleSettings,
    visitData,
    previousVisitedIds,
    visibleZoom
  );
}
