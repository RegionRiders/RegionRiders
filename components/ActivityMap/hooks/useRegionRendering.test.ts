import { renderHook } from '@testing-library/react';
import L from 'leaflet';
import {
  getRegionFeatureId,
  getUnvisitedRegionStyle,
  getVisitedRegionStyle,
  useRegionRendering,
} from './useRegionRendering';

const testPolygon = {
  type: 'Polygon' as const,
  coordinates: [
    [
      [18.0, 54.0],
      [18.1, 54.0],
      [18.1, 54.1],
      [18.0, 54.1],
      [18.0, 54.0],
    ],
  ],
};

jest.mock('leaflet.vectorgrid', () => ({}));

jest.mock('@/lib/services/maps/selectRenderProfile', () => ({
  selectRegionRenderProfile: jest.fn(() => 'mobile'),
}));

jest.mock('@/components/ActivityMap/config/regionTileProfiles', () => ({
  getRegionTileProfileConfig: jest.fn(() => ({
    sourceUrl: 'http://localhost:3000/api/regions/tiles/v1/{z}/{x}/{y}.pbf',
    layerName: 'regions',
    paneName: 'regionsPane',
    minZoom: 4,
    maxZoom: 12,
    style: {
      color: '#c51b1f',
      weight: 1,
      fillColor: '#c51b1f',
      fillOpacity: 0.08,
      opacity: 0.9,
    },
  })),
}));

