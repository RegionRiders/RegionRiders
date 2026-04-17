import L from 'leaflet';
import {
  createRegionVectorGridLayer,
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
      getTileSize: jest.fn(() => L.point(256, 256)),
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
            features: [
              { properties: { id: 'region-1' } },
              { properties: { id: 'region-1' } },
            ],
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
