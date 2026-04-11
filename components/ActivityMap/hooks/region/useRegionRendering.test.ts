import { renderHook } from '@testing-library/react';
import L from 'leaflet';
import {
  getRegionFeatureId,
  getUnvisitedRegionStyle,
  getVisitedRegionStyle,
  useRegionRendering,
} from './useRegionRendering';

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
      color: '#0A7E43',
      weight: 1,
      fillColor: '#0A7E43',
      fillOpacity: 0.08,
      opacity: 0.9,
    },
  })),
}));

describe('useRegionRendering', () => {
  const visitedRegion = {
    regionId: 'RR1::PL::POM::001',
    regionName: 'Test Region',
    visitCount: 1,
    visited: true,
    trackIds: ['track-1'],
    geometry: {
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
    },
  };

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
    renderHook(() =>
      useRegionRendering(null, visitData, true, 'static', 2, 1, [], [], onTileError)
    );

    expect((L as any).vectorGrid.protobuf).not.toHaveBeenCalled();
  });

  it('does not render layer when regions are hidden', () => {
    renderHook(() =>
      useRegionRendering(mockMap, visitData, false, 'static', 2, 1, [], [], onTileError)
    );

    expect((L as any).vectorGrid.protobuf).not.toHaveBeenCalled();
  });

  it('creates vector tile layer and adds it to map', () => {
    renderHook(() =>
      useRegionRendering(mockMap, visitData, true, 'static', 2, 1, [], [], onTileError)
    );

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
              color: '#0A7E43',
              weight: 1,
              fillColor: '#0A7E43',
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
    visitData = new Map([['RR1::PL::POM::001', { ...visitedRegion, visitCount: 2 }]]);

    renderHook(() =>
      useRegionRendering(mockMap, visitData, true, 'static', 2, 1, [], [], onTileError)
    );

    expect(setFeatureStyle).toHaveBeenCalledWith(
      'RR1::PL::POM::001',
      getVisitedRegionStyle({
        sourceUrl: 'http://localhost:3000/api/regions/tiles/v1/{z}/{x}/{y}.pbf',
        layerName: 'regions',
        paneName: 'regionsPane',
        minZoom: 4,
        maxZoom: 12,
        style: {
          color: '#0A7E43',
          weight: 1,
          fillColor: '#0A7E43',
          fillOpacity: 0.08,
          opacity: 0.9,
        },
      })
    );
  });

  it('resets style when a previously visited region is no longer visited', () => {
    const { rerender } = renderHook(
      ({ currentVisitData }) =>
        useRegionRendering(mockMap, currentVisitData, true, 'static', 2, 1, [], [], onTileError),
      {
        initialProps: {
          currentVisitData: new Map([['RR1::PL::POM::001', visitedRegion]]),
        },
      }
    );

    rerender({ currentVisitData: new Map() });

    expect(resetFeatureStyle).toHaveBeenCalledWith('RR1::PL::POM::001');
  });

  it('cleans up tile listeners and map layer on unmount', () => {
    mockMap.hasLayer.mockReturnValue(true);

    const { unmount } = renderHook(() =>
      useRegionRendering(mockMap, visitData, true, 'static', 2, 1, [], [], onTileError)
    );

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

  it('uses numeric region_id when provided by VectorGrid feature properties', () => {
    expect(getRegionFeatureId({ properties: { region_id: 1234 }, id: 'fallback-id' })).toBe('1234');
  });

  it('reports a tile error through the callback', () => {
    renderHook(() =>
      useRegionRendering(mockMap, visitData, true, 'static', 2, 1, [], [], onTileError)
    );

    const tileErrorHandler = on.mock.calls.find(([eventName]) => eventName === 'tileerror')?.[1];
    tileErrorHandler?.({ message: 'boom' });

    expect(onTileError).toHaveBeenCalledWith('Region overlay unavailable');
  });

  it('clears a prior tile error once the layer loads successfully', () => {
    renderHook(() =>
      useRegionRendering(mockMap, visitData, true, 'static', 2, 1, [], [], onTileError)
    );

    const loadHandler = on.mock.calls.find(([eventName]) => eventName === 'load')?.[1];
    loadHandler?.();

    expect(onTileError).toHaveBeenCalledWith('');
  });

  it('reports degraded mode when VectorGrid plugin is unavailable', () => {
    delete (L as any).vectorGrid;

    renderHook(() =>
      useRegionRendering(mockMap, visitData, true, 'static', 2, 1, [], [], onTileError)
    );

    expect(onTileError).toHaveBeenCalledWith('Region overlay unavailable');
    expect(addTo).not.toHaveBeenCalled();
  });

  it('clears a stale tile error when regions are hidden', () => {
    const { rerender } = renderHook(
      ({ showRegions }) =>
        useRegionRendering(mockMap, visitData, showRegions, 'static', 2, 1, [], [], onTileError),
      {
        initialProps: { showRegions: true },
      }
    );

    onTileError.mockClear();
    rerender({ showRegions: false });

    expect(onTileError).toHaveBeenCalledWith('');
  });

  it('reapplies visited styles when the map instance changes', () => {
    const firstLayer = {
      addTo: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      setFeatureStyle: jest.fn(),
      resetFeatureStyle: jest.fn(),
    };
    const secondLayer = {
      addTo: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      setFeatureStyle: jest.fn(),
      resetFeatureStyle: jest.fn(),
    };
    const firstMap = {
      hasLayer: jest.fn(() => false),
      removeLayer: jest.fn(),
      getPane: jest.fn(() => null),
      createPane: jest.fn(() => ({ style: { zIndex: '' } })),
    } as any;
    const secondMap = {
      hasLayer: jest.fn(() => false),
      removeLayer: jest.fn(),
      getPane: jest.fn(() => null),
      createPane: jest.fn(() => ({ style: { zIndex: '' } })),
    } as any;

    visitData = new Map([['RR1::PL::POM::001', visitedRegion]]);

    (L as any).vectorGrid.protobuf = jest
      .fn()
      .mockImplementationOnce(() => firstLayer)
      .mockImplementationOnce(() => secondLayer);

    const { rerender } = renderHook(
      ({ currentMap }) =>
        useRegionRendering(currentMap, visitData, true, 'static', 2, 1, [], [], onTileError),
      {
        initialProps: { currentMap: firstMap },
      }
    );

    rerender({ currentMap: secondMap });

    expect(secondLayer.setFeatureStyle).toHaveBeenCalledWith(
      'RR1::PL::POM::001',
      expect.objectContaining({ fillColor: '#dc1414' })
    );
  });
});
