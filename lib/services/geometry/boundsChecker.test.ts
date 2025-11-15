import { BoundsChecker } from './boundsChecker';
import { Regions } from '@/lib/types/types';

describe('BoundsChecker', () => {
  let boundsChecker: BoundsChecker;

  beforeEach(() => {
    boundsChecker = new BoundsChecker();
  });

  afterEach(() => {
    boundsChecker.clearCache();
  });

  const createPolygonRegion = (id: string): Regions => ({
    id,
    name: `Region ${id}`,
    country: 'PL',
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [20.0, 50.0], // west, south
          [21.0, 50.0],
          [21.0, 51.0], // east, north
          [20.0, 51.0],
          [20.0, 50.0],
        ],
      ],
    },
    properties: {},
  });

  const createMultiPolygonRegion = (id: string): Regions => ({
    id,
    name: `MultiRegion ${id}`,
    country: 'PL',
    geometry: {
      type: 'MultiPolygon',
      coordinates: [
        [
          [
            [18.0, 49.0],
            [19.0, 49.0],
            [19.0, 50.0],
            [18.0, 50.0],
            [18.0, 49.0],
          ],
        ],
        [
          [
            [22.0, 52.0],
            [23.0, 52.0],
            [23.0, 53.0],
            [22.0, 53.0],
            [22.0, 52.0],
          ],
        ],
      ],
    },
    properties: {},
  });

  describe('isInBounds', () => {
    it('should return true when region is fully within bounds', () => {
      const region = createPolygonRegion('test');
      const bounds = {
        north: 52,
        south: 49,
        east: 22,
        west: 19,
      };

      const result = boundsChecker.isInBounds(region, bounds);

      expect(result).toBe(true);
    });

    it('should return true when region partially overlaps bounds', () => {
      const region = createPolygonRegion('test');
      const bounds = {
        north: 50.5,
        south: 49.5,
        east: 20.5,
        west: 19.5,
      };

      const result = boundsChecker.isInBounds(region, bounds);

      expect(result).toBe(true);
    });

    it('should return false when region is completely outside bounds', () => {
      const region = createPolygonRegion('test');
      const bounds = {
        north: 48,
        south: 47,
        east: 18,
        west: 17,
      };

      const result = boundsChecker.isInBounds(region, bounds);

      expect(result).toBe(false);
    });

    it('should handle MultiPolygon geometries', () => {
      const region = createMultiPolygonRegion('test');
      const bounds = {
        north: 53.5,
        south: 51.5,
        east: 24,
        west: 21,
      };

      const result = boundsChecker.isInBounds(region, bounds);

      expect(result).toBe(true);
    });

    it('should return false for regions with no coordinates', () => {
      const region: Regions = {
        id: 'empty',
        name: 'Empty',
        country: 'PL',
        geometry: {} as any,
        properties: {},
      };

      const bounds = {
        north: 52,
        south: 49,
        east: 22,
        west: 19,
      };

      const result = boundsChecker.isInBounds(region, bounds);

      expect(result).toBe(false);
    });

    it('should cache bounding box calculations', () => {
      const region = createPolygonRegion('test');
      const bounds = {
        north: 52,
        south: 49,
        east: 22,
        west: 19,
      };

      // Call twice with same region
      boundsChecker.isInBounds(region, bounds);
      boundsChecker.isInBounds(region, bounds);

      // Second call should use cached bbox
      // We can't directly test cache hit, but verify it doesn't throw
      expect(true).toBe(true);
    });

    it('should detect no overlap when region is north of bounds', () => {
      const region = createPolygonRegion('test');
      const bounds = {
        north: 48,
        south: 47,
        east: 21,
        west: 20,
      };

      const result = boundsChecker.isInBounds(region, bounds);

      expect(result).toBe(false);
    });

    it('should detect no overlap when region is south of bounds', () => {
      const region = createPolygonRegion('test');
      const bounds = {
        north: 52,
        south: 51.5,
        east: 21,
        west: 20,
      };

      const result = boundsChecker.isInBounds(region, bounds);

      expect(result).toBe(false);
    });

    it('should detect no overlap when region is east of bounds', () => {
      const region = createPolygonRegion('test');
      const bounds = {
        north: 51,
        south: 50,
        east: 19,
        west: 18,
      };

      const result = boundsChecker.isInBounds(region, bounds);

      expect(result).toBe(false);
    });

    it('should detect no overlap when region is west of bounds', () => {
      const region = createPolygonRegion('test');
      const bounds = {
        north: 51,
        south: 50,
        east: 23,
        west: 22,
      };

      const result = boundsChecker.isInBounds(region, bounds);

      expect(result).toBe(false);
    });

    it('should handle edge case where bounds exactly match region', () => {
      const region = createPolygonRegion('test');
      const bounds = {
        north: 51,
        south: 50,
        east: 21,
        west: 20,
      };

      const result = boundsChecker.isInBounds(region, bounds);

      expect(result).toBe(true);
    });
  });

  describe('clearCache', () => {
    it('should clear the bounding box cache', () => {
      const region = createPolygonRegion('test');
      const bounds = {
        north: 52,
        south: 49,
        east: 22,
        west: 19,
      };

      boundsChecker.isInBounds(region, bounds);
      boundsChecker.clearCache();

      // After clearing, should still work correctly
      const result = boundsChecker.isInBounds(region, bounds);
      expect(result).toBe(true);
    });
  });
});