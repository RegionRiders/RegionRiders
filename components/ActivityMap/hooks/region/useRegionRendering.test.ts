import { renderHook } from '@testing-library/react';
import { MAP_LAYER_IDS, MAP_SOURCE_IDS } from '@/components/ActivityMap/config/mapLayerIds';
import { useRegionRendering } from '@/components/ActivityMap/hooks/region/useRegionRendering';
import { RegionVisitData } from '@/lib/utils/regionVisitAnalyzer';
import { createMockMapLibreInstance } from '@/test-utils/maplibreMock';

jest.mock('@/lib/services/maps/selectRenderProfile', () => ({
  selectRegionRenderProfile: jest.fn(() => 'desktop'),
}));

jest.mock('@/lib/services/maps/regionPerfMetrics', () => ({
  logRegionTileError: jest.fn(),
  markFirstRegionLayerAdded: jest.fn(),
}));

describe('useRegionRendering (MapLibre GL JS)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('adds MVT vector source with maxzoom 12, promoteId region_id, and fill+line layers', () => {
    const mockMap = createMockMapLibreInstance();
    const visitData = new Map<string, RegionVisitData>();

    const { unmount } = renderHook(() =>
      useRegionRendering(mockMap as any, visitData, true, 'static', 2, 1)
    );

    expect(mockMap.addSource).toHaveBeenCalledWith(
      MAP_SOURCE_IDS.REGIONS,
      expect.objectContaining({
        type: 'vector',
        maxzoom: 12,
        promoteId: { regions: 'region_id' },
      })
    );
    expect(mockMap.addLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        id: MAP_LAYER_IDS.REGIONS_FILL,
        type: 'fill',
        source: MAP_SOURCE_IDS.REGIONS,
        'source-layer': 'regions',
      }),
      undefined
    );
    expect(mockMap.addLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        id: MAP_LAYER_IDS.REGIONS_LINE,
        type: 'line',
        source: MAP_SOURCE_IDS.REGIONS,
        'source-layer': 'regions',
      }),
      undefined
    );

    unmount();
    expect(mockMap.removeLayer).toHaveBeenCalledWith(MAP_LAYER_IDS.REGIONS_LINE);
    expect(mockMap.removeLayer).toHaveBeenCalledWith(MAP_LAYER_IDS.REGIONS_FILL);
    expect(mockMap.removeSource).toHaveBeenCalledWith(MAP_SOURCE_IDS.REGIONS);
  });

  it('updates transparency, border thickness, and mode in-place via setPaintProperty without recreating layers', () => {
    const mockMap = createMockMapLibreInstance();
    const visitData = new Map<string, RegionVisitData>();

    const { rerender } = renderHook(
      ({ mode, thickness, transparency }) =>
        useRegionRendering(mockMap as any, visitData, true, mode, thickness, transparency),
      {
        initialProps: {
          mode: 'static' as 'static' | 'heatmap',
          thickness: 2,
          transparency: 1,
        },
      }
    );

    expect(mockMap.addSource).toHaveBeenCalledTimes(1);
    expect(mockMap.addLayer).toHaveBeenCalledTimes(2);

    rerender({ mode: 'heatmap', thickness: 5, transparency: 0.4 });

    expect(mockMap.addSource).toHaveBeenCalledTimes(1);
    expect(mockMap.addLayer).toHaveBeenCalledTimes(2);
    expect(mockMap.setPaintProperty).toHaveBeenCalledWith(
      MAP_LAYER_IDS.REGIONS_FILL,
      'fill-color',
      expect.any(Array)
    );
    expect(mockMap.setPaintProperty).toHaveBeenCalledWith(
      MAP_LAYER_IDS.REGIONS_LINE,
      'line-width',
      expect.any(Array)
    );
  });

  it('syncs visited regions via GPU setFeatureState and removes stale feature states', () => {
    const mockMap = createMockMapLibreInstance();
    const initialVisits = new Map<string, RegionVisitData>([
      [
        'RR1::PL::POM::001',
        { regionId: 'RR1::PL::POM::001', visited: true, visitCount: 3 } as RegionVisitData,
      ],
    ]);

    const { rerender } = renderHook(
      ({ visits }) => useRegionRendering(mockMap as any, visits, true, 'static', 2, 1),
      { initialProps: { visits: initialVisits } }
    );

    expect(mockMap.setFeatureState).toHaveBeenCalledWith(
      { source: MAP_SOURCE_IDS.REGIONS, sourceLayer: 'regions', id: 'RR1::PL::POM::001' },
      { visited: true, visitCount: 3 }
    );

    rerender({ visits: new Map<string, RegionVisitData>() });

    expect(mockMap.removeFeatureState).toHaveBeenCalledWith({
      source: MAP_SOURCE_IDS.REGIONS,
      sourceLayer: 'regions',
      id: 'RR1::PL::POM::001',
    });
  });

  it('reports non-fatal tile error when regions source emits error and clears on sourcedata load', () => {
    const mockMap = createMockMapLibreInstance();
    const onTileError = jest.fn();

    renderHook(() =>
      useRegionRendering(mockMap as any, new Map(), true, 'static', 2, 1, [], [], onTileError)
    );

    mockMap._emit('error', { sourceId: MAP_SOURCE_IDS.REGIONS, error: new Error('503') });
    expect(onTileError).toHaveBeenCalledWith('Region overlay unavailable');

    mockMap._emit('sourcedata', { sourceId: MAP_SOURCE_IDS.REGIONS, isSourceLoaded: true });
    expect(onTileError).toHaveBeenCalledWith('');
  });
});
