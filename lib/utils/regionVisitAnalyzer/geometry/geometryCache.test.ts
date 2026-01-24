import { GeoJSON } from 'geojson';
import { Regions } from '@/lib/types';
import { clearGeometryCache, getGeometry } from './geometryCache';

describe('geometryCache', () => {
  const createMockRegion = (id: string, geometry: any): Regions => {
    return {
      id,
      name: `Region ${id}`,
      geometry: geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon,
      properties: {},
    } as Regions;
  };

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

  beforeEach(() => {
    clearGeometryCache();
  });

  describe('basic functionality', () => {
    it('should return geometry for existing region', () => {
      const regions = [createMockRegion('region1', mockPolygon)];
      const result = getGeometry('region1', regions);

      expect(result).toEqual(mockPolygon);
    });

    it('should return null for non-existent region', () => {
      const regions = [createMockRegion('region1', mockPolygon)];
      const result = getGeometry('nonexistent', regions);

      expect(result).toBeNull();
    });

    it('should return null for empty regions array', () => {
      const result = getGeometry('region1', []);
      expect(result).toBeNull();
    });
  });

  describe('caching behavior', () => {
    it('should cache geometry after first lookup', () => {
      const regions = [createMockRegion('region1', mockPolygon)];

      // First call
      const result1 = getGeometry('region1', regions);

      // Second call should return cached value (same reference)
      const result2 = getGeometry('region1', regions);

      expect(result1).toBe(result2);
      expect(result1).toEqual(mockPolygon);
    });

    it('should not query regions array on cache hit', () => {
      const regions = [createMockRegion('region1', mockPolygon)];

      // Prime the cache
      getGeometry('region1', regions);

      // Remove the region from the array
      regions.length = 0;

      // Should still return cached value
      const result = getGeometry('region1', regions);
      expect(result).toEqual(mockPolygon);
    });

    it('should cache multiple regions independently', () => {
      const polygon1: GeoJSON.Polygon = {
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
      const polygon2: GeoJSON.Polygon = {
        type: 'Polygon',
        coordinates: [
          [
            [2, 2],
            [3, 2],
            [3, 3],
            [2, 3],
            [2, 2],
          ],
        ],
      };

      const regions = [
        createMockRegion('region1', polygon1),
        createMockRegion('region2', polygon2),
      ];

      const result1 = getGeometry('region1', regions);
      const result2 = getGeometry('region2', regions);

      expect(result1).toEqual(polygon1);
      expect(result2).toEqual(polygon2);
      expect(result1).not.toBe(result2);
    });
  });

  describe('cache clearing', () => {
    it('should clear cache when requested', () => {
      const regions = [createMockRegion('region1', mockPolygon)];

      // Prime the cache
      getGeometry('region1', regions);

      // Clear cache
      clearGeometryCache();

      // Remove region from array
      regions.length = 0;

      // Should return null since cache is cleared and region doesn't exist
      const result = getGeometry('region1', regions);
      expect(result).toBeNull();
    });

    it('should allow re-caching after clear', () => {
      const regions = [createMockRegion('region1', mockPolygon)];

      getGeometry('region1', regions);
      clearGeometryCache();

      const result = getGeometry('region1', regions);
      expect(result).toEqual(mockPolygon);
    });
  });

  describe('polygon types', () => {
    it('should handle Polygon geometry', () => {
      const polygon: GeoJSON.Polygon = {
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
      const regions = [createMockRegion('region1', polygon)];

      const result = getGeometry('region1', regions);
      expect(result?.type).toBe('Polygon');
    });

    it('should handle MultiPolygon geometry', () => {
      const multiPolygon: GeoJSON.MultiPolygon = {
        type: 'MultiPolygon',
        coordinates: [
          [
            [
              [0, 0],
              [1, 0],
              [1, 1],
              [0, 1],
              [0, 0],
            ],
          ],
          [
            [
              [2, 2],
              [3, 2],
              [3, 3],
              [2, 3],
              [2, 2],
            ],
          ],
        ],
      };
      const regions = [createMockRegion('region1', multiPolygon)];

      const result = getGeometry('region1', regions);
      expect(result?.type).toBe('MultiPolygon');
    });
  });

  describe('edge cases', () => {
    it('should handle region with null geometry', () => {
      const regions = [createMockRegion('region1', null)];
      const result = getGeometry('region1', regions);

      expect(result).toBeNull();
    });

    it('should handle duplicate region IDs (returns first match)', () => {
      const polygon1: GeoJSON.Polygon = {
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
      const polygon2: GeoJSON.Polygon = {
        type: 'Polygon',
        coordinates: [
          [
            [2, 2],
            [3, 2],
            [3, 3],
            [2, 3],
            [2, 2],
          ],
        ],
      };

      const regions = [
        createMockRegion('region1', polygon1),
        createMockRegion('region1', polygon2),
      ];

      const result = getGeometry('region1', regions);
      expect(result).toEqual(polygon1);
    });

    it('should handle special characters in region IDs', () => {
      const specialId = 'region-1_test.2024';
      const regions = [createMockRegion(specialId, mockPolygon)];

      const result = getGeometry(specialId, regions);
      expect(result).toEqual(mockPolygon);
    });
  });
});
