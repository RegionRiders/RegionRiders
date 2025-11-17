// components/ActivityMap/hooks/useRegionAnalysis.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { GeoJSON } from 'geojson';
import { logger } from '@/lib/logger/client';
import { analyzeRegionVisitsAsync } from '@/lib/utils/regionVisitAnalyzer';
import { useRegionAnalysis } from './useRegionAnalysis';

// Mock the analyzer
jest.mock('@/lib/utils/regionVisitAnalyzer', () => ({
  analyzeRegionVisitsAsync: jest.fn(() =>
    Promise.resolve(
      new Map([
        [
          'region1',
          {
            regionId: 'region1',
            regionName: 'Test Region',
            visitCount: 1,
            trackIds: ['track1'],
            visited: true,
            geometry: { type: 'Polygon', coordinates: [] },
          },
        ],
      ])
    )
  ),
}));

// Mock logger
jest.mock('@/lib/logger/client', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('useRegionAnalysis', () => {
  const mockTracks = new Map([
    [
      'track1',
      {
        id: 'track1',
        points: [
          {
            lat: 50,
            lon: 10,
            ele: 100,
            time: new Date().toISOString(), // ✅ Changed to string
          },
        ],
        name: 'Test Track',
        distance: 1000,
        movingTime: 600,
        totalTime: 600,
        elevationGain: 100,
        elevationLoss: 50,
      },
    ],
  ]);

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
      country: 'Test Country',
      adminLevel: 1,
      properties: {},
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('initial state', () => {
    it('should start with empty visitData', () => {
      const { result } = renderHook(() => useRegionAnalysis(mockTracks, mockRegions));

      expect(result.current.visitData).toBeInstanceOf(Map);
      expect(result.current.visitData.size).toBe(0);
    });
  });

  describe('analysis', () => {
    it('should analyze regions when tracks and regions are provided', async () => {
      renderHook(() => useRegionAnalysis(mockTracks, mockRegions)); // ✅ Added missing renderHook

      // Fast-forward debounce timeout
      jest.advanceTimersByTime(500);

      await waitFor(() => {
        expect(analyzeRegionVisitsAsync).toHaveBeenCalled();
      });
    });

    it('should handle empty tracks', () => {
      const { result } = renderHook(() => useRegionAnalysis(new Map(), mockRegions));

      expect(result.current.visitData.size).toBe(0);
    });

    it('should handle empty regions', () => {
      const { result } = renderHook(() => useRegionAnalysis(mockTracks, []));

      expect(result.current.visitData.size).toBe(0);
    });

    it('should skip analysis when tracks and regions unchanged', () => {
      const { rerender } = renderHook(({ tracks, regions }) => useRegionAnalysis(tracks, regions), {
        initialProps: { tracks: mockTracks, regions: mockRegions },
      });

      // First render should trigger analysis
      jest.advanceTimersByTime(500);

      // Reset mock to check if called again
      (analyzeRegionVisitsAsync as jest.Mock).mockClear();

      // Rerender with same data
      rerender({ tracks: mockTracks, regions: mockRegions });

      jest.advanceTimersByTime(500);

      // Should not call analyze again
      expect(analyzeRegionVisitsAsync).not.toHaveBeenCalled();
    });

    it('should clear previous timeout when called again', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      const { rerender } = renderHook(({ tracks, regions }) => useRegionAnalysis(tracks, regions), {
        initialProps: { tracks: mockTracks, regions: mockRegions },
      });

      // Clear spy to check second call
      clearTimeoutSpy.mockClear();

      // Create new tracks to trigger re-analysis
      const newTracks = new Map(mockTracks);
      newTracks.set('track2', {
        id: 'track2',
        points: [
          {
            lat: 51,
            lon: 11,
            ele: 100,
            time: new Date().toISOString(),
          },
        ],
        name: 'Test Track 2',
        distance: 2000,
        movingTime: 600,
        totalTime: 600,
        elevationGain: 100,
        elevationLoss: 50,
      });

      // Rerender with new tracks - should clear previous timeout
      rerender({ tracks: newTracks, regions: mockRegions });

      // Should have called clearTimeout when setting new timeout
      expect(clearTimeoutSpy).toHaveBeenCalled();

      clearTimeoutSpy.mockRestore();
    });

    it('should handle analysis errors gracefully', async () => {
      const error = new Error('Analysis failed');
      (analyzeRegionVisitsAsync as jest.Mock).mockRejectedValue(error);

      renderHook(() => useRegionAnalysis(mockTracks, mockRegions));

      jest.advanceTimersByTime(500);

      await waitFor(() => {
        expect((logger as any).error).toHaveBeenCalledWith(
          '[useRegionAnalysis] Analysis failed:',
          error
        );
      });
    });
  });
});
