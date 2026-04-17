import L from 'leaflet';

import { RegionVisitData } from '@/lib/utils/regionVisitAnalyzer';

export type RegionVectorGridLayer = L.Layer & {
  setFeatureStyle?: (featureId: string | number, style: L.PathOptions) => void;
  resetFeatureStyle?: (featureId: string | number) => void;
  redraw?: () => void;
  _tileZoom?: number;
  _tiles?: Record<
    string,
    {
      el?: RegionTileElement;
      coords: {
        x: number;
        y: number;
        z: number;
      };
      current?: boolean;
      loaded?: number | boolean;
      active?: boolean;
    }
  >;
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

type RegionTileElement = SVGSVGElement | HTMLCanvasElement;

export type RegionTileEvent = {
  coords?: {
    z?: number;
  };
};

type RegionTileCoords = {
  x: number;
  y: number;
  z: number;
};

type RegionVectorTileFeature = {
  properties: Record<string, unknown>;
};

type RegionVectorTileLayerData = {
  extent: number;
  features: RegionVectorTileFeature[];
  length?: number;
  feature?: (index: number) => RegionVectorTileFeature & { loadGeometry: () => unknown };
};

type RegionVectorTilePayload = {
  layers: Record<string, RegionVectorTileLayerData>;
};

type RegionTileRenderer = {
  _features?: Record<string, { layerName?: string; feature: unknown }>;
  _addPath: (featureLayer: {
    render: (renderer: unknown, style: L.PathOptions) => void;
    makeInteractive?: () => void;
    addEventParent?: (parent: unknown) => void;
  }) => void;
  addTo: (map: unknown) => void;
  getContainer: () => RegionTileElement;
};

type RegionVectorGridOptimizableLayer = RegionVectorGridLayer & {
  _url?: string;
  _map?: L.Map | null;
  _globalTileRange?: {
    max: {
      y: number;
    };
  };
  _dataLayerNames?: Record<string, boolean>;
  _overriddenStyles?: Record<string, unknown>;
  _getSubdomain?: (coords: RegionTileCoords) => string;
  _getVectorTilePromise?: (coords: RegionTileCoords) => Promise<RegionVectorTilePayload>;
  _createLayer?: (feature: RegionVectorTileFeature, pxPerExtent: L.Point) => {
    render: (renderer: unknown, style: L.PathOptions) => void;
    makeInteractive?: () => void;
    addEventParent?: (parent: unknown) => void;
  };
  getTileSize?: () => L.Point;
  createTile?: (
    coords: RegionTileCoords,
    done: (error: unknown, tile: unknown) => void
  ) => RegionTileElement;
  options?: RegionVectorGridLayer['options'] & {
    fetchOptions?: RequestInit;
    subdomains?: string;
    tms?: boolean;
    rendererFactory?: (
      coords: RegionTileCoords,
      tileSize: L.Point,
      options?: RegionVectorGridOptimizableLayer['options']
    ) => RegionTileRenderer;
    getFeatureId?: (feature: RegionVectorTileFeature) => string | number;
    interactive?: boolean;
  };
  __rrOptimized?: boolean;
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

export function syncRenderedRegionPanePaths(
  map: L.Map | null,
  paneName: string,
  baseStyle: L.PathOptions
): void {
  const pane = map?.getPane?.(paneName);

  if (!pane || typeof pane.querySelectorAll !== 'function') {
    return;
  }

  pane.querySelectorAll<SVGPathElement>('path').forEach((path) => {
    if (baseStyle.color !== undefined) {
      path.setAttribute('stroke', String(baseStyle.color));
    }

    if (baseStyle.opacity !== undefined) {
      path.setAttribute('stroke-opacity', String(baseStyle.opacity));
    }

    if (baseStyle.weight !== undefined) {
      path.setAttribute('stroke-width', String(baseStyle.weight));
    }

    if (baseStyle.fill !== undefined) {
      path.setAttribute('fill', baseStyle.fill ? String(baseStyle.fillColor ?? 'none') : 'none');
    }

    if (baseStyle.fillColor !== undefined && baseStyle.fill !== false) {
      path.setAttribute('fill', String(baseStyle.fillColor));
    }

    if (baseStyle.fillOpacity !== undefined) {
      path.setAttribute('fill-opacity', String(baseStyle.fillOpacity));
    }
  });
}

function resetTileVisibility(pane: HTMLElement): void {
  pane
    .querySelectorAll<RegionTileElement>('.leaflet-tile-container > svg, .leaflet-tile-container > canvas')
    .forEach((tile) => {
      tile.style.visibility = '';
    });
}

function isTileElementVisible(tile: RegionTileElement | undefined): tile is RegionTileElement {
  if (!tile) {
    return false;
  }

  const bounds = tile.getBoundingClientRect();
  return bounds.width > 0 && bounds.height > 0;
}

function doesParentTileCoverChildTile(
  parentCoords: { x: number; y: number; z: number },
  childCoords: { x: number; y: number; z: number }
): boolean {
  if (parentCoords.z > childCoords.z) {
    return false;
  }

  if (parentCoords.z === childCoords.z) {
    return parentCoords.x === childCoords.x && parentCoords.y === childCoords.y;
  }

  const scale = 2 ** (childCoords.z - parentCoords.z);

  return (
    childCoords.x >= parentCoords.x * scale &&
    childCoords.x < (parentCoords.x + 1) * scale &&
    childCoords.y >= parentCoords.y * scale &&
    childCoords.y < (parentCoords.y + 1) * scale
  );
}

export function syncCoveredRegionTiles(
  layer: RegionVectorGridLayer | null,
  map: L.Map | null,
  paneName: string,
  shouldHideCoveredTiles: boolean
): void {
  const pane = map?.getPane?.(paneName);

  if (!pane || typeof pane.querySelectorAll !== 'function') {
    return;
  }

  resetTileVisibility(pane);

  if (!shouldHideCoveredTiles) {
    return;
  }

  const activeTileZoom = layer?._tileZoom;
  const tiles = Object.values(layer?._tiles ?? {});

  if (activeTileZoom === undefined || tiles.length === 0) {
    return;
  }

  const freshTiles = tiles.filter(
    (tile) =>
      tile.coords.z === activeTileZoom &&
      tile.current &&
      tile.active &&
      isTileElementVisible(tile.el)
  );

  if (freshTiles.length === 0) {
    return;
  }

  tiles.forEach((tile) => {
    if (!tile.el || tile.current || tile.coords.z <= activeTileZoom || !tile.loaded) {
      return;
    }

    const coveredByFreshTile = freshTiles.some((freshTile) =>
      doesParentTileCoverChildTile(freshTile.coords, tile.coords)
    );

    if (coveredByFreshTile) {
      tile.el.style.visibility = 'hidden';
    }
  });
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

function normalizeFetchedVectorTile(vectorTile: RegionVectorTilePayload): RegionVectorTilePayload {
  for (const layerName in vectorTile.layers) {
    const layer = vectorTile.layers[layerName];
    const features: RegionVectorTileFeature[] = [];

    for (let index = 0; index < (layer.length ?? 0); index += 1) {
      const feature = layer.feature?.(index);
      if (!feature) {
        continue;
      }

      (feature as unknown as RegionVectorTileFeature & { geometry: unknown }).geometry =
        feature.loadGeometry();
      features.push(feature);
    }

    layer.features = features;
  }

  return vectorTile;
}

function fastFetchVectorTile(
  layer: RegionVectorGridOptimizableLayer,
  coords: RegionTileCoords
): Promise<RegionVectorTilePayload> {
  const data: Record<string, number | string> = {
    s: layer._getSubdomain?.(coords) ?? '',
    x: coords.x,
    y: coords.y,
    z: coords.z,
  };

  if (layer._map?.options.crs && !layer._map.options.crs.infinite && layer._globalTileRange) {
    const invertedY = layer._globalTileRange.max.y - coords.y;
    if (layer.options?.tms) {
      data.y = invertedY;
    }
    data['-y'] = invertedY;
  }

  const tileUrl = L.Util.template(layer._url ?? '', L.extend(data, layer.options));
  const Pbf = require('pbf');
  const { VectorTile } = require('vector-tile');

  return fetch(tileUrl, layer.options?.fetchOptions)
    .then((response) => {
      if (!response.ok) {
        return { layers: {} } as RegionVectorTilePayload;
      }

      return response.arrayBuffer().then((buffer) => new VectorTile(new Pbf(buffer)));
    })
    .then(normalizeFetchedVectorTile);
}

function renderVectorTileIntoRenderer(
  layer: RegionVectorGridOptimizableLayer,
  renderer: RegionTileRenderer,
  vectorTile: RegionVectorTilePayload,
  coords: RegionTileCoords
): void {
  const storeFeatures = layer.options?.getFeatureId;

  for (const layerName in vectorTile.layers) {
    layer._dataLayerNames = {
      ...(layer._dataLayerNames ?? {}),
      [layerName]: true,
    };

    const tileLayer = vectorTile.layers[layerName];
    const pxPerExtent = layer.getTileSize?.().divideBy(tileLayer.extent) ?? L.point(1, 1);
    const rawLayerStyle =
      layer.options?.vectorTileLayerStyles?.[layerName] ?? L.Path.prototype.options;

    tileLayer.features.forEach((feature) => {
      let featureStyle = rawLayerStyle;
      let featureId: string | number | undefined;

      if (storeFeatures) {
        featureId = layer.options?.getFeatureId?.(feature);
        const overriddenStyle =
          featureId !== undefined ? layer._overriddenStyles?.[String(featureId)] : undefined;
        if (overriddenStyle) {
          featureStyle =
            (overriddenStyle as Record<string, unknown>)[layerName] ?? overriddenStyle;
        }
      }

      if (featureStyle instanceof Function) {
        featureStyle = featureStyle(feature.properties, coords.z);
      }

      const styleOptions = Array.isArray(featureStyle) ? featureStyle : [featureStyle];
      if (styleOptions.length === 0) {
        return;
      }

      const featureLayer = layer._createLayer?.(feature, pxPerExtent);
      if (!featureLayer) {
        return;
      }

      styleOptions.forEach((styleOption) => {
        const style = L.extend({}, L.Path.prototype.options, styleOption);
        featureLayer.render(renderer, style);
        renderer._addPath(featureLayer);
      });

      if (layer.options?.interactive) {
        featureLayer.makeInteractive?.();
      }

      if (storeFeatures && featureId !== undefined) {
        renderer._features = {
          ...(renderer._features ?? {}),
          [String(featureId)]: {
            layerName,
            feature: featureLayer,
          },
        };
      }
    });
  }

  if (layer._map != null) {
    renderer.addTo(layer._map);
  }
}

export function optimizeRegionVectorGridLayer(
  layer: RegionVectorGridLayer | null
): RegionVectorGridLayer | null {
  const optimizableLayer = layer as RegionVectorGridOptimizableLayer | null;

  if (
    !optimizableLayer ||
    optimizableLayer.__rrOptimized ||
    typeof optimizableLayer._getVectorTilePromise !== 'function' ||
    typeof optimizableLayer.createTile !== 'function' ||
    typeof optimizableLayer.getTileSize !== 'function' ||
    typeof optimizableLayer._createLayer !== 'function' ||
    typeof optimizableLayer.options?.rendererFactory !== 'function' ||
    typeof optimizableLayer._url !== 'string'
  ) {
    return layer;
  }

  const originalGetVectorTilePromise = optimizableLayer._getVectorTilePromise.bind(optimizableLayer);
  const originalCreateTile = optimizableLayer.createTile.bind(optimizableLayer);
  optimizableLayer._getVectorTilePromise = (coords: RegionTileCoords) =>
    fastFetchVectorTile(optimizableLayer, coords).catch(() => originalGetVectorTilePromise(coords));

  optimizableLayer.createTile = function createTile(
    coords: RegionTileCoords,
    done: (error: unknown, tile: unknown) => void
  ) {
    const storeFeatures = this.options?.getFeatureId;
    const tileSize = this.getTileSize?.() ?? L.point(256, 256);
    const renderer = this.options?.rendererFactory?.(coords, tileSize, this.options);

    if (!renderer) {
      return originalCreateTile(coords, done) as RegionTileElement;
    }

    if (storeFeatures) {
      this._vectorTiles = {
        ...(this._vectorTiles ?? {}),
        [`${coords.x}:${coords.y}:${coords.z}`]: renderer,
      };
      renderer._features = {};
    }

    this._getVectorTilePromise?.(coords)
      .then((vectorTile) => {
        renderVectorTileIntoRenderer(this, renderer, vectorTile, coords);
        done(null, null);
      })
      .catch((error) => {
        done(error, null);
      });

    return renderer.getContainer();
  };

  optimizableLayer.__rrOptimized = true;
  return optimizableLayer;
}
