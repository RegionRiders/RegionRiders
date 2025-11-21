// components/ActivityMap/hooks/useRegionLoading.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { GeoJSON } from 'geojson';
import { logger } from '@/lib/logger/client';
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
        expect(DataLoader.loadRegions as jest.Mock).toHaveBeenCalled();
      });

      expect(result.current.regions).toBeDefined();
    });

    it('should handle null map', () => {
      const { result } = renderHook(() => useRegionLoading(null));

      expect(result.current.regions).toEqual([]);
      expect(DataLoader.loadRegions as jest.Mock).not.toHaveBeenCalled();
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

  describe('error handling', () => {
    it('should handle loading errors gracefully', async () => {
      const error = new Error('Load failed');
      (DataLoader.loadRegions as jest.Mock).mockRejectedValue(error);

      renderHook(() => useRegionLoading(mockMap));

      await waitFor(() => {
        expect((logger as any).error).toHaveBeenCalledWith(
          `[useRegionLoading] Failed to load regions: ${error}`
        );
      });
    });
  });

  describe('stale result handling', () => {
    it('should ignore stale results when bounds changed during load', async () => {
      let resolveLoad: any;
      const loadPromise = new Promise((resolve) => {
        resolveLoad = resolve;
      });

      // Mock loadRegions to delay resolution so we can change bounds during load
      (DataLoader.loadRegions as jest.Mock).mockReturnValue(loadPromise);

      mockMap.getBounds
        .mockReturnValueOnce({
          getNorth: jest.fn(() => 52),
          getSouth: jest.fn(() => 50),
          getEast: jest.fn(() => 12),
          getWest: jest.fn(() => 10),
        })
        .mockReturnValueOnce({
          getNorth: jest.fn(() => 53),
          getSouth: jest.fn(() => 51),
          getEast: jest.fn(() => 13),
          getWest: jest.fn(() => 11),
        });

      renderHook(() => useRegionLoading(mockMap));

      // Wait for first call to start
      await waitFor(() => {
        expect(DataLoader.loadRegions as jest.Mock).toHaveBeenCalledTimes(1);
      });

      // Simulate a second load request (which updates lastBoundsRef)
      mockMap.getBounds.mockReturnValue({
        getNorth: jest.fn(() => 53),
        getSouth: jest.fn(() => 51),
        getEast: jest.fn(() => 13),
        getWest: jest.fn(() => 11),
      });

      // Trigger moveend to start a new load
      const moveEndHandler = mockMap.on.mock.calls.find((call: any) => call[0] === 'moveend')?.[1];
      if (moveEndHandler) {
        moveEndHandler();
        jest.advanceTimersByTime(800);
      }

      // Now resolve the first load (which should be stale)
      resolveLoad(mockRegions);

      await waitFor(() => {
        expect((logger as any).debug).toHaveBeenCalledWith(
          '[useRegionLoading] Ignoring stale region load'
        );
      });
    });
  });
});
