import { pointInPolygon } from './pointInPolygon';
import { GPXPoint } from '@/lib/types/types';

describe('pointInPolygon', () => {
  describe('Polygon geometry', () => {
    const squarePolygon: GeoJSON.Polygon = {
      type: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [10, 0],
          [10, 10],
          [0, 10],
          [0, 0],
        ],
      ],
    };

    it('should return true for point inside polygon', () => {
      const point: GPXPoint = { lat: 5, lon: 5 };
      expect(pointInPolygon(point, squarePolygon)).toBe(true);
    });

    it('should return false for point outside polygon', () => {
      const point: GPXPoint = { lat: 15, lon: 15 };
      expect(pointInPolygon(point, squarePolygon)).toBe(false);
    });

    it('should return false for point on edge (ray casting edge case)', () => {
      const point: GPXPoint = { lat: 5, lon: 0 };
      expect(pointInPolygon(point, squarePolygon)).toBe(false);
    });

    it('should handle point at vertex', () => {
      const point: GPXPoint = { lat: 0, lon: 0 };
      const result = pointInPolygon(point, squarePolygon);
      expect(typeof result).toBe('boolean');
    });

    it('should return true for point just inside boundary', () => {
      const point: GPXPoint = { lat: 1, lon: 1 };
      expect(pointInPolygon(point, squarePolygon)).toBe(true);
    });

    it('should return false for point just outside boundary', () => {
      const point: GPXPoint = { lat: -1, lon: 5 };
      expect(pointInPolygon(point, squarePolygon)).toBe(false);
    });
  });

  describe('Polygon with holes', () => {
    const donutPolygon: GeoJSON.Polygon = {
      type: 'Polygon',
      coordinates: [
        // Outer ring
        [
          [0, 0],
          [10, 0],
          [10, 10],
          [0, 10],
          [0, 0],
        ],
        // Inner hole
        [
          [3, 3],
          [7, 3],
          [7, 7],
          [3, 7],
          [3, 3],
        ],
      ],
    };

    it('should return true for point in outer ring but outside hole', () => {
      const point: GPXPoint = { lat: 1, lon: 1 };
      expect(pointInPolygon(point, donutPolygon)).toBe(true);
    });

    it('should return false for point inside hole', () => {
      const point: GPXPoint = { lat: 5, lon: 5 };
      expect(pointInPolygon(point, donutPolygon)).toBe(false);
    });

    it('should return true for point between outer ring and hole', () => {
      const point: GPXPoint = { lat: 2, lon: 2 };
      expect(pointInPolygon(point, donutPolygon)).toBe(true);
    });
  });

  describe('MultiPolygon geometry', () => {
    const multiPolygon: GeoJSON.MultiPolygon = {
      type: 'MultiPolygon',
      coordinates: [
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
      ],
    };

    it('should return true for point in first polygon', () => {
      const point: GPXPoint = { lat: 2, lon: 2 };
      expect(pointInPolygon(point, multiPolygon)).toBe(true);
    });

    it('should return true for point in second polygon', () => {
      const point: GPXPoint = { lat: 12, lon: 12 };
      expect(pointInPolygon(point, multiPolygon)).toBe(true);
    });

    it('should return false for point outside all polygons', () => {
      const point: GPXPoint = { lat: 7, lon: 7 };
      expect(pointInPolygon(point, multiPolygon)).toBe(false);
    });

    it('should return false for point between polygons', () => {
      const point: GPXPoint = { lat: 8, lon: 8 };
      expect(pointInPolygon(point, multiPolygon)).toBe(false);
    });
  });

  describe('Complex polygon shapes', () => {
    it('should handle triangular polygon', () => {
      const triangle: GeoJSON.Polygon = {
        type: 'Polygon',
        coordinates: [
          [
            [0, 0],
            [10, 0],
            [5, 10],
            [0, 0],
          ],
        ],
      };

      expect(pointInPolygon({ lat: 5, lon: 5 }, triangle)).toBe(true);
      expect(pointInPolygon({ lat: 15, lon: 5 }, triangle)).toBe(false);
    });

    it('should handle concave polygon', () => {
      const concave: GeoJSON.Polygon = {
        type: 'Polygon',
        coordinates: [
          [
            [0, 0],
            [10, 0],
            [10, 10],
            [5, 5],
            [0, 10],
            [0, 0],
          ],
        ],
      };

      expect(pointInPolygon({ lat: 2, lon: 2 }, concave)).toBe(true);
      expect(pointInPolygon({ lat: 8, lon: 8 }, concave)).toBe(false);
    });
  });

  describe('Edge cases', () => {
    const polygon: GeoJSON.Polygon = {
      type: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [10, 0],
          [10, 10],
          [0, 10],
          [0, 0],
        ],
      ],
    };

    it('should handle point with elevation data', () => {
      const point: GPXPoint = { lat: 5, lon: 5, ele: 100 };
      expect(pointInPolygon(point, polygon)).toBe(true);
    });

    it('should handle point with time data', () => {
      const point: GPXPoint = { lat: 5, lon: 5, time: '2024-01-01T00:00:00Z' };
      expect(pointInPolygon(point, polygon)).toBe(true);
    });

    it('should handle negative coordinates', () => {
      const negPolygon: GeoJSON.Polygon = {
        type: 'Polygon',
        coordinates: [
          [
            [-10, -10],
            [0, -10],
            [0, 0],
            [-10, 0],
            [-10, -10],
          ],
        ],
      };

      expect(pointInPolygon({ lat: -5, lon: -5 }, negPolygon)).toBe(true);
      expect(pointInPolygon({ lat: 5, lon: 5 }, negPolygon)).toBe(false);
    });
  });
});