describe('useRegionRendering', () => {
  const addTo = jest.fn();
  const on = jest.fn();
  const off = jest.fn();
  const setFeatureStyle = jest.fn();
  const resetFeatureStyle = jest.fn();
  let visitData = new Map<string, any>();
  const onTileError = jest.fn();

  const mockLayer: any = {
    addTo,
    on,
    off,
    setFeatureStyle,
    resetFeatureStyle,
  };

  const mockMap = {
    hasLayer: jest.fn(() => false),
    removeLayer: jest.fn(),
    getPane: jest.fn(() => null),
    createPane: jest.fn(() => ({ style: { zIndex: '' } })),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    visitData = new Map();
    (L as any).vectorGrid = {
      protobuf: jest.fn(() => mockLayer),
    };
  });

  it('does nothing when map is null', () => {
    renderHook(() => useRegionRendering(null, true, visitData, onTileError));

    expect((L as any).vectorGrid.protobuf).not.toHaveBeenCalled();
  });

  it('does not render layer when borders are hidden', () => {
    renderHook(() => useRegionRendering(mockMap, false, visitData, onTileError));

    expect((L as any).vectorGrid.protobuf).not.toHaveBeenCalled();
  });

  it('creates vector tile layer and adds it to map', () => {
    renderHook(() => useRegionRendering(mockMap, true, visitData, onTileError));

    expect((L as any).vectorGrid.protobuf).toHaveBeenCalledTimes(1);
    expect((L as any).vectorGrid.protobuf).toHaveBeenCalledWith(
      'http://localhost:3000/api/regions/tiles/v1/{z}/{x}/{y}.pbf',
      expect.objectContaining({
        getFeatureId: getRegionFeatureId,
        vectorTileLayerStyles: {
          regions: getUnvisitedRegionStyle({
            sourceUrl: 'http://localhost:3000/api/regions/tiles/v1/{z}/{x}/{y}.pbf',
            layerName: 'regions',
            paneName: 'regionsPane',
            minZoom: 4,
            maxZoom: 12,
            style: {
              color: '#c51b1f',
              weight: 1,
              fillColor: '#c51b1f',
              fillOpacity: 0.08,
              opacity: 0.9,
            },
          }),
        },
      })
    );
    expect(addTo).toHaveBeenCalledWith(mockMap);
    expect(on).toHaveBeenCalledWith('load', expect.any(Function));
    expect(on).toHaveBeenCalledWith('tileerror', expect.any(Function));
  });

  it('applies visited style overrides for visited regions', () => {
    visitData = new Map([
      [
        'RR1::PL::POM::001',
        {
          regionId: 'RR1::PL::POM::001',
          regionName: 'Test Region',
          visitCount: 2,
          visited: true,
          trackIds: ['track-1'],
          geometry: testPolygon,
        },
      ],
    ]);

    renderHook(() => useRegionRendering(mockMap, true, visitData, onTileError));

    expect(setFeatureStyle).toHaveBeenCalledWith(
      'RR1::PL::POM::001',
      getVisitedRegionStyle({
        sourceUrl: 'http://localhost:3000/api/regions/tiles/v1/{z}/{x}/{y}.pbf',
        layerName: 'regions',
        paneName: 'regionsPane',
        minZoom: 4,
        maxZoom: 12,
        style: {
          color: '#c51b1f',
          weight: 1,
          fillColor: '#c51b1f',
          fillOpacity: 0.08,
          opacity: 0.9,
        },
      })
    );
  });

  it('resets style when a previously visited region is no longer visited', () => {
    const initialVisitData = new Map([
      [
        'RR1::PL::POM::001',
        {
          regionId: 'RR1::PL::POM::001',
          regionName: 'Test Region',
          visitCount: 1,
          visited: true,
          trackIds: ['track-1'],
          geometry: testPolygon,
        },
      ],
    ]);

    const { rerender } = renderHook(
      ({ currentVisitData }) => useRegionRendering(mockMap, true, currentVisitData),
      {
        initialProps: { currentVisitData: initialVisitData },
      }
    );

    rerender({ currentVisitData: new Map() });

    expect(resetFeatureStyle).toHaveBeenCalledWith('RR1::PL::POM::001');
  });

  it('cleans up tile listeners and map layer on unmount', () => {
    mockMap.hasLayer.mockReturnValue(true);

    const { unmount } = renderHook(() => useRegionRendering(mockMap, true, visitData, onTileError));

    unmount();

    expect(off).toHaveBeenCalledWith('load', expect.any(Function));
    expect(off).toHaveBeenCalledWith('tileerror', expect.any(Function));
    expect(mockMap.removeLayer).toHaveBeenCalledWith(mockLayer);
  });

  it('prefers feature.properties.region_id for VectorGrid identity', () => {
    expect(
      getRegionFeatureId({ properties: { region_id: 'RR1::PL::POM::001' }, id: 'fallback-id' })
    ).toBe('RR1::PL::POM::001');
  });

  it('falls back to feature id when region_id is missing', () => {
    expect(getRegionFeatureId({ properties: {}, id: 1234 })).toBe('1234');
  });

  it('reports a tile error through the callback', () => {
    mockMap.hasLayer.mockReturnValue(true);

    renderHook(() => useRegionRendering(mockMap, true, visitData, onTileError));

    const tileErrorHandler = on.mock.calls.find(([eventName]) => eventName === 'tileerror')?.[1];

    expect(tileErrorHandler).toBeDefined();

    tileErrorHandler?.({ message: 'boom' });

    expect(onTileError).toHaveBeenCalledWith('Region overlay unavailable');
    expect(mockMap.removeLayer).not.toHaveBeenCalled();
  });

  it('clears a prior tile error once the layer loads successfully', () => {
    renderHook(() => useRegionRendering(mockMap, true, visitData, onTileError));

    const loadHandler = on.mock.calls.find(([eventName]) => eventName === 'load')?.[1];

    expect(loadHandler).toBeDefined();

    loadHandler?.();

    expect(onTileError).toHaveBeenCalledWith('');
  });

  it('resets tracked visited ids when borders are toggled off', () => {
    const initialVisitData = new Map([
      [
        'RR1::PL::POM::001',
        {
          regionId: 'RR1::PL::POM::001',
          regionName: 'Test Region',
          visitCount: 1,
          visited: true,
          trackIds: ['track-1'],
          geometry: testPolygon,
        },
      ],
    ]);

    const { rerender } = renderHook(
      ({ showBorders, currentVisitData }) =>
        useRegionRendering(mockMap, showBorders, currentVisitData, onTileError),
      {
        initialProps: { showBorders: true, currentVisitData: initialVisitData },
      }
    );

    setFeatureStyle.mockClear();

    rerender({ showBorders: false, currentVisitData: initialVisitData });
    rerender({ showBorders: true, currentVisitData: initialVisitData });

    expect(setFeatureStyle).toHaveBeenCalledWith(
      'RR1::PL::POM::001',
      expect.objectContaining({ fillColor: '#dc1414' })
    );
  });
});
