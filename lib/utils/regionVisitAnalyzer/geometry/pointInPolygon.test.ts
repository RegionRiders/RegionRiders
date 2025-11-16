import type { GPXPoint } from '@/lib/types/types';
import { pointInPolygon } from './pointInPolygon';

describe('pointInPolygon', () => {
  describe('Polygon tests', () => {
    const simpleSquare: GeoJSON.Polygon = {
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

    it('should return true for point inside square', () => {
      const point: GPXPoint = { lat: 5, lon: 5 };
      expect(pointInPolygon(point, simpleSquare)).toBe(true);
    });

    it('should return false for point outside square', () => {
      const point: GPXPoint = { lat: 15, lon: 15 };
      expect(pointInPolygon(point, simpleSquare)).toBe(false);
    });

    it('should handle point on edge', () => {
      const point: GPXPoint = { lat: 0, lon: 5 };
      const result = pointInPolygon(point, simpleSquare);
      expect(typeof result).toBe('boolean');
    });

    it('should handle point at corner', () => {
      const point: GPXPoint = { lat: 0, lon: 0 };
      const result = pointInPolygon(point, simpleSquare);
      expect(typeof result).toBe('boolean');
    });

    it('should handle polygon with hole', () => {
      const polygonWithHole: GeoJSON.Polygon = {
        type: 'Polygon',
        coordinates: [
          // Outer ring
          [
            [0, 0],
            [20, 0],
            [20, 20],
            [0, 20],
            [0, 0],
          ],
          // Hole
          [
            [5, 5],
            [15, 5],
            [15, 15],
            [5, 15],
            [5, 5],
          ],
        ],
      };

      const pointInOuter: GPXPoint = { lat: 2, lon: 2 };
      const pointInHole: GPXPoint = { lat: 10, lon: 10 };

      expect(pointInPolygon(pointInOuter, polygonWithHole)).toBe(true);
      expect(pointInPolygon(pointInHole, polygonWithHole)).toBe(false);
    });
  });

  describe('MultiPolygon tests', () => {
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

    it('should return false for point outside both polygons', () => {
      const point: GPXPoint = { lat: 7, lon: 7 };
      expect(pointInPolygon(point, multiPolygon)).toBe(false);
    });
  });

  describe('Edge cases', () => {
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

      const pointInside: GPXPoint = { lat: 5, lon: 5 };
      const pointOutside: GPXPoint = { lat: 20, lon: 20 };

      expect(pointInPolygon(pointInside, triangle)).toBe(true);
      expect(pointInPolygon(pointOutside, triangle)).toBe(false);
    });
  });
});
