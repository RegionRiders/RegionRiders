import L from 'leaflet';

import { RegionVisitData } from '@/lib/utils/regionVisitAnalyzer';

export type RegionVectorGridLayer = L.Layer & {
  setFeatureStyle?: (featureId: string | number, style: L.PathOptions) => void;
  resetFeatureStyle?: (featureId: string | number) => void;
  redraw?: () => void;
  _updateStyles?: (feature: unknown, renderer: unknown, style: L.PathOptions) => void;
  _vectorTiles?: Record<
    string,
    {
      _features?: Record<
        string,
        | {
            layerName?: string;
            feature: unknown;
          }
        | Array<{
            layerName?: string;
            feature: unknown;
          }>
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

export type RegionTileEvent = {
  coords?: {
    z?: number;
  };
};

export function getVisitedRegionIds(
  visitData: Map<string, RegionVisitData>
): Set<string> {
  return new Set(
    Array.from(visitData.entries())
      .filter(([, data]) => data.visited || data.visitCount > 0)
      .map(([regionId]) => regionId)
  );
}

export function syncRegionPaneOpacity(
  map: L.Map,
  paneName: string,
  regionLayerTransparency: number
): void {
  const pane = map.getPane?.(paneName);

  if (pane) {
    const opacity = Number.isFinite(regionLayerTransparency)
      ? Math.min(Math.max(regionLayerTransparency, 0), 1)
      : 1;
    pane.style.opacity = String(opacity);
  }
}

export function clearRegionPaneOpacity(map: L.Map | null, paneName: string): void {
  const pane = map?.getPane?.(paneName);

  if (pane) {
    pane.style.opacity = '';
  }
}

export function updateRenderedTileStyles(
  layer: RegionVectorGridLayer,
  layerName: string,
  baseStyle: L.PathOptions
): void {
  const renderedTiles = layer._vectorTiles;
  const updateStyles = layer._updateStyles;

  if (!renderedTiles || !updateStyles) {
    layer.redraw?.();
    return;
  }

  Object.values(renderedTiles).forEach((tile) => {
    Object.values(tile._features ?? {}).forEach((bucket) => {
      const entries = Array.isArray(bucket) ? bucket : [bucket];

      entries.forEach((entry) => {
        if (entry.layerName !== layerName) {
          return;
        }

        updateStyles(entry.feature, tile, baseStyle);
      });
    });
  });
}
