import { Regions } from '@/lib/types';
import { BoundsChecker } from './boundsChecker';

describe('BoundsChecker', () => {
  let boundsChecker: BoundsChecker;

  beforeEach(() => {
    boundsChecker = new BoundsChecker();
  });

  const createMockRegion = (
    id: string,
    coordinates: number[][][],
    type: 'Polygon' | 'MultiPolygon' = 'Polygon'
  ): Regions => ({
    id,
    name: `Region ${id}`,
    country: 'TEST',
    adminLevel: 1,
    geometry: {
      type,
      coordinates,
    } as any,
    properties: {},
  });

  describe('isInBounds', () => {
    const viewportBounds = {
      north: 51.0,
      south: 50.0,
      east: 15.0,
      west: 14.0,
    };

    it('should return true for region completely inside viewport', () => {
      const region = createMockRegion('region-1', [
        [
          [14.2, 50.2],
          [14.8, 50.2],
          [14.8, 50.8],
          [14.2, 50.8],
          [14.2, 50.2],
        ],
      ]);

      const result = boundsChecker.isInBounds(region, viewportBounds);

      expect(result).toBe(true);
    });

    it('should return true for region partially overlapping viewport', () => {
      const region = createMockRegion('region-2', [
        [
          [13.5, 49.5],
          [14.5, 49.5],
          [14.5, 50.5],
          [13.5, 50.5],
          [13.5, 49.5],
        ],
      ]);

      const result = boundsChecker.isInBounds(region, viewportBounds);

      expect(result).toBe(true);
    });

    it('should return false for region completely outside viewport', () => {
      const region = createMockRegion('region-3', [
        [
          [20.0, 55.0],
          [21.0, 55.0],
          [21.0, 56.0],
          [20.0, 56.0],
          [20.0, 55.0],
        ],
      ]);

      const result = boundsChecker.isInBounds(region, viewportBounds);

      expect(result).toBe(false);
    });

    it('should return true for region containing viewport', () => {
      const region = createMockRegion('region-4', [
        [
          [13.0, 49.0],
          [16.0, 49.0],
          [16.0, 52.0],
          [13.0, 52.0],
          [13.0, 49.0],
        ],
      ]);

      const result = boundsChecker.isInBounds(region, viewportBounds);

      expect(result).toBe(true);
    });

    it('should return false when region is north of viewport', () => {
      const region = createMockRegion('region-5', [
        [
          [14.0, 52.0],
          [15.0, 52.0],
          [15.0, 53.0],
          [14.0, 53.0],
          [14.0, 52.0],
        ],
      ]);

      const result = boundsChecker.isInBounds(region, viewportBounds);

      expect(result).toBe(false);
    });

    it('should return false when region is south of viewport', () => {
      const region = createMockRegion('region-6', [
        [
          [14.0, 48.0],
          [15.0, 48.0],
          [15.0, 49.0],
          [14.0, 49.0],
          [14.0, 48.0],
        ],
      ]);

      const result = boundsChecker.isInBounds(region, viewportBounds);

      expect(result).toBe(false);
    });

    it('should return false when region is east of viewport', () => {
      const region = createMockRegion('region-7', [
        [
          [16.0, 50.0],
          [17.0, 50.0],
          [17.0, 51.0],
          [16.0, 51.0],
          [16.0, 50.0],
        ],
      ]);

      const result = boundsChecker.isInBounds(region, viewportBounds);

      expect(result).toBe(false);
    });

    it('should return false when region is west of viewport', () => {
      const region = createMockRegion('region-8', [
        [
          [12.0, 50.0],
          [13.0, 50.0],
          [13.0, 51.0],
          [12.0, 51.0],
          [12.0, 50.0],
        ],
      ]);

      const result = boundsChecker.isInBounds(region, viewportBounds);

      expect(result).toBe(false);
    });

    it('should cache bounding box calculations', () => {
      const region = createMockRegion('region-cache', [
        [
          [14.0, 50.0],
          [15.0, 50.0],
          [15.0, 51.0],
          [14.0, 51.0],
          [14.0, 50.0],
        ],
      ]);

      // First call should calculate
      boundsChecker.isInBounds(region, viewportBounds);

      // Modify geometry (shouldn't affect cached result)
      region.geometry = {
        type: 'Polygon',
        coordinates: [
          [
            [10.0, 40.0],
            [11.0, 40.0],
            [11.0, 41.0],
            [10.0, 41.0],
            [10.0, 40.0],
          ],
        ],
      } as any;

      // Second call should use cache
      const result = boundsChecker.isInBounds(region, viewportBounds);

      expect(result).toBe(true); // Still uses cached bounds
    });

    it('should handle MultiPolygon geometry', () => {
      const multiPolygonRegion: Regions = {
        id: 'multi-region',
        name: 'Multi Region',
        country: 'TEST',
        adminLevel: 1,
        geometry: {
          type: 'MultiPolygon',
          coordinates: [
            [
              [
                [14.1, 50.1],
                [14.3, 50.1],
                [14.3, 50.3],
                [14.1, 50.3],
                [14.1, 50.1],
              ],
            ],
            [
              [
                [14.5, 50.5],
                [14.7, 50.5],
                [14.7, 50.7],
                [14.5, 50.7],
                [14.5, 50.5],
              ],
            ],
          ],
        } as any,
        properties: {},
      };

      const result = boundsChecker.isInBounds(multiPolygonRegion, viewportBounds);

      expect(result).toBe(true);
    });

    it('should return false for region with no geometry', () => {
      const invalidRegion: Regions = {
        id: 'invalid',
        name: 'Invalid Region',
        country: 'TEST',
        adminLevel: 1,
        geometry: null as any,
        properties: {},
      };

      const result = boundsChecker.isInBounds(invalidRegion, viewportBounds);

      expect(result).toBe(false);
    });

    it('should return false for region with no coordinates', () => {
      const invalidRegion: Regions = {
        id: 'invalid',
        name: 'Invalid Region',
        country: 'TEST',
        adminLevel: 1,
        geometry: { type: 'Polygon' } as any,
        properties: {},
      };

      const result = boundsChecker.isInBounds(invalidRegion, viewportBounds);

      expect(result).toBe(false);
    });

    it('should handle edge touching cases', () => {
      const region = createMockRegion('region-edge', [
        [
          [14.0, 50.0],
          [15.0, 50.0],
          [15.0, 51.0],
          [14.0, 51.0],
          [14.0, 50.0],
        ],
      ]);

      const result = boundsChecker.isInBounds(region, viewportBounds);

      expect(result).toBe(true);
    });
  });

  describe('clearCache', () => {
    it('should clear the bounding box cache', () => {
      const region = createMockRegion('region-clear', [
        [
          [14.0, 50.0],
          [15.0, 50.0],
          [15.0, 51.0],
          [14.0, 51.0],
          [14.0, 50.0],
        ],
      ]);

      const bounds = {
        north: 51.0,
        south: 50.0,
        east: 15.0,
        west: 14.0,
      };

      // Calculate and cache
      boundsChecker.isInBounds(region, bounds);

      // Clear cache
      boundsChecker.clearCache();

      // Modify geometry
      region.geometry = {
        type: 'Polygon',
        coordinates: [
          [
            [20.0, 55.0],
            [21.0, 55.0],
            [21.0, 56.0],
            [20.0, 56.0],
            [20.0, 55.0],
          ],
        ],
      } as any;

      // Should recalculate with new geometry
      const result = boundsChecker.isInBounds(region, bounds);

      expect(result).toBe(false);
    });
  });
});
