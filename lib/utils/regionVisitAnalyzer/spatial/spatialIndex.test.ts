import type { Regions } from '@/lib/types';
import { RegionSpatialIndex } from './spatialIndex';

// Mock rbush module
jest.mock('rbush', () => {
  return class MockRBush<T extends { minX: number; minY: number; maxX: number; maxY: number }> {
    private items: T[] = [];

    load(items: T[]): this {
      this.items = items;
      return this;
    }

    search(bbox: { minX: number; minY: number; maxX: number; maxY: number }): T[] {
      return this.items.filter(
        (item) =>
          item.minX <= bbox.maxX &&
          item.maxX >= bbox.minX &&
          item.minY <= bbox.maxY &&
          item.maxY >= bbox.minY
      );
    }

    all(): T[] {
      return this.items;
    }
  };
});

describe('RegionSpatialIndex', () => {
  const createMockRegion = (id: string, coordinates: number[][][]): Regions => ({
    id,
    name: `Region ${id}`,
    country: 'TEST',
    adminLevel: 1,
    geometry: {
      type: 'Polygon',
      coordinates,
    },
    properties: {},
  });

  const createMockMultiPolygonRegion = (id: string, coordinates: number[][][][]): Regions => ({
    id,
    name: `Region ${id}`,
    country: 'TEST',
    adminLevel: 1,
    geometry: {
      type: 'MultiPolygon',
      coordinates,
    },
    properties: {},
  });

  describe('constructor', () => {
    it('should build index from empty regions array', () => {
      const index = new RegionSpatialIndex([]);
      expect(index.getSize()).toBe(0);
    });

    it('should build index from regions array', () => {
      const regions = [
        createMockRegion('1', [
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
            [0, 0],
          ],
        ]),
      ];

      const index = new RegionSpatialIndex(regions);
      expect(index.getSize()).toBe(1);
    });

    it('should build index from multiple regions', () => {
      const regions = [
        createMockRegion('1', [
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
            [0, 0],
          ],
        ]),
        createMockRegion('2', [
          [
            [5, 5],
            [6, 5],
            [6, 6],
            [5, 6],
            [5, 5],
          ],
        ]),
      ];

      const index = new RegionSpatialIndex(regions);
      expect(index.getSize()).toBe(2);
    });
  });

  describe('findCandidateRegions', () => {
    it('should find region containing point', () => {
      const regions = [
        createMockRegion('1', [
          [
            [0, 0],
            [10, 0],
            [10, 10],
            [0, 10],
            [0, 0],
          ],
        ]),
      ];

      const index = new RegionSpatialIndex(regions);
      const candidates = index.findCandidateRegions(5, 5);

      expect(candidates).toHaveLength(1);
      expect(candidates[0].id).toBe('1');
    });

    it('should return empty array for point outside all regions', () => {
      const regions = [
        createMockRegion('1', [
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
            [0, 0],
          ],
        ]),
      ];

      const index = new RegionSpatialIndex(regions);
      const candidates = index.findCandidateRegions(50, 50);

      expect(candidates).toHaveLength(0);
    });

    it('should find multiple candidate regions for overlapping bounding boxes', () => {
      const regions = [
        createMockRegion('1', [
          [
            [0, 0],
            [10, 0],
            [10, 10],
            [0, 10],
            [0, 0],
          ],
        ]),
        createMockRegion('2', [
          [
            [5, 5],
            [15, 5],
            [15, 15],
            [5, 15],
            [5, 5],
          ],
        ]),
      ];

      const index = new RegionSpatialIndex(regions);
      const candidates = index.findCandidateRegions(7, 7);

      expect(candidates).toHaveLength(2);
      expect(candidates.map((r) => r.id).sort()).toEqual(['1', '2']);
    });

    it('should find region at boundary', () => {
      const regions = [
        createMockRegion('1', [
          [
            [0, 0],
            [10, 0],
            [10, 10],
            [0, 10],
            [0, 0],
          ],
        ]),
      ];

      const index = new RegionSpatialIndex(regions);

      // Point on the boundary
      const candidates = index.findCandidateRegions(0, 0);
      expect(candidates).toHaveLength(1);
      expect(candidates[0].id).toBe('1');
    });

    it('should handle negative coordinates', () => {
      const regions = [
        createMockRegion('1', [
          [
            [-10, -10],
            [0, -10],
            [0, 0],
            [-10, 0],
            [-10, -10],
          ],
        ]),
      ];

      const index = new RegionSpatialIndex(regions);
      const candidates = index.findCandidateRegions(-5, -5);

      expect(candidates).toHaveLength(1);
      expect(candidates[0].id).toBe('1');
    });
  });

  describe('MultiPolygon geometry', () => {
    it('should handle MultiPolygon geometry', () => {
      const regions = [
        createMockMultiPolygonRegion('multi', [
          [
            [
              [0, 0],
              [5, 0],
              [5, 5],
              [0, 5],
              [0, 0],
            ],
          ],
          [
            [
              [10, 10],
              [15, 10],
              [15, 15],
              [10, 15],
              [10, 10],
            ],
          ],
        ]),
      ];

      const index = new RegionSpatialIndex(regions);
      expect(index.getSize()).toBe(1);

      // Point in first polygon
      const candidates1 = index.findCandidateRegions(2, 2);
      expect(candidates1).toHaveLength(1);
      expect(candidates1[0].id).toBe('multi');

      // Point in second polygon
      const candidates2 = index.findCandidateRegions(12, 12);
      expect(candidates2).toHaveLength(1);
      expect(candidates2[0].id).toBe('multi');
    });

    it('should calculate correct bounding box for MultiPolygon', () => {
      const regions = [
        createMockMultiPolygonRegion('multi', [
          [
            [
              [0, 0],
              [5, 0],
              [5, 5],
              [0, 5],
              [0, 0],
            ],
          ],
          [
            [
              [100, 100],
              [105, 100],
              [105, 105],
              [100, 105],
              [100, 100],
            ],
          ],
        ]),
      ];

      const index = new RegionSpatialIndex(regions);

      // Point between polygons (outside both but inside bounding box)
      const candidates = index.findCandidateRegions(50, 50);
      expect(candidates).toHaveLength(1); // Bounding box covers this area
    });
  });

  describe('getSize', () => {
    it('should return 0 for empty index', () => {
      const index = new RegionSpatialIndex([]);
      expect(index.getSize()).toBe(0);
    });

    it('should return correct count of indexed regions', () => {
      const regions = [
        createMockRegion('1', [
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
            [0, 0],
          ],
        ]),
        createMockRegion('2', [
          [
            [5, 5],
            [6, 5],
            [6, 6],
            [5, 6],
            [5, 5],
          ],
        ]),
        createMockRegion('3', [
          [
            [10, 10],
            [11, 10],
            [11, 11],
            [10, 11],
            [10, 10],
          ],
        ]),
      ];

      const index = new RegionSpatialIndex(regions);
      expect(index.getSize()).toBe(3);
    });
  });

  describe('edge cases', () => {
    it('should handle regions with polygons containing holes', () => {
      const regions = [
        createMockRegion('with-hole', [
          // Outer ring
          [
            [0, 0],
            [10, 0],
            [10, 10],
            [0, 10],
            [0, 0],
          ],
          // Hole (inner ring)
          [
            [3, 3],
            [7, 3],
            [7, 7],
            [3, 7],
            [3, 3],
          ],
        ]),
      ];

      const index = new RegionSpatialIndex(regions);
      expect(index.getSize()).toBe(1);

      // Point inside outer ring but outside hole
      const candidates = index.findCandidateRegions(1, 1);
      expect(candidates).toHaveLength(1);
    });

    it('should handle unsupported geometry type gracefully', () => {
      const regions = [
        {
          id: 'point',
          name: 'Point Region',
          country: 'TEST',
          adminLevel: 1,
          geometry: {
            type: 'Point',
            coordinates: [5, 5],
          },
          properties: {},
        } as unknown as Regions,
      ];

      const index = new RegionSpatialIndex(regions);
      // Should handle gracefully - either empty bounds or error handling
      expect(index.getSize()).toBe(1);
    });
  });
});
