import L from 'leaflet';

import { RegionTileProfileConfig } from '@/components/ActivityMap/config/regionTileProfiles';
import { RegionTileFeature } from '@/components/ActivityMap/hooks/region/utils/regionStyleHelpers';

type RegionTileProperties = Record<string, unknown>;
export type RegionTileElement = SVGSVGElement | HTMLCanvasElement;

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

type RegionVectorTileFeature = RegionTileFeature & {
  properties: RegionTileProperties;
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

type RegionRendererFactory = (
  coords: RegionTileCoords,
  tileSize: L.Point,
  options?: RegionVectorGridOptimizableLayer['options']
) => RegionTileRenderer;

type RegionVectorGridFactory = {
  protobuf: (
    sourceUrl: string,
    options: RegionVectorGridOptimizableLayer['options'] & {
      pane: string;
      minZoom: number;
      maxZoom: number;
      maxNativeZoom: number;
      interactive: boolean;
      keepBuffer: number;
      updateWhenZooming: boolean;
      getFeatureId: (feature: RegionTileFeature) => string | number;
      vectorTileLayerStyles: Record<
        string,
        L.PathOptions | ((properties?: RegionTileProperties, tileZoom?: number) => L.PathOptions)
      >;
    }
  ) => RegionVectorGridLayer;
};

type LeafletWithVectorGrid = typeof L & {
  vectorGrid?: RegionVectorGridFactory;
  canvas?: {
    tile?: RegionRendererFactory;
  };
  svg?: {
    tile?: RegionRendererFactory;
  };
};

export type RegionVectorGridLayer = L.Layer & {
  setFeatureStyle?: (featureId: string | number, style: L.PathOptions) => void;
  resetFeatureStyle?: (featureId: string | number) => void;
  redraw?: () => void;
  _tileZoom?: number;
  _tiles?: Record<
    string,
    {
      el?: RegionTileElement;
      coords: RegionTileCoords;
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
      L.PathOptions | ((properties?: RegionTileProperties, tileZoom?: number) => L.PathOptions)
    >;
  };
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
    rendererFactory?: RegionRendererFactory;
    getFeatureId?: (feature: RegionVectorTileFeature) => string | number;
    interactive?: boolean;
  };
  __rrOptimized?: boolean;
};

type CreateRegionVectorGridLayerArgs = {
  config: RegionTileProfileConfig;
  getFeatureId: (feature: RegionTileFeature) => string | number;
  createBaseStyle: () => L.PathOptions;
};

function getLeafletRuntime(): LeafletWithVectorGrid {
  return L as LeafletWithVectorGrid;
}

function getRegionRendererFactory(
  leafletRuntime: LeafletWithVectorGrid
): RegionRendererFactory | undefined {
  return leafletRuntime.canvas?.tile ?? leafletRuntime.svg?.tile;
}

export function createRegionVectorGridLayer({
  config,
  getFeatureId,
  createBaseStyle,
}: CreateRegionVectorGridLayerArgs): RegionVectorGridLayer | null {
  const leafletRuntime = getLeafletRuntime();
  const vectorGridFactory = leafletRuntime.vectorGrid;

  if (!vectorGridFactory?.protobuf) {
    return null;
  }

  const layer = vectorGridFactory.protobuf(config.sourceUrl, {
    interactive: false,
    pane: config.paneName,
    minZoom: config.minZoom,
    maxZoom: config.displayMaxZoom,
    maxNativeZoom: config.detailCapZoom,
    updateWhenZooming: true,
    keepBuffer: 4,
    rendererFactory: getRegionRendererFactory(leafletRuntime),
    getFeatureId,
    vectorTileLayerStyles: {
      [config.layerName]: () => createBaseStyle(),
    },
  });

  return optimizeRegionVectorGridLayer(layer);
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

      (
        feature as unknown as RegionVectorTileFeature & {
          geometry: unknown;
        }
      ).geometry = feature.loadGeometry();
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
  // These packages do not ship repo-local TS declarations; keep them scoped to the runtime seam.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Pbf = require('pbf');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
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
