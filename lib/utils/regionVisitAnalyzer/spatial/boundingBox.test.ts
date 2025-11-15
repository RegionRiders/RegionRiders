import { getBoundingBox, pointInBoundingBox, clearBoundingBoxCache } from './boundingBox';
import { GPXPoint } from '@/lib/types/types';

describe('boundingBox', () => {
  afterEach(() => {
    clearBoundingBoxCache();
  });

  describe('getBoundingBox', () => {
    it('should calculate bounding box for Polygon', () => {
      const polygon: GeoJSON.Polygon = {
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
      };

      const bbox = getBoundingBox('test-region', polygon);

      expect(bbox).toEqual({
        minLat: 50,
        maxLat: 51,
        minLon: 20,
        maxLon: 21,
      });
    });

    it('should calculate bounding box for MultiPolygon', () => {
      const multiPolygon: GeoJSON.MultiPolygon = {
        type: 'MultiPolygon',
        coordinates: [
          [
            [
              [18, 49],
              [19, 49],
              [19, 50],
              [18, 50],
              [18, 49],
            ],
          ],
          [
            [
              [22, 52],
              [23, 52],
              [23, 53],
              [22, 53],
              [22, 52],
            ],
          ],
        ],
      };

      const bbox = getBoundingBox('test-multi', multiPolygon);

      expect(bbox).toEqual({
        minLat: 49,
        maxLat: 53,
        minLon: 18,
        maxLon: 23,
      });
    });

    it('should cache bounding box calculations', () => {
      const polygon: GeoJSON.Polygon = {
        type: 'Polygon',
        coordinates: [
          [
            [20, 50],
            [21, 51],
            [20, 50],
          ],
        ],
      };

      const bbox1 = getBoundingBox('cached-region', polygon);
      const bbox2 = getBoundingBox('cached-region', polygon);

      expect(bbox1).toBe(bbox2); // Should be same reference
    });

    it('should handle polygon with holes', () => {
      const polygon: GeoJSON.Polygon = {
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
          // Inner hole (should not affect bounding box)
          [
            [3, 3],
            [7, 3],
            [7, 7],
            [3, 7],
            [3, 3],
          ],
        ],
      };

      const bbox = getBoundingBox('donut', polygon);

      expect(bbox).toEqual({
        minLat: 0,
        maxLat: 10,
        minLon: 0,
        maxLon: 10,
      });
    });

    it('should handle negative coordinates', () => {
      const polygon: GeoJSON.Polygon = {
        type: 'Polygon',
        coordinates: [
          [
            [-10, -20],
            [10, -20],
            [10, 20],
            [-10, 20],
            [-10, -20],
          ],
        ],
      };

      const bbox = getBoundingBox('negative', polygon);

      expect(bbox).toEqual({
        minLat: -20,
        maxLat: 20,
        minLon: -10,
        maxLon: 10,
      });
    });

    it('should handle single point polygon', () => {
      const polygon: GeoJSON.Polygon = {
        type: 'Polygon',
        coordinates: [
          [
            [20, 50],
            [20, 50],
            [20, 50],
          ],
        ],
      };

      const bbox = getBoundingBox('point', polygon);

      expect(bbox).toEqual({
        minLat: 50,
        maxLat: 50,
        minLon: 20,
        maxLon: 20,
      });
    });
  });

  describe('pointInBoundingBox', () => {
    const bbox = {
      minLat: 50,
      maxLat: 51,
      minLon: 20,
      maxLon: 21,
    };

    it('should return true for point inside bounding box', () => {
      const point: GPXPoint = { lat: 50.5, lon: 20.5 };
      expect(pointInBoundingBox(point, bbox)).toBe(true);
    });

    it('should return false for point outside bounding box', () => {
      const point: GPXPoint = { lat: 52, lon: 22 };
      expect(pointInBoundingBox(point, bbox)).toBe(false);
    });

    it('should return true for point on boundary', () => {
      const point: GPXPoint = { lat: 50, lon: 20 };
      expect(pointInBoundingBox(point, bbox)).toBe(true);
    });

    it('should return false for point below minimum latitude', () => {
      const point: GPXPoint = { lat: 49, lon: 20.5 };
      expect(pointInBoundingBox(point, bbox)).toBe(false);
    });

    it('should return false for point above maximum latitude', () => {
      const point: GPXPoint = { lat: 52, lon: 20.5 };
      expect(pointInBoundingBox(point, bbox)).toBe(false);
    });

    it('should return false for point left of minimum longitude', () => {
      const point: GPXPoint = { lat: 50.5, lon: 19 };
      expect(pointInBoundingBox(point, bbox)).toBe(false);
    });

    it('should return false for point right of maximum longitude', () => {
      const point: GPXPoint = { lat: 50.5, lon: 22 };
      expect(pointInBoundingBox(point, bbox)).toBe(false);
    });

    it('should handle point with elevation', () => {
      const point: GPXPoint = { lat: 50.5, lon: 20.5, ele: 100 };
      expect(pointInBoundingBox(point, bbox)).toBe(true);
    });

    it('should handle negative coordinates', () => {
      const negativeBbox = {
        minLat: -20,
        maxLat: -10,
        minLon: -30,
        maxLon: -20,
      };

      const point: GPXPoint = { lat: -15, lon: -25 };
      expect(pointInBoundingBox(point, negativeBbox)).toBe(true);
    });
  });

  describe('clearBoundingBoxCache', () => {
    it('should clear the cache', () => {
      const polygon: GeoJSON.Polygon = {
        type: 'Polygon',
        coordinates: [
          [
            [20, 50],
            [21, 51],
            [20, 50],
          ],
        ],
      };

      const bbox1 = getBoundingBox('test', polygon);
      clearBoundingBoxCache();
      const bbox2 = getBoundingBox('test', polygon);

      // After clearing, should recalculate (different object reference)
      expect(bbox1).not.toBe(bbox2);
      expect(bbox1).toEqual(bbox2); // But values should match
    });
  });
});