import {
    getBoundingBox,
    pointInBoundingBox,
    clearBoundingBoxCache,
} from './boundingBox';
import type { GPXPoint } from '@/lib/types/types';

describe('boundingBox', () => {
    beforeEach(() => {
        clearBoundingBoxCache();
    });

    describe('getBoundingBox', () => {
        it('should compute bounding box for simple polygon', () => {
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

            const bbox = getBoundingBox('test-region', polygon);

            expect(bbox.minLat).toBe(0);
            expect(bbox.maxLat).toBe(10);
            expect(bbox.minLon).toBe(0);
            expect(bbox.maxLon).toBe(10);
        });

        it('should compute bounding box for MultiPolygon', () => {
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
                            [20, 10],
                            [20, 20],
                            [10, 20],
                            [10, 10],
                        ],
                    ],
                ],
            };

            const bbox = getBoundingBox('multi-region', multiPolygon);

            expect(bbox.minLat).toBe(0);
            expect(bbox.maxLat).toBe(20);
            expect(bbox.minLon).toBe(0);
            expect(bbox.maxLon).toBe(20);
        });

        it('should cache bounding boxes', () => {
            const polygon: GeoJSON.Polygon = {
                type: 'Polygon',
                coordinates: [
                    [
                        [0, 0],
                        [10, 10],
                        [0, 0],
                    ],
                ],
            };

            const bbox1 = getBoundingBox('cached-region', polygon);
            const bbox2 = getBoundingBox('cached-region', polygon);

            expect(bbox1).toBe(bbox2); // Same object reference due to caching
        });

        it('should handle polygon with holes', () => {
            const polygonWithHole: GeoJSON.Polygon = {
                type: 'Polygon',
                coordinates: [
                    [
                        [0, 0],
                        [20, 0],
                        [20, 20],
                        [0, 20],
                        [0, 0],
                    ],
                    [
                        [5, 5],
                        [15, 5],
                        [15, 15],
                        [5, 15],
                        [5, 5],
                    ],
                ],
            };

            const bbox = getBoundingBox('hole-region', polygonWithHole);

            expect(bbox.minLat).toBe(0);
            expect(bbox.maxLat).toBe(20);
            expect(bbox.minLon).toBe(0);
            expect(bbox.maxLon).toBe(20);
        });
    });

    describe('pointInBoundingBox', () => {
        const bbox = {
            minLat: 0,
            maxLat: 10,
            minLon: 0,
            maxLon: 10,
        };

        it('should return true for point inside bounding box', () => {
            const point: GPXPoint = { lat: 5, lon: 5 };
            expect(pointInBoundingBox(point, bbox)).toBe(true);
        });

        it('should return false for point outside bounding box', () => {
            const point: GPXPoint = { lat: 15, lon: 15 };
            expect(pointInBoundingBox(point, bbox)).toBe(false);
        });

        it('should return true for point on boundary', () => {
            const point: GPXPoint = { lat: 0, lon: 0 };
            expect(pointInBoundingBox(point, bbox)).toBe(true);
        });

        it('should return true for point at max boundary', () => {
            const point: GPXPoint = { lat: 10, lon: 10 };
            expect(pointInBoundingBox(point, bbox)).toBe(true);
        });

        it('should return false for point outside lat range', () => {
            const point: GPXPoint = { lat: 15, lon: 5 };
            expect(pointInBoundingBox(point, bbox)).toBe(false);
        });

        it('should return false for point outside lon range', () => {
            const point: GPXPoint = { lat: 5, lon: 15 };
            expect(pointInBoundingBox(point, bbox)).toBe(false);
        });
    });

    describe('clearBoundingBoxCache', () => {
        it('should clear the cache', () => {
            const polygon: GeoJSON.Polygon = {
                type: 'Polygon',
                coordinates: [
                    [
                        [0, 0],
                        [10, 10],
                        [0, 0],
                    ],
                ],
            };

            const bbox1 = getBoundingBox('clear-test', polygon);
            clearBoundingBoxCache();
            const bbox2 = getBoundingBox('clear-test', polygon);

            expect(bbox1).not.toBe(bbox2); // Different object references after cache clear
        });
    });
});
