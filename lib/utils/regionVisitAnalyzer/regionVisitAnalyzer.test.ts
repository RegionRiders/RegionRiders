import { analyzeRegionVisits, analyzeRegionVisitsAsync } from './regionVisitAnalyzer';
import { GPXTrack, Regions } from '@/lib/types/types';

describe('regionVisitAnalyzer', () => {
  const createTrack = (id: string, points: Array<{ lat: number; lon: number }>): GPXTrack => ({
    id,
    name: `Track ${id}`,
    points: points.map((p) => ({ ...p, ele: 100 })),
    metadata: { distance: 1000 },
  });

  const createRegion = (id: string, coords: number[][]): Regions => ({
    id,
    name: `Region ${id}`,
    country: 'PL',
    geometry: {
      type: 'Polygon',
      coordinates: [coords],
    },
    properties: {},
  });

  describe('analyzeRegionVisits', () => {
    it('should detect track visiting a region', () => {
      const tracks = [
        createTrack('t1', [
          { lat: 50.5, lon: 20.5 },
          { lat: 50.6, lon: 20.6 },
        ]),
      ];

      const regions = [
        createRegion('r1', [
          [20.0, 50.0],
          [21.0, 50.0],
          [21.0, 51.0],
          [20.0, 51.0],
          [20.0, 50.0],
        ]),
      ];

      const result = analyzeRegionVisits(tracks, regions);

      expect(result.size).toBe(1);
      const visit = result.get('r1');
      expect(visit?.visited).toBe(true);
      expect(visit?.visitCount).toBeGreaterThan(0);
      expect(visit?.trackIds).toContain('t1');
    });

    it('should not detect track outside region', () => {
      const tracks = [
        createTrack('t1', [
          { lat: 60.0, lon: 30.0 },
          { lat: 60.1, lon: 30.1 },
        ]),
      ];

      const regions = [
        createRegion('r1', [
          [20.0, 50.0],
          [21.0, 50.0],
          [21.0, 51.0],
          [20.0, 51.0],
          [20.0, 50.0],
        ]),
      ];

      const result = analyzeRegionVisits(tracks, regions);

      const visit = result.get('r1');
      expect(visit?.visited).toBe(false);
      expect(visit?.visitCount).toBe(0);
    });

    it('should handle multiple tracks visiting same region', () => {
      const tracks = [
        createTrack('t1', [{ lat: 50.5, lon: 20.5 }]),
        createTrack('t2', [{ lat: 50.6, lon: 20.6 }]),
      ];

      const regions = [
        createRegion('r1', [
          [20.0, 50.0],
          [21.0, 50.0],
          [21.0, 51.0],
          [20.0, 51.0],
          [20.0, 50.0],
        ]),
      ];

      const result = analyzeRegionVisits(tracks, regions);

      const visit = result.get('r1');
      expect(visit?.visited).toBe(true);
      expect(visit?.trackIds).toHaveLength(2);
      expect(visit?.trackIds).toContain('t1');
      expect(visit?.trackIds).toContain('t2');
    });

    it('should handle track visiting multiple regions', () => {
      const tracks = [
        createTrack('t1', [
          { lat: 50.5, lon: 20.5 },
          { lat: 52.5, lon: 22.5 },
        ]),
      ];

      const regions = [
        createRegion('r1', [
          [20.0, 50.0],
          [21.0, 50.0],
          [21.0, 51.0],
          [20.0, 51.0],
          [20.0, 50.0],
        ]),
        createRegion('r2', [
          [22.0, 52.0],
          [23.0, 52.0],
          [23.0, 53.0],
          [22.0, 53.0],
          [22.0, 52.0],
        ]),
      ];

      const result = analyzeRegionVisits(tracks, regions);

      expect(result.get('r1')?.visited).toBe(true);
      expect(result.get('r2')?.visited).toBe(true);
    });

    it('should handle empty tracks array', () => {
      const regions = [
        createRegion('r1', [
          [20.0, 50.0],
          [21.0, 51.0],
          [20.0, 50.0],
        ]),
      ];

      const result = analyzeRegionVisits([], regions);

      expect(result.size).toBe(1);
      expect(result.get('r1')?.visited).toBe(false);
    });

    it('should handle empty regions array', () => {
      const tracks = [createTrack('t1', [{ lat: 50.5, lon: 20.5 }])];

      const result = analyzeRegionVisits(tracks, []);

      expect(result.size).toBe(0);
    });

    it('should skip tracks with no points', () => {
      const tracks = [
        createTrack('t1', []),
        createTrack('t2', [{ lat: 50.5, lon: 20.5 }]),
      ];

      const regions = [
        createRegion('r1', [
          [20.0, 50.0],
          [21.0, 50.0],
          [21.0, 51.0],
          [20.0, 51.0],
          [20.0, 50.0],
        ]),
      ];

      const result = analyzeRegionVisits(tracks, regions);

      // Only t2 should be processed
      expect(result.get('r1')?.trackIds).toEqual(['t2']);
    });

    it('should call progress callback if provided', () => {
      const progressCallback = jest.fn();
      const tracks = [createTrack('t1', [{ lat: 50.5, lon: 20.5 }])];
      const regions = [
        createRegion('r1', [
          [20.0, 50.0],
          [21.0, 51.0],
          [20.0, 50.0],
        ]),
      ];

      analyzeRegionVisits(tracks, regions, progressCallback);

      expect(progressCallback).toHaveBeenCalled();
      expect(progressCallback).toHaveBeenCalledWith(100, expect.any(String));
    });

    it('should respect custom grid size config', () => {
      const tracks = [createTrack('t1', [{ lat: 50.5, lon: 20.5 }])];
      const regions = [
        createRegion('r1', [
          [20.0, 50.0],
          [21.0, 50.0],
          [21.0, 51.0],
          [20.0, 51.0],
          [20.0, 50.0],
        ]),
      ];

      const result = analyzeRegionVisits(tracks, regions, undefined, { gridSize: 0.05 });

      expect(result.size).toBe(1);
    });

    it('should not count same track twice for same region', () => {
      const tracks = [
        createTrack('t1', [
          { lat: 50.5, lon: 20.5 },
          { lat: 50.5, lon: 20.5 }, // Same point twice
        ]),
      ];

      const regions = [
        createRegion('r1', [
          [20.0, 50.0],
          [21.0, 50.0],
          [21.0, 51.0],
          [20.0, 51.0],
          [20.0, 50.0],
        ]),
      ];

      const result = analyzeRegionVisits(tracks, regions);

      expect(result.get('r1')?.trackIds).toHaveLength(1);
    });
  });

  describe('analyzeRegionVisitsAsync', () => {
    it('should return a promise', () => {
      const tracks = [createTrack('t1', [{ lat: 50.5, lon: 20.5 }])];
      const regions = [
        createRegion('r1', [
          [20.0, 50.0],
          [21.0, 51.0],
          [20.0, 50.0],
        ]),
      ];

      const result = analyzeRegionVisitsAsync(tracks, regions);

      expect(result).toBeInstanceOf(Promise);
    });

    it('should resolve with analysis results', async () => {
      const tracks = [createTrack('t1', [{ lat: 50.5, lon: 20.5 }])];
      const regions = [
        createRegion('r1', [
          [20.0, 50.0],
          [21.0, 50.0],
          [21.0, 51.0],
          [20.0, 51.0],
          [20.0, 50.0],
        ]),
      ];

      const result = await analyzeRegionVisitsAsync(tracks, regions);

      expect(result.size).toBe(1);
      expect(result.get('r1')?.visited).toBe(true);
    });

    it('should work with progress callback', async () => {
      const progressCallback = jest.fn();
      const tracks = [createTrack('t1', [{ lat: 50.5, lon: 20.5 }])];
      const regions = [
        createRegion('r1', [
          [20.0, 50.0],
          [21.0, 51.0],
          [20.0, 50.0],
        ]),
      ];

      await analyzeRegionVisitsAsync(tracks, regions, progressCallback);

      expect(progressCallback).toHaveBeenCalled();
    });
  });
});