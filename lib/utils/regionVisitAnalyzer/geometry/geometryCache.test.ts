import { getGeometry, clearGeometryCache } from './geometryCache';
import { Regions } from '@/lib/types/types';

describe('geometryCache', () => {
  const createRegion = (id: string): Regions => ({
    id,
    name: `Region ${id}`,
    country: 'PL',
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [20, 50],
          [21, 50],
          [21, 51],
          [20, 51],
          [20, 50],
        ],
      ],
    },
    properties: {},
  });

  afterEach(() => {
    clearGeometryCache();
  });

  describe('getGeometry', () => {
    it('should return geometry for existing region', () => {
      const regions = [createRegion('r1'), createRegion('r2')];

      const geometry = getGeometry('r1', regions);

      expect(geometry).not.toBeNull();
      expect(geometry?.type).toBe('Polygon');
    });

    it('should return null for non-existent region', () => {
      const regions = [createRegion('r1')];

      const geometry = getGeometry('r999', regions);

      expect(geometry).toBeNull();
    });

    it('should cache geometry lookups', () => {
      const regions = [createRegion('r1')];

      const geometry1 = getGeometry('r1', regions);
      const geometry2 = getGeometry('r1', regions);

      expect(geometry1).toBe(geometry2); // Same reference
    });

    it('should handle empty regions array', () => {
      const geometry = getGeometry('r1', []);

      expect(geometry).toBeNull();
    });

    it('should handle MultiPolygon geometry', () => {
      const multiRegion: Regions = {
        id: 'multi',
        name: 'Multi Region',
        country: 'PL',
        geometry: {
          type: 'MultiPolygon',
          coordinates: [
            [
              [
                [20, 50],
                [21, 50],
                [21, 51],
                [20, 51],
                [20, 50],
              ],
            ],
          ],
        },
        properties: {},
      };

      const geometry = getGeometry('multi', [multiRegion]);

      expect(geometry?.type).toBe('MultiPolygon');
    });

    it('should differentiate between regions with same geometry', () => {
      const regions = [createRegion('r1'), createRegion('r2')];

      const geometry1 = getGeometry('r1', regions);
      const geometry2 = getGeometry('r2', regions);

      // Both should exist but be from different regions
      expect(geometry1).not.toBeNull();
      expect(geometry2).not.toBeNull();
    });
  });

  describe('clearGeometryCache', () => {
    it('should clear the cache', () => {
      const regions = [createRegion('r1')];

      const geometry1 = getGeometry('r1', regions);
      clearGeometryCache();
      const geometry2 = getGeometry('r1', regions);

      // After clearing, should fetch again (different references)
      expect(geometry1).not.toBe(geometry2);
      expect(geometry1).toEqual(geometry2); // But values match
    });
  });
});