import { act, renderHook } from '@testing-library/react';
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
  const redraw = jest.fn();
  const setFeatureStyle = jest.fn();
  const resetFeatureStyle = jest.fn();
  const mapOn = jest.fn();
  const mapOff = jest.fn();
  let visitData = new Map<string, any>();
  const onTileError = jest.fn();

  const mockLayer: any = {
    addTo,
    on,
    off,
    redraw,
    setFeatureStyle,
    resetFeatureStyle,
    options: {},
  };

  const mockMap = {
    hasLayer: jest.fn(() => false),
    removeLayer: jest.fn(),
    on: mapOn,
    off: mapOff,
    getZoom: jest.fn(() => 12),
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
        maxZoom: 18,
        maxNativeZoom: 12,
        vectorTileLayerStyles: {
          regions: getUnvisitedRegionStyle(
            {
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
            },
            'static',
            2,
            1,
            [],
            []
          ),
        },
      })
    );
    expect(addTo).toHaveBeenCalledWith(mockMap);
    expect(on).toHaveBeenCalledWith('load', expect.any(Function));
    expect(on).toHaveBeenCalledWith('tileerror', expect.any(Function));
    expect(mapOn).toHaveBeenCalledWith('zoomend', expect.any(Function));
  });

  it('applies visited style overrides for visited regions', () => {
    visitData = new Map([['RR1::PL::POM::001', { ...visitedRegion, visitCount: 2 }]]);

    renderHook(() =>
      useRegionRendering(mockMap, visitData, true, 'static', 2, 1, [], [], onTileError)
    );

    expect(setFeatureStyle).toHaveBeenCalledWith(
      'RR1::PL::POM::001',
      getVisitedRegionStyle(
        {
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
        },
        { ...visitedRegion, visitCount: 2 },
        'static',
        2,
        1,
        [],
        []
      )
    );
  });

  it('uses heatmap mode thresholds for visited style updates', () => {
    visitData = new Map([['RR1::PL::POM::001', { ...visitedRegion, visitCount: 5 }]]);
    const heatmapThresholds = [
      { threshold: 0, color: [10, 10, 10, 0] as [number, number, number, number] },
      { threshold: 1, color: [210, 40, 40, 0.4] as [number, number, number, number] },
    ];

    renderHook(() =>
      useRegionRendering(
        mockMap,
        visitData,
        true,
        'heatmap',
        5,
        0.35,
        [],
        heatmapThresholds,
        onTileError
      )
    );

    expect(setFeatureStyle).toHaveBeenCalledWith(
      'RR1::PL::POM::001',
      expect.objectContaining({
        weight: 5,
        opacity: 0.35,
        fillOpacity: 0.35,
        color: 'rgba(210,40,40,1)',
        fillColor: 'rgba(210,40,40,0.4)',
      })
    );
  });

  it('uses configured border thickness and transparency for the base vector tile style', () => {
    renderHook(() =>
      useRegionRendering(mockMap, visitData, true, 'static', 6, 0.4, [], [], onTileError)
    );

    expect((L as any).vectorGrid.protobuf).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        vectorTileLayerStyles: {
          regions: expect.objectContaining({
            weight: 6,
            opacity: 0.4,
            fillOpacity: 0.4,
          }),
        },
      })
    );
  });

  it('restyles the live layer for style-only setting changes without recreating it', () => {
    visitData = new Map([['RR1::PL::POM::001', { ...visitedRegion, visitCount: 5 }]]);
    const updatedHeatmapThresholds = [
      { threshold: 0, color: [12, 12, 12, 0.18] as [number, number, number, number] },
      { threshold: 1, color: [210, 40, 40, 0.4] as [number, number, number, number] },
    ];

    const { rerender } = renderHook(
      ({ currentMode, currentBorderThickness, currentTransparency, currentHeatmapThresholds }) =>
        useRegionRendering(
          mockMap,
          visitData,
          true,
          currentMode,
          currentBorderThickness,
          currentTransparency,
          [],
          currentHeatmapThresholds,
          onTileError
        ),
      {
        initialProps: {
          currentMode: 'static' as const,
          currentBorderThickness: 2,
          currentTransparency: 1,
          currentHeatmapThresholds: [],
        },
      }
    );

    redraw.mockClear();
    setFeatureStyle.mockClear();

    rerender({
      currentMode: 'heatmap' as const,
      currentBorderThickness: 5,
      currentTransparency: 0.35,
      currentHeatmapThresholds: updatedHeatmapThresholds,
    });

    expect((L as any).vectorGrid.protobuf).toHaveBeenCalledTimes(1);
    expect(redraw).toHaveBeenCalledTimes(1);
    expect(mockLayer.options.vectorTileLayerStyles?.regions).toEqual(
      expect.objectContaining({
        weight: 5,
        opacity: 0.35,
        fillOpacity: 0.35,
      })
    );
    expect(setFeatureStyle).toHaveBeenCalledWith(
      'RR1::PL::POM::001',
      expect.objectContaining({
        weight: 5,
        opacity: 0.35,
        fillOpacity: 0.35,
        color: 'rgba(210,40,40,1)',
        fillColor: 'rgba(210,40,40,0.4)',
      })
    );
  });

  it('restyles the existing layer on zoom changes without recreating it', () => {
    renderHook(() =>
      useRegionRendering(mockMap, visitData, true, 'static', 2, 0.4, [], [], onTileError)
    );

    const zoomHandler = mapOn.mock.calls.find(([eventName]) => eventName === 'zoomend')?.[1];
    expect(zoomHandler).toEqual(expect.any(Function));

    mockMap.getZoom.mockReturnValue(4);
    act(() => {
      zoomHandler?.();
    });

    expect((L as any).vectorGrid.protobuf).toHaveBeenCalledTimes(1);
    expect(redraw).toHaveBeenCalled();
    expect(mockLayer.options.vectorTileLayerStyles?.regions).toEqual(
      expect.objectContaining({
        fillColor: 'rgba(60,60,60,0.08)',
        opacity: 0,
        fillOpacity: 0.4,
      })
    );
  });

  it('keeps a visible low-zoom fill when the stroke is intentionally hidden', () => {
    const transparentPlaceholderThresholds = [
      { threshold: 0, color: [60, 60, 60, 0] as [number, number, number, number] },
      { threshold: 1, color: [76, 107, 34, 0.2] as [number, number, number, number] },
    ];

    expect(
      getUnvisitedRegionStyle(
        {
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
        },
        'static',
        2,
        0.2,
        transparentPlaceholderThresholds,
        [],
        4
      )
    ).toEqual(
      expect.objectContaining({
        fillColor: '#0A7E43',
        opacity: 0,
        fillOpacity: 0.2,
      })
    );
  });

  it('keeps the default placeholder base fill visible and transparency-scaled', () => {
    expect(
      getUnvisitedRegionStyle(
        {
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
        },
        'static',
        2,
        0.35,
        [],
        [],
        12
      )
    ).toEqual(
      expect.objectContaining({
        fillColor: 'rgba(60,60,60,0.08)',
        fillOpacity: 0.35,
      })
    );
  });

  it('reapplies visited overrides on zoom changes through the live layer path', () => {
    visitData = new Map([['RR1::PL::POM::001', { ...visitedRegion, visitCount: 2 }]]);

    renderHook(() =>
      useRegionRendering(mockMap, visitData, true, 'static', 2, 1, [], [], onTileError)
    );

    const zoomHandler = mapOn.mock.calls.find(([eventName]) => eventName === 'zoomend')?.[1];
    expect(zoomHandler).toEqual(expect.any(Function));

    redraw.mockClear();
    setFeatureStyle.mockClear();
    mockMap.getZoom.mockReturnValue(4);

    act(() => {
      zoomHandler?.();
    });

    expect((L as any).vectorGrid.protobuf).toHaveBeenCalledTimes(1);
    expect(redraw).toHaveBeenCalledTimes(1);
    expect(setFeatureStyle).toHaveBeenCalledWith(
      'RR1::PL::POM::001',
      getVisitedRegionStyle(
        {
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
        },
        { ...visitedRegion, visitCount: 2 },
        'static',
        2,
        1,
        [],
        [],
        4
      )
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
    expect(mapOff).toHaveBeenCalledWith('zoomend', expect.any(Function));
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

  it('reports degraded mode when vectorGrid layer creation throws synchronously', () => {
    (L as any).vectorGrid = {
      protobuf: jest.fn(() => {
        throw new Error('factory boom');
      }),
    };

    renderHook(() =>
      useRegionRendering(mockMap, visitData, true, 'static', 2, 1, [], [], onTileError)
    );

    expect(onTileError).toHaveBeenCalledWith('Region overlay unavailable');
  });

  it('reports degraded mode when adding the layer to the map throws synchronously', () => {
    const throwingLayer = {
      addTo: jest.fn(() => {
        throw new Error('add boom');
      }),
      on: jest.fn(),
      off: jest.fn(),
      setFeatureStyle: jest.fn(),
      resetFeatureStyle: jest.fn(),
    };

    (L as any).vectorGrid = {
      protobuf: jest.fn(() => throwingLayer),
    };

    renderHook(() =>
      useRegionRendering(mockMap, visitData, true, 'static', 2, 1, [], [], onTileError)
    );

    expect(throwingLayer.off).toHaveBeenCalledWith('load', expect.any(Function));
    expect(throwingLayer.off).toHaveBeenCalledWith('tileerror', expect.any(Function));
    expect(onTileError).toHaveBeenCalledWith('Region overlay unavailable');
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
      redraw: jest.fn(),
      setFeatureStyle: jest.fn(),
      resetFeatureStyle: jest.fn(),
      options: {},
    };
    const secondLayer = {
      addTo: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      redraw: jest.fn(),
      setFeatureStyle: jest.fn(),
      resetFeatureStyle: jest.fn(),
      options: {},
    };
    const firstMap = {
      hasLayer: jest.fn(() => false),
      removeLayer: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      getZoom: jest.fn(() => 12),
      getPane: jest.fn(() => null),
      createPane: jest.fn(() => ({ style: { zIndex: '' } })),
    } as any;
    const secondMap = {
      hasLayer: jest.fn(() => false),
      removeLayer: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      getZoom: jest.fn(() => 12),
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
      expect.objectContaining({ fillColor: 'rgba(76,107,34,0.2)' })
    );
  });
});
