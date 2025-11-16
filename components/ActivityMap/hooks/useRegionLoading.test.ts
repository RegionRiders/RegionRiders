// components/ActivityMap/hooks/useRegionLoading.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { GeoJSON } from 'geojson';
import { DataLoader } from '@/lib/services/DataLoader';
import { useRegionLoading } from './useRegionLoading';

// Mock DataLoader
jest.mock('@/lib/services/DataLoader', () => ({
  DataLoader: {
    loadRegions: jest.fn(),
  },
}));

// Mock logger
jest.mock('@/lib/logger/client', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('useRegionLoading', () => {
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

  const mockRegions = [
    {
      id: 'region1',
      name: 'Test Region',
      geometry: mockPolygon,
      properties: {},
    },
  ];

  const mockMap = {
    getBounds: jest.fn(() => ({
      getNorth: jest.fn(() => 52),
      getSouth: jest.fn(() => 50),
      getEast: jest.fn(() => 12),
      getWest: jest.fn(() => 10),
    })),
    on: jest.fn(),
    off: jest.fn(),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    (DataLoader.loadRegions as jest.Mock).mockResolvedValue(mockRegions);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('initial state', () => {
    it('should start with empty regions', () => {
      const { result } = renderHook(() => useRegionLoading(null));

      expect(result.current.regions).toEqual([]);
    });
  });

  describe('with map', () => {
    it('should load regions when map is provided', async () => {
      const { result } = renderHook(() => useRegionLoading(mockMap));

      await waitFor(() => {
        expect(DataLoader.loadRegions).toHaveBeenCalled();
      });

      expect(result.current.regions).toBeDefined();
    });

    it('should handle null map', () => {
      const { result } = renderHook(() => useRegionLoading(null));

      expect(result.current.regions).toEqual([]);
      expect(DataLoader.loadRegions).not.toHaveBeenCalled();
    });
  });

  describe('data structure', () => {
    it('should return regions as an array', async () => {
      const { result } = renderHook(() => useRegionLoading(mockMap));

      await waitFor(() => {
        expect(Array.isArray(result.current.regions)).toBe(true);
      });
    });
  });
});
