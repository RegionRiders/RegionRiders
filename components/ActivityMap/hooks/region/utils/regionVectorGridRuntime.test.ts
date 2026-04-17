import L from 'leaflet';
import {
  createRegionVectorGridLayer,
  optimizeRegionVectorGridLayer,
  renderVectorTileIntoRenderer,
} from './regionVectorGridRuntime';

jest.mock('leaflet.vectorgrid', () => ({}));

const mockRegionTileConfig = {
  sourceUrl: 'http://localhost:3000/api/regions/tiles/v1/{z}/{x}/{y}.pbf',
  layerName: 'regions',
  paneName: 'regionsPane',
  minZoom: 4,
  detailCapZoom: 12,
  displayMaxZoom: 18,
  strokeFadeStartZoom: 7,
  strokeHideBelowZoom: 5,
  minimumLowDetailFillOpacity: 0.14,
  style: {
    color: '#0A7E43',
    weight: 1,
    fillColor: '#0A7E43',
    fillOpacity: 0.08,
    opacity: 0.9,
  },
} as const;

describe('createRegionVectorGridLayer', () => {
  const mockLayer = {
    on: jest.fn(),
    off: jest.fn(),
    addTo: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (L as any).vectorGrid = {
      protobuf: jest.fn(() => mockLayer),
    };
    (L as any).canvas = {
      tile: jest.fn(() => 'canvas-renderer'),
    };
    (L as any).svg = {
      tile: jest.fn(() => 'svg-renderer'),
    };
  });

  it('builds the region layer with the expected VectorGrid defaults', () => {
    const layer = createRegionVectorGridLayer({
      config: mockRegionTileConfig,
      getFeatureId: () => 'region-id',
      createBaseStyle: () => ({ weight: 2, color: '#0A7E43' }),
    });

    expect(layer).toBe(mockLayer);
    expect((L as any).vectorGrid.protobuf).toHaveBeenCalledWith(
      mockRegionTileConfig.sourceUrl,
      expect.objectContaining({
        getFeatureId: expect.any(Function),
        maxZoom: 18,
        maxNativeZoom: 12,
        updateWhenZooming: true,
        keepBuffer: 4,
        rendererFactory: (L as any).canvas.tile,
        vectorTileLayerStyles: {
          regions: expect.any(Function),
        },
      })
    );
  });

  it('returns null when the VectorGrid plugin is unavailable', () => {
    delete (L as any).vectorGrid;

    expect(
      createRegionVectorGridLayer({
        config: mockRegionTileConfig,
        getFeatureId: () => 'region-id',
        createBaseStyle: () => ({ weight: 2 }),
      })
    ).toBeNull();
  });
});

describe('renderVectorTileIntoRenderer', () => {
  it('stores every rendered fragment under the same feature id bucket', () => {
    const tileSize = {
      divideBy: jest.fn(() => new L.Point(1, 1)),
    } as unknown as L.Point;
    const firstFeatureLayer = {
      render: jest.fn(),
    };
    const secondFeatureLayer = {
      render: jest.fn(),
    };
    const createLayer = jest
      .fn()
      .mockReturnValueOnce(firstFeatureLayer)
      .mockReturnValueOnce(secondFeatureLayer);
    const renderer: any = {
      _addPath: jest.fn(),
      addTo: jest.fn(),
      getContainer: jest.fn(() => document.createElement('canvas')),
    };
    const layer = {
      _createLayer: createLayer,
      _map: null,
      getTileSize: () => tileSize,
      options: {
        getFeatureId: (feature: { properties: { id: string } }) => feature.properties.id,
        vectorTileLayerStyles: {
          regions: () => ({ weight: 2, color: '#0A7E43' }),
        },
      },
    } as any;

    renderVectorTileIntoRenderer(
      layer,
      renderer,
      {
        layers: {
          regions: {
            extent: 4096,
            features: [{ properties: { id: 'region-1' } }, { properties: { id: 'region-1' } }],
          },
        },
      } as any,
      { x: 1, y: 2, z: 8 }
    );

    expect(renderer._features).toEqual({
      'region-1': [
        {
          layerName: 'regions',
          feature: firstFeatureLayer,
        },
        {
          layerName: 'regions',
          feature: secondFeatureLayer,
        },
      ],
    });
    expect(renderer._addPath).toHaveBeenCalledTimes(2);
  });
});

describe('optimizeRegionVectorGridLayer', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('propagates non-OK tile responses instead of falling back to an empty tile', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
    }) as any;

    const originalGetVectorTilePromise = jest.fn().mockResolvedValue({ layers: {} });
    const renderer = {
      _addPath: jest.fn(),
      addTo: jest.fn(),
      getContainer: jest.fn(() => document.createElement('canvas')),
    };
    const layer = optimizeRegionVectorGridLayer({
      __rrOptimized: false,
      _url: 'https://tiles.example.com/{z}/{x}/{y}.pbf',
      _map: {
        options: {
          crs: {
            infinite: true,
          },
        },
      },
      _getSubdomain: jest.fn(() => 'a'),
      _getVectorTilePromise: originalGetVectorTilePromise,
      _createLayer: jest.fn(),
      getTileSize: jest.fn(() => new L.Point(256, 256)),
      createTile: jest.fn(),
      options: {
        rendererFactory: jest.fn(() => renderer),
      },
    } as any) as any;

    const done = jest.fn();
    layer?.createTile?.({ x: 1, y: 2, z: 3 } as any, done);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(originalGetVectorTilePromise).not.toHaveBeenCalled();
    expect(done).toHaveBeenCalledTimes(1);
    expect(done.mock.calls[0]?.[0]).toBeInstanceOf(Error);
    expect(String(done.mock.calls[0]?.[0])).toContain('HTTP 503');
  });
});
