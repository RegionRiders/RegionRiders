import { act, renderHook } from '@testing-library/react';
import L from 'leaflet';
import { ColorThreshold } from '@/components/ActivityMap/mapTypes';
import { RegionVisitData } from '@/lib/utils/regionVisitAnalyzer';
import {
  getRegionFeatureId,
  getUnvisitedRegionStyle,
  getVisitedRegionStyle,
  useRegionRendering,
} from './useRegionRendering';
import { calculateWeightForZoom } from './utils/calculateWeightForZoom';

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

const renderedTileKey = '12:2211:1344';

function createMockVectorTiles() {
  return {
    [renderedTileKey]: {
      _features: {
        'RR1::PL::POM::001': [
          {
            layerName: 'regions',
            feature: { id: 'visited-feature' },
          },
        ],
        'RR1::PL::POM::002': [
          {
            layerName: 'regions',
            feature: { id: 'unvisited-feature' },
          },
        ],
      },
    },
  };
}

function getBaseStyleResolver(): (() => ReturnType<typeof getUnvisitedRegionStyle>) | undefined {
  return (L as any).vectorGrid.protobuf.mock.calls[0]?.[1]?.vectorTileLayerStyles?.regions as
    | (() => ReturnType<typeof getUnvisitedRegionStyle>)
    | undefined;
}

