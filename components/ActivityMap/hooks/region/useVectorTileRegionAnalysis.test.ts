import { act, renderHook } from '@testing-library/react';
import { MAP_SOURCE_IDS } from '@/components/ActivityMap/config/mapLayerIds';
import {
  buildTrackPointSpatialGrid,
  useVectorTileRegionAnalysis,
} from '@/components/ActivityMap/hooks/region/useVectorTileRegionAnalysis';
import { GPXTrack } from '@/lib/types';
import { createMockMapLibreInstance } from '@/test-utils/maplibreMock';

jest.mock('@/lib/services/maps/selectRenderProfile', () => ({
  selectRegionRenderProfile: jest.fn(() => 'desktop'),
}));

describe('useVectorTileRegionAnalysis', () => {
  const sampleTracks = new Map<string, GPXTrack>([
    [
      'track-gdansk-1',
      {
        id: 'track-gdansk-1',
        name: 'Gdańsk Ride 1',
        points: [
          { lat: 54.35, lon: 18.65 },
          { lat: 54.36, lon: 18.66 },
        ],
      },
    ],
    [
      'track-gdansk-2',
      {
        id: 'track-gdansk-2',
        name: 'Gdańsk Ride 2',
        points: [{ lat: 54.355, lon: 18.655 }],
      },
    ],
  ]);

  it('builds a spatial grid of sampled track points', () => {
    const grid = buildTrackPointSpatialGrid(sampleTracks);
    expect(grid.totalSampledPoints).toBe(3);
    expect(grid.cells.size).toBeGreaterThan(0);
  });

  it('detects visited MVT regions and counts unique tracks passing through them', () => {
    const mockMap = createMockMapLibreInstance();
    mockMap._sources.set(MAP_SOURCE_IDS.REGIONS, { type: 'vector' });

    const gdanskPolygon: GeoJSON.Polygon = {
      type: 'Polygon',
      coordinates: [
        [
          [18.6, 54.3],
          [18.7, 54.3],
          [18.7, 54.4],
          [18.6, 54.4],
          [18.6, 54.3],
        ],
      ],
    };

    const unvisitedPolygon: GeoJSON.Polygon = {
      type: 'Polygon',
      coordinates: [
        [
          [20.0, 50.0],
          [20.1, 50.0],
          [20.1, 50.1],
          [20.0, 50.1],
          [20.0, 50.0],
        ],
      ],
    };

    (mockMap as any).querySourceFeatures = jest.fn(() => [
      {
        id: 'RR1::PL::POM::GDANSK',
        properties: { region_id: 'RR1::PL::POM::GDANSK', name: 'Gdańsk' },
        geometry: gdanskPolygon,
      },
      {
        id: 'RR1::PL::MAL::KRAKOW',
        properties: { region_id: 'RR1::PL::MAL::KRAKOW', name: 'Kraków' },
        geometry: unvisitedPolygon,
      },
    ]);

    const { result } = renderHook(() =>
      useVectorTileRegionAnalysis(mockMap as any, sampleTracks, true)
    );

    expect(result.current.size).toBe(1);
    const gdanskVisit = result.current.get('RR1::PL::POM::GDANSK');
    expect(gdanskVisit).toEqual({
      regionId: 'RR1::PL::POM::GDANSK',
      regionName: 'Gdańsk',
      visited: true,
      visitCount: 2,
      trackIds: ['track-gdansk-1', 'track-gdansk-2'],
      geometry: gdanskPolygon,
    });
    expect(result.current.has('RR1::PL::MAL::KRAKOW')).toBe(false);
  });

  it('re-runs incremental analysis when new MVT tiles finish loading on sourcedata event', () => {
    jest.useFakeTimers();
    const mockMap = createMockMapLibreInstance();
    mockMap._sources.set(MAP_SOURCE_IDS.REGIONS, { type: 'vector' });

    const features: any[] = [];
    (mockMap as any).querySourceFeatures = jest.fn(() => features);

    const { result } = renderHook(() =>
      useVectorTileRegionAnalysis(mockMap as any, sampleTracks, true)
    );

    expect(result.current.size).toBe(0);

    // Simulate tile arriving later
    features.push({
      id: 'RR1::PL::POM::SOPOT',
      properties: { region_id: 'RR1::PL::POM::SOPOT', name: 'Sopot' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [18.6, 54.3],
            [18.7, 54.3],
            [18.7, 54.4],
            [18.6, 54.4],
            [18.6, 54.3],
          ],
        ],
      },
    });

    act(() => {
      mockMap._emit('sourcedata', { sourceId: MAP_SOURCE_IDS.REGIONS, isSourceLoaded: true });
      jest.advanceTimersByTime(250);
    });

    expect(result.current.get('RR1::PL::POM::SOPOT')?.visited).toBe(true);
    expect(result.current.get('RR1::PL::POM::SOPOT')?.visitCount).toBe(2);
    jest.useRealTimers();
  });
});
