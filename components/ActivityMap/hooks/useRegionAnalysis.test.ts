// components/ActivityMap/hooks/useRegionAnalysis.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { GeoJSON } from 'geojson';
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
      country: 'Test Country', // ✅ Added required property
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
  });
});