describe('useRegionRendering', () => {
  const visitedRegion: RegionVisitData = {
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
  const updateStyles = jest.fn();
  const setFeatureStyle = jest.fn();
  const resetFeatureStyle = jest.fn();
  const mapOn = jest.fn();
  const mapOff = jest.fn();
  let paneRegistry: Record<string, { style: { zIndex: string; opacity: string } }> = {};
  let visitData = new Map<string, RegionVisitData>();
  const onTileError = jest.fn();

  const mockLayer: any = {
    addTo,
    on,
    off,
    redraw,
    _updateStyles: updateStyles,
    _vectorTiles: createMockVectorTiles(),
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
    getPane: jest.fn((paneName: string) => paneRegistry[paneName] ?? null),
    createPane: jest.fn((paneName: string) => {
      const pane = { style: { zIndex: '', opacity: '' } };
      paneRegistry[paneName] = pane;
      return pane;
    }),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    paneRegistry = {};
    visitData = new Map();
    mockLayer.options = {};
    mockLayer._vectorTiles = createMockVectorTiles();
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
      mockRegionTileConfig.sourceUrl,
      expect.objectContaining({
        getFeatureId: getRegionFeatureId,
        maxZoom: 18,
        maxNativeZoom: 12,
        updateWhenZooming: false,
        keepBuffer: 4,
        vectorTileLayerStyles: {
          regions: expect.any(Function),
        },
      })
    );
    const baseStyleResolver = getBaseStyleResolver();
    expect(baseStyleResolver?.()).toEqual(
      getUnvisitedRegionStyle(mockRegionTileConfig, 'static', 2, 1, [], [], 12)
    );
    expect(baseStyleResolver?.()).toEqual(expect.objectContaining({ fill: true }));
    expect(addTo).toHaveBeenCalledWith(mockMap);
    expect(on).toHaveBeenCalledWith('load', expect.any(Function));
    expect(on).toHaveBeenCalledWith('tileload', expect.any(Function));
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
        mockRegionTileConfig,
        { ...visitedRegion, visitCount: 2 },
        'static',
        2,
        1,
        [],
        []
      )
    );
    expect(
      getVisitedRegionStyle(
        mockRegionTileConfig,
        { ...visitedRegion, visitCount: 2 },
        'static',
        2,
        1,
        [],
        []
      )
    ).toEqual(expect.objectContaining({ fill: true }));
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
        opacity: 0.9,
        fillOpacity: 1,
        color: 'rgba(210,40,40,1)',
        fillColor: 'rgba(210,40,40,0.4)',
      })
    );
    expect(paneRegistry.regionsPane?.style.opacity).toBe('0.35');
  });

  it('uses configured border thickness while applying transparency through the regions pane', () => {
    renderHook(() =>
      useRegionRendering(mockMap, visitData, true, 'static', 6, 0.4, [], [], onTileError)
    );

    const baseStyleResolver = getBaseStyleResolver();

    expect(baseStyleResolver?.()).toEqual(
      expect.objectContaining({
        fill: true,
        weight: 6,
        opacity: 0.9,
        fillOpacity: 1,
      })
    );
    expect(paneRegistry.regionsPane?.style.opacity).toBe('0.4');
  });

  it('restyles the live layer for style-only setting changes without recreating it', () => {
    visitData = new Map([['RR1::PL::POM::001', { ...visitedRegion, visitCount: 5 }]]);
    const updatedHeatmapThresholds: ColorThreshold[] = [
      { threshold: 0, color: [12, 12, 12, 0.18] as [number, number, number, number] },
      { threshold: 1, color: [210, 40, 40, 0.4] as [number, number, number, number] },
    ];
    type StyleOnlyProps = {
      currentMode: 'static' | 'heatmap';
      currentBorderThickness: number;
      currentTransparency: number;
      currentHeatmapThresholds: ColorThreshold[];
    };
    const initialProps: StyleOnlyProps = {
      currentMode: 'static',
      currentBorderThickness: 2,
      currentTransparency: 1,
      currentHeatmapThresholds: [],
    };

    const { rerender } = renderHook<void, StyleOnlyProps>(
      ({
        currentMode,
        currentBorderThickness,
        currentTransparency,
        currentHeatmapThresholds,
      }: StyleOnlyProps) =>
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
        initialProps,
      }
    );

    redraw.mockClear();
    updateStyles.mockClear();
    setFeatureStyle.mockClear();

    rerender({
      currentMode: 'heatmap' as const,
      currentBorderThickness: 5,
      currentTransparency: 0.35,
      currentHeatmapThresholds: updatedHeatmapThresholds,
    });

    expect((L as any).vectorGrid.protobuf).toHaveBeenCalledTimes(1);
    expect(redraw).not.toHaveBeenCalled();
    expect(updateStyles).toHaveBeenCalledWith(
      { id: 'visited-feature' },
      mockLayer._vectorTiles[renderedTileKey],
      expect.objectContaining({
        color: 'rgba(12,12,12,1)',
        fill: true,
        fillColor: 'rgba(12,12,12,0.18)',
        weight: 5,
        opacity: 0.9,
        fillOpacity: 1,
      })
    );
    expect(mockLayer.options.vectorTileLayerStyles?.regions).toEqual(expect.any(Function));
    const updatedBaseStyleResolver = mockLayer.options.vectorTileLayerStyles?.regions as
      | (() => ReturnType<typeof getUnvisitedRegionStyle>)
      | undefined;
    expect(updatedBaseStyleResolver?.()).toEqual(
      expect.objectContaining({
        color: 'rgba(12,12,12,1)',
        fill: true,
        fillColor: 'rgba(12,12,12,0.18)',
        weight: 5,
        opacity: 0.9,
        fillOpacity: 1,
      })
    );
    expect(
      Math.max(
        updatedBaseStyleResolver?.()?.opacity ?? 0,
        updatedBaseStyleResolver?.()?.fillOpacity ?? 0
      )
    ).toBeGreaterThan(0);
    expect(setFeatureStyle).toHaveBeenCalledWith(
      'RR1::PL::POM::001',
      expect.objectContaining({
        weight: 5,
        opacity: 0.9,
        fillOpacity: 1,
        color: 'rgba(210,40,40,1)',
        fillColor: 'rgba(210,40,40,0.4)',
      })
    );
    expect(paneRegistry.regionsPane?.style.opacity).toBe('0.35');
  });

  it('keeps the previous settled weight until the next zoom becomes tile-ready', () => {
    mockMap.getZoom.mockReturnValue(4);

    renderHook(() =>
      useRegionRendering(mockMap, visitData, true, 'static', 6, 0.4, [], [], onTileError)
    );

    const zoomHandler = mapOn.mock.calls.find(([eventName]) => eventName === 'zoomend')?.[1];
    const tileLoadHandler = on.mock.calls.find(([eventName]) => eventName === 'tileload')?.[1];
    const loadHandler = on.mock.calls.find(([eventName]) => eventName === 'load')?.[1];
    expect(zoomHandler).toEqual(expect.any(Function));
    expect(tileLoadHandler).toEqual(expect.any(Function));
    expect(loadHandler).toEqual(expect.any(Function));

    redraw.mockClear();
    updateStyles.mockClear();
    mockMap.getZoom.mockReturnValue(12);
    act(() => {
      zoomHandler?.();
    });

    expect((L as any).vectorGrid.protobuf).toHaveBeenCalledTimes(1);
    expect(redraw).not.toHaveBeenCalled();
    expect(updateStyles).not.toHaveBeenCalled();

    const zoomedBaseStyleResolver = mockLayer.options.vectorTileLayerStyles?.regions as
      | (() => ReturnType<typeof getUnvisitedRegionStyle>)
      | undefined;
    expect(zoomedBaseStyleResolver?.()).toEqual(
      expect.objectContaining({
        fill: true,
        weight: calculateWeightForZoom(4, 6),
      })
    );

    act(() => {
      loadHandler?.();
    });

    expect(updateStyles).toHaveBeenCalledWith(
      { id: 'visited-feature' },
      mockLayer._vectorTiles[renderedTileKey],
      expect.objectContaining({
        fill: true,
        weight: calculateWeightForZoom(4, 6),
      })
    );

    updateStyles.mockClear();

    act(() => {
      tileLoadHandler?.({ coords: { z: 12 } });
      loadHandler?.();
    });

    expect(updateStyles).toHaveBeenCalledWith(
      { id: 'visited-feature' },
      mockLayer._vectorTiles[renderedTileKey],
      expect.objectContaining({
        fill: true,
        weight: calculateWeightForZoom(12, 6),
      })
    );
    expect(zoomedBaseStyleResolver?.()).toEqual(
      expect.objectContaining({
        fill: true,
        weight: calculateWeightForZoom(12, 6),
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
        mockRegionTileConfig,
        'static',
        2,
        0.2,
        transparentPlaceholderThresholds,
        [],
        4
      )
    ).toEqual(
      expect.objectContaining({
        fill: true,
        fillColor: '#0A7E43',
        opacity: 0,
        fillOpacity: 0.14,
      })
    );
  });

  it('keeps the default placeholder base fill visible and transparency-scaled', () => {
    expect(getUnvisitedRegionStyle(mockRegionTileConfig, 'static', 2, 0.35, [], [], 12)).toEqual(
      expect.objectContaining({
        fill: true,
        fillColor: 'rgba(60,60,60,0.18)',
        fillOpacity: 1,
      })
    );
  });

  it('reapplies visited overrides after the zoom handoff load commits the new style zoom', () => {
    visitData = new Map([['RR1::PL::POM::001', { ...visitedRegion, visitCount: 2 }]]);
    mockMap.getZoom.mockReturnValue(12);

    renderHook(() =>
      useRegionRendering(mockMap, visitData, true, 'static', 2, 1, [], [], onTileError)
    );

    const zoomHandler = mapOn.mock.calls.find(([eventName]) => eventName === 'zoomend')?.[1];
    const tileLoadHandler = on.mock.calls.find(([eventName]) => eventName === 'tileload')?.[1];
    const loadHandler = on.mock.calls.find(([eventName]) => eventName === 'load')?.[1];
    expect(zoomHandler).toEqual(expect.any(Function));
    expect(tileLoadHandler).toEqual(expect.any(Function));
    expect(loadHandler).toEqual(expect.any(Function));

    redraw.mockClear();
    setFeatureStyle.mockClear();
    mockMap.getZoom.mockReturnValue(4);

    act(() => {
      zoomHandler?.();
    });

    expect((L as any).vectorGrid.protobuf).toHaveBeenCalledTimes(1);
    expect(redraw).not.toHaveBeenCalled();
    expect(setFeatureStyle).not.toHaveBeenCalled();

    act(() => {
      tileLoadHandler?.({ coords: { z: 4 } });
      loadHandler?.();
    });

    expect(setFeatureStyle).toHaveBeenCalledWith(
      'RR1::PL::POM::001',
      getVisitedRegionStyle(
        mockRegionTileConfig,
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
      useRegionRendering(mockMap, visitData, true, 'static', 2, 0.4, [], [], onTileError)
    );

    expect(paneRegistry.regionsPane?.style.opacity).toBe('0.4');
    unmount();

    expect(off).toHaveBeenCalledWith('load', expect.any(Function));
    expect(off).toHaveBeenCalledWith('tileerror', expect.any(Function));
    expect(mapOff).toHaveBeenCalledWith('zoomend', expect.any(Function));
    expect(mockMap.removeLayer).toHaveBeenCalledWith(mockLayer);
    expect(paneRegistry.regionsPane?.style.opacity).toBe('');
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
        useRegionRendering(mockMap, visitData, showRegions, 'static', 2, 0.4, [], [], onTileError),
      {
        initialProps: { showRegions: true },
      }
    );

    expect(paneRegistry.regionsPane?.style.opacity).toBe('0.4');
    onTileError.mockClear();
    rerender({ showRegions: false });

    expect(onTileError).toHaveBeenCalledWith('');
    expect(paneRegistry.regionsPane?.style.opacity).toBe('');
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
