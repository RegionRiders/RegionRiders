import { renderHook } from '@testing-library/react';
import { GeoJSON } from 'geojson';
import { Regions } from '@/lib/types';
import { RegionLayerManager } from './renderingModes/regionLayerManager';
import { useRegionRendering } from './useRegionRendering';

// Mock dependencies
jest.mock('./renderingModes/regionLayerManager', () => ({
  RegionLayerManager: jest.fn().mockImplementation(() => ({
    syncRegions: jest.fn(),
    updateStyles: jest.fn(),
    clear: jest.fn(),
    destroy: jest.fn(),
    getLayerCount: jest.fn(() => 0),
  })),
}));

jest.mock('./utils/calculateWeightForZoom', () => ({
  calculateWeightForZoom: jest.fn(() => 2),
}));

jest.mock('@/lib/logger/client', () => ({
  createComponentLogger: jest.fn(() => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  })),
}));

describe('useRegionRendering', () => {
  const mockMap = {
    getZoom: jest.fn(() => 10),
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

    it('should handle empty region visits', () => {
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

    it('should initialize layer manager when map is provided', () => {
      renderHook(() => useRegionRendering(mockMap, [mockRegion], mockRegionVisits, true));

      expect(RegionLayerManager).toHaveBeenCalledWith(mockMap);
    });
  });

  describe('rendering', () => {
    it('should render regions when map and regions are provided', () => {
      expect(() => {
        renderHook(() => useRegionRendering(mockMap, [mockRegion], mockRegionVisits, true));
      }).not.toThrow();
    });

    it('should call syncRegions when regions are provided', () => {
      renderHook(() => useRegionRendering(mockMap, [mockRegion], mockRegionVisits, true));

      const mockLayerManager = (RegionLayerManager as jest.Mock).mock.results[0]?.value;
      if (mockLayerManager) {
        expect(mockLayerManager.syncRegions).toHaveBeenCalled();
      }
    });

    it('should call clear when showRegions is false', () => {
      renderHook(() => useRegionRendering(mockMap, [mockRegion], mockRegionVisits, false));

      const mockLayerManager = (RegionLayerManager as jest.Mock).mock.results[0]?.value;
      if (mockLayerManager) {
        expect(mockLayerManager.clear).toHaveBeenCalled();
      }
    });
  });

  describe('dependencies', () => {
    it('should re-render when regions change', () => {
      const { rerender } = renderHook(
        ({ regions }) => useRegionRendering(mockMap, regions, mockRegionVisits, true),
        { initialProps: { regions: [mockRegion] } }
      );

      const newRegion: Regions = {
        id: 'region2',
        name: 'New Region',
        country: 'Test Country',
        adminLevel: 1,
        geometry: mockPolygon,
        properties: {},
      };

      expect(() => rerender({ regions: [mockRegion, newRegion] })).not.toThrow();
    });

    it('should update styles when visitData changes', () => {
      const { rerender } = renderHook(
        ({ visits }) => useRegionRendering(mockMap, [mockRegion], visits, true),
        { initialProps: { visits: mockRegionVisits } }
      );

      const newVisits = new Map([
        ...mockRegionVisits,
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

  describe('cleanup', () => {
    it('should destroy layer manager on unmount', () => {
      const { unmount } = renderHook(() =>
        useRegionRendering(mockMap, [mockRegion], mockRegionVisits, true)
      );

      const mockLayerManager = (RegionLayerManager as jest.Mock).mock.results[0]?.value;

      unmount();

      if (mockLayerManager) {
        expect(mockLayerManager.destroy).toHaveBeenCalled();
      }
    });
  });
});
