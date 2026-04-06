import { GPXTrack, Regions } from '@/lib/types';
import { analyzeRegionVisits, analyzeRegionVisitsAsync } from './regionVisitAnalyzer';

// No mocks – these are integration-style tests that exercise the real
// RegionSpatialIndex (rbush) + pointInPolygon logic end-to-end.

describe('regionVisitAnalyzer', () => {
  // A simple axis-aligned square region [14,50] – [15,51]
  const mockRegion: Regions = {
    id: 'region-1',
    name: 'Test Region',
    country: 'TEST',
    adminLevel: 1,
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
    },
    properties: {},
  };

  // Track whose points are clearly INSIDE the region
  const insideTrack: GPXTrack = {
    id: 'track-inside',
    name: 'Inside Track',
    points: [
      { lat: 50.5, lon: 14.5 },
      { lat: 50.6, lon: 14.6 },
    ],
    metadata: { distance: 10.0 },
  };

  // Track whose points are clearly OUTSIDE the region
  const outsideTrack: GPXTrack = {
    id: 'track-outside',
    name: 'Outside Track',
    points: [
      { lat: 52.0, lon: 16.0 },
      { lat: 53.0, lon: 17.0 },
    ],
    metadata: { distance: 5.0 },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('analyzeRegionVisits', () => {
    it('should return a Map of region visit data', () => {
      const result = analyzeRegionVisits([insideTrack], [mockRegion]);

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(1);
    });

    it('should mark a region as visited when a track point is inside it', () => {
      const result = analyzeRegionVisits([insideTrack], [mockRegion]);

      const visitData = result.get('region-1');
      expect(visitData).toBeDefined();
      expect(visitData?.visited).toBe(true);
      expect(visitData?.visitCount).toBe(1);
      expect(visitData?.trackIds).toContain('track-inside');
    });

    it('should NOT mark a region as visited when all track points are outside it', () => {
      const result = analyzeRegionVisits([outsideTrack], [mockRegion]);

      const visitData = result.get('region-1');
      expect(visitData).toBeDefined();
      expect(visitData?.visited).toBe(false);
      expect(visitData?.visitCount).toBe(0);
      expect(visitData?.trackIds).toEqual([]);
    });

    it('should initialize unvisited visit records for all regions', () => {
      const result = analyzeRegionVisits([outsideTrack], [mockRegion]);

      const visitData = result.get('region-1');
      expect(visitData?.regionId).toBe('region-1');
      expect(visitData?.regionName).toBe('Test Region');
      expect(visitData?.visited).toBe(false);
      expect(visitData?.visitCount).toBe(0);
      expect(visitData?.trackIds).toEqual([]);
    });

    it('should count each visiting track only once per region', () => {
      const result = analyzeRegionVisits([insideTrack, insideTrack], [mockRegion]);

      const visitData = result.get('region-1');
      expect(visitData?.visitCount).toBe(2);
      // Each call uses the same track id so the track should appear once
      expect(visitData?.trackIds).toHaveLength(1);
    });

    it('should record multiple distinct visiting tracks', () => {
      const secondInsideTrack: GPXTrack = {
        id: 'track-inside-2',
        name: 'Inside Track 2',
        points: [{ lat: 50.2, lon: 14.2 }],
        metadata: { distance: 2.0 },
      };

      const result = analyzeRegionVisits([insideTrack, secondInsideTrack], [mockRegion]);

      const visitData = result.get('region-1');
      expect(visitData?.visitCount).toBe(2);
      expect(visitData?.trackIds).toContain('track-inside');
      expect(visitData?.trackIds).toContain('track-inside-2');
    });

    it('should handle empty track list', () => {
      const result = analyzeRegionVisits([], [mockRegion]);

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(1);
      expect(result.get('region-1')?.visited).toBe(false);
    });

    it('should handle empty region list', () => {
      const result = analyzeRegionVisits([insideTrack], []);

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
    });

    it('should handle multiple regions – visited and unvisited', () => {
      const northRegion: Regions = {
        id: 'region-north',
        name: 'North Region',
        country: 'TEST',
        adminLevel: 1,
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [14.0, 52.0],
              [15.0, 52.0],
              [15.0, 53.0],
              [14.0, 53.0],
              [14.0, 52.0],
            ],
          ],
        },
        properties: {},
      };

      const result = analyzeRegionVisits([insideTrack], [mockRegion, northRegion]);

      expect(result.size).toBe(2);
      expect(result.get('region-1')?.visited).toBe(true);
      expect(result.get('region-north')?.visited).toBe(false);
    });

    it('should include geometry in visit data', () => {
      const result = analyzeRegionVisits([insideTrack], [mockRegion]);

      const visitData = result.get('region-1');
      expect(visitData?.geometry).toEqual(mockRegion.geometry);
    });

    it('should filter out tracks with no points', () => {
      const emptyTrack: GPXTrack = {
        id: 'empty',
        name: 'Empty Track',
        points: [],
        metadata: { distance: 0 },
      };

      const result = analyzeRegionVisits([insideTrack, emptyTrack], [mockRegion]);

      expect(result).toBeInstanceOf(Map);
      // insideTrack still registers the visit
      expect(result.get('region-1')?.visited).toBe(true);
    });

    it('should call progress callback with updates', () => {
      const onProgress = jest.fn();

      analyzeRegionVisits([insideTrack], [mockRegion], onProgress);

      expect(onProgress).toHaveBeenCalled();
      expect(onProgress).toHaveBeenCalledWith(expect.any(Number), expect.any(String));
    });

    it('should report 100% progress at completion', () => {
      const onProgress = jest.fn();

      analyzeRegionVisits([insideTrack], [mockRegion], onProgress);

      expect(onProgress).toHaveBeenCalledWith(100, expect.any(String));
    });

    it('should report progress during track processing', () => {
      const manyTracks = Array.from({ length: 20 }, (_, i) => ({
        ...insideTrack,
        id: `track-${i}`,
        name: `Track ${i}`,
      }));
      const onProgress = jest.fn();

      analyzeRegionVisits(manyTracks, [mockRegion], onProgress);

      expect(onProgress.mock.calls.length).toBeGreaterThan(2);
    });

    it('should measure execution time (progress message includes ms)', () => {
      const onProgress = jest.fn();

      analyzeRegionVisits([insideTrack], [mockRegion], onProgress);

      const lastCall = onProgress.mock.calls[onProgress.mock.calls.length - 1];
      expect(lastCall[1]).toMatch(/ms/);
    });

    it('should handle tracks without a points property gracefully', () => {
      const invalidTrack = { id: 'invalid', name: 'Invalid', metadata: {} } as GPXTrack;

      const result = analyzeRegionVisits([invalidTrack], [mockRegion]);

      expect(result).toBeInstanceOf(Map);
      expect(result.get('region-1')?.visited).toBe(false);
      expect(result.get('region-1')?.visitCount).toBe(0);
      expect(result.get('region-1')?.trackIds).toEqual([]);
    });

    it('should count multiple points from same track as single visit', () => {
      const multiPointTrack: GPXTrack = {
        id: 'track-multi-hit',
        name: 'Multi Hit Track',
        points: [
          { lat: 50.1, lon: 14.1 },
          { lat: 50.2, lon: 14.2 },
          { lat: 50.3, lon: 14.3 },
        ],
        metadata: { distance: 1.0 },
      };

      const result = analyzeRegionVisits([multiPointTrack], [mockRegion]);
      const visitData = result.get('region-1');

      expect(visitData?.visitCount).toBe(1);
      expect(visitData?.trackIds).toEqual(['track-multi-hit']);
    });

    it('should ignore regions with unsupported geometry when checking points', () => {
      const pointGeometryRegion: Regions = {
        id: 'region-point',
        name: 'Point Geometry',
        country: 'TEST',
        adminLevel: 1,
        geometry: {
          // Intentionally invalid for Regions geometry union to verify unsupported-shape handling.
          type: 'Point',
          coordinates: [14.5, 50.5],
        } as unknown as Regions['geometry'],
        properties: {},
      };

      const result = analyzeRegionVisits([insideTrack], [pointGeometryRegion]);
      const visitData = result.get('region-point');

      expect(visitData).toBeDefined();
      expect(visitData?.visited).toBe(false);
      expect(visitData?.visitCount).toBe(0);
      expect(visitData?.trackIds).toEqual([]);
    });
  });

  describe('analyzeRegionVisitsAsync', () => {
    it('should return a Promise', () => {
      const result = analyzeRegionVisitsAsync([insideTrack], [mockRegion]);

      expect(result).toBeInstanceOf(Promise);
    });

    it('should resolve to a Map with correct visit data', async () => {
      const result = await analyzeRegionVisitsAsync([insideTrack], [mockRegion]);

      expect(result).toBeInstanceOf(Map);
      expect(result.get('region-1')?.visited).toBe(true);
    });

    it('should resolve correctly when no tracks visit any region', async () => {
      const result = await analyzeRegionVisitsAsync([outsideTrack], [mockRegion]);

      expect(result.get('region-1')?.visited).toBe(false);
    });

    it('should call progress callback', async () => {
      const onProgress = jest.fn();

      await analyzeRegionVisitsAsync([insideTrack], [mockRegion], onProgress);

      expect(onProgress).toHaveBeenCalled();
    });

    it('should execute asynchronously (not resolved synchronously)', async () => {
      let resolved = false;
      const promise = analyzeRegionVisitsAsync([insideTrack], [mockRegion]).then(() => {
        resolved = true;
      });

      expect(resolved).toBe(false);
      await promise;
      expect(resolved).toBe(true);
    });
  });
});
