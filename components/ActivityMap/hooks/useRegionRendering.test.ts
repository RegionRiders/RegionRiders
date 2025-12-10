import { renderHook } from '@testing-library/react';
import { GeoJSON } from 'geojson';
import { Regions } from '@/lib/types';
import { useRegionRendering } from './useRegionRendering';

// Mock the drawing function
jest.mock('../drawRegions/drawRegions', () => ({
  drawRegions: jest.fn(() => [
    {
      setStyle: jest.fn(),
    },
  ]),
}));

describe('useRegionRendering', () => {
  const mockMap = {
    on: jest.fn(),
    off: jest.fn(),
    invalidateSize: jest.fn(),
    getZoom: jest.fn(() => 10),
    hasLayer: jest.fn(() => false),
    removeLayer: jest.fn(),
  } as any;

  const mockPolygon: GeoJSON.Polygon = {
    type: 'Polygon',
    coordinates: [
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
        [0, 0],
      ],
    ],
  };

  const mockRegion: Regions = {
    id: 'region1',
    name: 'Test Region',
    country: 'Test Country',
    adminLevel: 1,
    geometry: mockPolygon,
    properties: {},
  };

  const mockRegionVisits = new Map([
    [
      'region1',
      {
        regionId: 'region1',
        regionName: 'Test Region',
        visitCount: 5,
        trackIds: ['track1'],
        visited: true,
        geometry: mockPolygon,
      },
    ],
  ]);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should handle null map', () => {
      expect(() => {
        renderHook(() => useRegionRendering(null, [mockRegion], mockRegionVisits, true));
      }).not.toThrow();
    });

    it('should handle null region visits', () => {
      const emptyVisits = new Map();
      expect(() => {
        renderHook(() => useRegionRendering(mockMap, [mockRegion], emptyVisits, true));
      }).not.toThrow();
    });

    it('should handle empty regions', () => {
      expect(() => {
        renderHook(() => useRegionRendering(mockMap, [], mockRegionVisits, true));
      }).not.toThrow();
    });
  });

  describe('rendering', () => {
    it('should render regions when map and visits are provided', () => {
      expect(() => {
        renderHook(() => useRegionRendering(mockMap, [mockRegion], mockRegionVisits, true));
      }).not.toThrow();
    });

    it('should clear old layers before rendering new ones', () => {
      mockMap.hasLayer.mockReturnValue(true);

      // First render
      const { rerender } = renderHook(
        ({ map, regions, visits, show }) => useRegionRendering(map, regions, visits, show),
        {
          initialProps: {
            map: mockMap,
            regions: [mockRegion],
            visits: mockRegionVisits,
            show: true,
          },
        }
      );

      // Clear the mock to check second render
      mockMap.removeLayer.mockClear();

      // Second render should clear old layers
      rerender({
        map: mockMap,
        regions: [mockRegion],
        visits: mockRegionVisits,
        show: true,
      });

      expect(mockMap.removeLayer).toHaveBeenCalled();
    });

    it('should handle zoom events and adjust layer weights', () => {
      mockMap.getZoom.mockReturnValue(12);

      renderHook(() => useRegionRendering(mockMap, [mockRegion], mockRegionVisits, true));

      expect(mockMap.on).toHaveBeenCalledWith('zoomend', expect.any(Function));

      // Simulate zoom event by finding the registered handler safely
      const calls = mockMap.on.mock.calls as Array<[string, (...args: any[]) => void]>;
      const zoomCall = calls.find((c) => c[0] === 'zoomend');
      const zoomHandler = zoomCall ? zoomCall[1] : undefined;

      if (zoomHandler) {
        zoomHandler();
      }

      // Should adjust weight based on zoom (no throw)
    });
  });

  describe('dependencies', () => {
    it('should re-render when regionVisits change', () => {
      const { rerender } = renderHook(
        ({ visits }) => useRegionRendering(mockMap, [mockRegion], visits, true),
        { initialProps: { visits: mockRegionVisits } }
      );

      const newVisits = new Map([
        [
          'region1',
          {
            regionId: 'region1',
            regionName: 'Test Region',
            visitCount: 5,
            trackIds: ['track1'],
            visited: true,
            geometry: mockPolygon,
          },
        ],
        [
          'region2',
          {
            regionId: 'region2',
            regionName: 'Region 2',
            visitCount: 3,
            trackIds: ['track2'],
            visited: true,
            geometry: mockPolygon,
          },
        ],
      ]);

      expect(() => rerender({ visits: newVisits })).not.toThrow();
    });
  });

  it('should clean up layers and event listeners on unmount', () => {
    mockMap.hasLayer.mockReturnValue(true);

    const { unmount } = renderHook(() =>
      useRegionRendering(mockMap, [mockRegion], mockRegionVisits, true)
    );

    unmount();

    expect(mockMap.off).toHaveBeenCalledWith('zoomend', expect.any(Function));
    expect(mockMap.removeLayer).toHaveBeenCalled();
  });
});
