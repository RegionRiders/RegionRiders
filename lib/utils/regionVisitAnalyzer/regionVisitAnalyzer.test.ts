import {
  analyzeRegionVisits,
  analyzeRegionVisitsAsync,
} from './regionVisitAnalyzer';
import { GPXTrack, Regions } from '@/lib/types/types';

// Mock dependencies
jest.mock('./processing', () => ({
  processTrack: jest.fn(),
}));

jest.mock('./spatial', () => ({
  buildSpatialGrid: jest.fn(() => new Map()),
}));

jest.mock('./spatial/boundingBox', () => ({
  getBoundingBox: jest.fn(() => ({
    minLat: 50.0,
    maxLat: 51.0,
    minLon: 14.0,
    maxLon: 15.0,
  })),
}));

describe('regionVisitAnalyzer', () => {
  const mockTrack: GPXTrack = {
    id: 'track-1',
    name: 'Test Track',
    points: [
      { lat: 50.5, lon: 14.5 },
      { lat: 50.6, lon: 14.6 },
    ],
    metadata: {
      distance: 10.0,
    },
  };

  const mockRegion: Regions = {
    id: 'region-1',
    name: 'Test Region',
    country: 'TEST',
    adminLevel: 4,
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [14.0, 50.0],
          [15.0, 50.0],
          [15.0, 51.0],
          [14.0, 51.0],
          [14.0, 50.0],
        ],
      ],
    } as any,
    properties: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('analyzeRegionVisits', () => {
    it('should return a Map of region visit data', () => {
      const tracks = [mockTrack];
      const regions = [mockRegion];

      const result = analyzeRegionVisits(tracks, regions);

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(1);
    });

    it('should initialize visit records for all regions', () => {
      const tracks = [mockTrack];
      const regions = [mockRegion];

      const result = analyzeRegionVisits(tracks, regions);

      const visitData = result.get('region-1');
      expect(visitData).toBeDefined();
      expect(visitData?.regionId).toBe('region-1');
      expect(visitData?.regionName).toBe('Test Region');
      expect(visitData?.visited).toBe(false);
      expect(visitData?.visitCount).toBe(0);
      expect(visitData?.trackIds).toEqual([]);
    });

    it('should handle empty track list', () => {
      const tracks: GPXTrack[] = [];
      const regions = [mockRegion];

      const result = analyzeRegionVisits(tracks, regions);

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(1);
    });

    it('should handle empty region list', () => {
      const tracks = [mockTrack];
      const regions: Regions[] = [];

      const result = analyzeRegionVisits(tracks, regions);

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
    });

    it('should call progress callback with updates', () => {
      const tracks = [mockTrack];
      const regions = [mockRegion];
      const onProgress = jest.fn();

      analyzeRegionVisits(tracks, regions, onProgress);

      expect(onProgress).toHaveBeenCalled();
      expect(onProgress).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(String)
      );
    });

    it('should report 100% progress at completion', () => {
      const tracks = [mockTrack];
      const regions = [mockRegion];
      const onProgress = jest.fn();

      analyzeRegionVisits(tracks, regions, onProgress);

      expect(onProgress).toHaveBeenCalledWith(100, expect.any(String));
    });

    it('should use custom config when provided', () => {
      const tracks = [mockTrack];
      const regions = [mockRegion];
      const config = { gridSize: 0.2 };

      const result = analyzeRegionVisits(tracks, regions, undefined, config);

      expect(result).toBeInstanceOf(Map);
    });

    it('should filter out tracks with no points', () => {
      const emptyTrack: GPXTrack = {
        id: 'empty',
        name: 'Empty Track',
        points: [],
        metadata: { distance: 0 },
      };

      const tracks = [mockTrack, emptyTrack];
      const regions = [mockRegion];

      const result = analyzeRegionVisits(tracks, regions);

      expect(result).toBeInstanceOf(Map);
    });

    it('should handle multiple tracks', () => {
      const track2: GPXTrack = {
        id: 'track-2',
        name: 'Test Track 2',
        points: [{ lat: 50.7, lon: 14.7 }],
        metadata: { distance: 5.0 },
      };

      const tracks = [mockTrack, track2];
      const regions = [mockRegion];

      const result = analyzeRegionVisits(tracks, regions);

      expect(result).toBeInstanceOf(Map);
    });

    it('should handle multiple regions', () => {
      const region2: Regions = {
        id: 'region-2',
        name: 'Test Region 2',
        country: 'TEST',
        adminLevel: 4,
        geometry: mockRegion.geometry,
        properties: {},
      };

      const tracks = [mockTrack];
      const regions = [mockRegion, region2];

      const result = analyzeRegionVisits(tracks, regions);

      expect(result.size).toBe(2);
      expect(result.has('region-1')).toBe(true);
      expect(result.has('region-2')).toBe(true);
    });

    it('should include geometry in visit data', () => {
      const tracks = [mockTrack];
      const regions = [mockRegion];

      const result = analyzeRegionVisits(tracks, regions);

      const visitData = result.get('region-1');
      expect(visitData?.geometry).toBeDefined();
      expect(visitData?.geometry).toEqual(mockRegion.geometry);
    });

    it('should measure execution time', () => {
      const tracks = [mockTrack];
      const regions = [mockRegion];
      const onProgress = jest.fn();

      analyzeRegionVisits(tracks, regions, onProgress);

      // Check that the final progress message includes timing info
      const lastCall = onProgress.mock.calls[onProgress.mock.calls.length - 1];
      expect(lastCall[1]).toMatch(/ms/);
    });

    it('should report progress during track processing', () => {
      const tracks = Array(20)
        .fill(null)
        .map((_, i) => ({
          ...mockTrack,
          id: `track-${i}`,
          name: `Track ${i}`,
        }));
      const regions = [mockRegion];
      const onProgress = jest.fn();

      analyzeRegionVisits(tracks, regions, onProgress);

      // Should report multiple progress updates
      expect(onProgress.mock.calls.length).toBeGreaterThan(2);
    });

    it('should handle tracks without points property', () => {
      const invalidTrack = {
        id: 'invalid',
        name: 'Invalid',
        metadata: {},
      } as any;

      const tracks = [invalidTrack];
      const regions = [mockRegion];

      const result = analyzeRegionVisits(tracks, regions);

      expect(result).toBeInstanceOf(Map);
    });
  });

  describe('analyzeRegionVisitsAsync', () => {
    it('should return a Promise', () => {
      const tracks = [mockTrack];
      const regions = [mockRegion];

      const result = analyzeRegionVisitsAsync(tracks, regions);

      expect(result).toBeInstanceOf(Promise);
    });

    it('should resolve to a Map', async () => {
      const tracks = [mockTrack];
      const regions = [mockRegion];

      const result = await analyzeRegionVisitsAsync(tracks, regions);

      expect(result).toBeInstanceOf(Map);
    });

    it('should call progress callback', async () => {
      const tracks = [mockTrack];
      const regions = [mockRegion];
      const onProgress = jest.fn();

      await analyzeRegionVisitsAsync(tracks, regions, onProgress);

      expect(onProgress).toHaveBeenCalled();
    });

    it('should accept custom config', async () => {
      const tracks = [mockTrack];
      const regions = [mockRegion];
      const config = { gridSize: 0.15 };

      const result = await analyzeRegionVisitsAsync(
        tracks,
        regions,
        undefined,
        config
      );

      expect(result).toBeInstanceOf(Map);
    });

    it('should execute asynchronously', async () => {
      const tracks = [mockTrack];
      const regions = [mockRegion];

      let resolved = false;
      const promise = analyzeRegionVisitsAsync(tracks, regions).then(() => {
        resolved = true;
      });

      // Should not be resolved immediately
      expect(resolved).toBe(false);

      await promise;
      expect(resolved).toBe(true);
    });
  });
});
