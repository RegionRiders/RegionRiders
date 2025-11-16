// lib/utils/regionVisitAnalyzer/processing/trackProcessor.test.ts
import { processTrack } from './trackProcessor';
import { GPXTrack, Regions } from '@/lib/types/types';
import { GeoJSON } from 'geojson';
import { RegionVisitData, SpatialCell, BoundingBox } from '../types';

// Mock the geometry modules
jest.mock('../geometry/geometryCache', () => ({
    getGeometry: jest.fn()
}));

jest.mock('../geometry/pointInPolygon', () => ({
    pointInPolygon: jest.fn()
}));

jest.mock('../spatial/boundingBox', () => ({
    pointInBoundingBox: jest.fn()
}));

jest.mock('../spatial/spatialGrid', () => ({
    getAdjacentCells: jest.fn()
}));

import { getGeometry } from '../geometry/geometryCache';
import { pointInPolygon } from '../geometry/pointInPolygon';
import { pointInBoundingBox } from '../spatial/boundingBox';
import { getAdjacentCells } from '../spatial/spatialGrid';

describe('trackProcessor', () => {
    const mockGetGeometry = getGeometry as jest.MockedFunction<typeof getGeometry>;
    const mockPointInPolygon = pointInPolygon as jest.MockedFunction<typeof pointInPolygon>;
    const mockPointInBoundingBox = pointInBoundingBox as jest.MockedFunction<typeof pointInBoundingBox>;
    const mockGetAdjacentCells = getAdjacentCells as jest.MockedFunction<typeof getAdjacentCells>;

    const mockPolygon: GeoJSON.Polygon = {
        type: 'Polygon',
        coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]
    };

    // Helper functions
    const createTrack = (points: Array<{ lat: number; lon: number }>, id: string = 'track1'): GPXTrack => {
        return {
            id,
            points,
            name: 'Test Track',
        } as GPXTrack;
    };

    const createRegion = (id: string): Regions => {
        return {
            id,
            name: `Region ${id}`,
            geometry: mockPolygon,
        } as Regions;
    };

    const createSpatialCell = (regionIds: string[]): SpatialCell => {
        return { regionIds };
    };

    const createBoundingBox = (minLat: number, maxLat: number, minLon: number, maxLon: number): BoundingBox => {
        return { minLat, maxLat, minLon, maxLon };
    };

    const createVisitData = (regionId: string, regionName: string = 'Test Region'): RegionVisitData => {
        return {
            regionId,
            regionName,
            visitCount: 0,
            trackIds: [],
            visited: false,
            geometry: mockPolygon
        };
    };

    // Shared setup helper
    const setupTest = (options: {
        trackPoints: Array<{ lat: number; lon: number }>;
        gridCells?: Array<[string, string[]]>;
        regionIds?: string[];
    }) => {
        const { trackPoints, gridCells = [['cell_0_0', ['region1']]], regionIds = ['region1'] } = options;

        const track = createTrack(trackPoints);
        const grid = new Map<string, SpatialCell>(
            gridCells.map(([cell, ids]) => [cell, createSpatialCell(ids)])
        );
        const regionBounds = new Map<string, BoundingBox>(
            regionIds.map(id => [id, createBoundingBox(0, 1, 0, 1)])
        );
        const visitMap = new Map<string, RegionVisitData>(
            regionIds.map(id => [id, createVisitData(id)])
        );
        const regions: Regions[] = regionIds.map(createRegion);
        const config = { gridSize: 1 };

        return { track, grid, regionBounds, visitMap, regions, config };
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('basic processing', () => {
        it('should process track through single region', () => {
            const { track, grid, regionBounds, visitMap, regions, config } = setupTest({
                trackPoints: [{ lat: 0.5, lon: 0.5 }]
            });

            mockGetAdjacentCells.mockReturnValue(['cell_0_0']);
            mockPointInBoundingBox.mockReturnValue(true);
            mockGetGeometry.mockReturnValue(mockPolygon);
            mockPointInPolygon.mockReturnValue(true);

            processTrack(track, grid, regionBounds, visitMap, regions, config);

            expect(visitMap.get('region1')?.visitCount).toBe(1);
        });

        it('should not add region if point not in polygon', () => {
            const { track, grid, regionBounds, visitMap, regions, config } = setupTest({
                trackPoints: [{ lat: 0.5, lon: 0.5 }]
            });

            mockGetAdjacentCells.mockReturnValue(['cell_0_0']);
            mockPointInBoundingBox.mockReturnValue(true);
            mockGetGeometry.mockReturnValue(mockPolygon);
            mockPointInPolygon.mockReturnValue(false);

            processTrack(track, grid, regionBounds, visitMap, regions, config);

            expect(visitMap.get('region1')?.visitCount).toBe(0);
        });

        it('should skip region if not in bounding box', () => {
            const { track, grid, regionBounds, visitMap, regions, config } = setupTest({
                trackPoints: [{ lat: 5, lon: 5 }],
                gridCells: [['cell_5_5', ['region1']]]
            });

            mockGetAdjacentCells.mockReturnValue(['cell_5_5']);
            mockPointInBoundingBox.mockReturnValue(false);

            processTrack(track, grid, regionBounds, visitMap, regions, config);

            expect(mockGetGeometry).not.toHaveBeenCalled();
            expect(mockPointInPolygon).not.toHaveBeenCalled();
            expect(visitMap.get('region1')?.visitCount).toBe(0);
        });
    });

    describe('multiple regions', () => {
        it('should process track through multiple regions', () => {
            const { track, grid, regionBounds, visitMap, regions, config } = setupTest({
                trackPoints: [{ lat: 0.5, lon: 0.5 }, { lat: 2.5, lon: 2.5 }],
                gridCells: [['cell_0_0', ['region1']], ['cell_2_2', ['region2']]],
                regionIds: ['region1', 'region2']
            });

            // Update bounds for region2
            regionBounds.set('region2', createBoundingBox(2, 3, 2, 3));

            mockGetAdjacentCells.mockImplementation((lat, _lon) => {
                if (lat < 1) {
                    return ['cell_0_0'];
                }
                return ['cell_2_2'];
            });
            mockPointInBoundingBox.mockReturnValue(true);
            mockGetGeometry.mockReturnValue(mockPolygon);
            mockPointInPolygon.mockReturnValue(true);

            processTrack(track, grid, regionBounds, visitMap, regions, config);

            expect(visitMap.get('region1')?.visitCount).toBe(1);
            expect(visitMap.get('region2')?.visitCount).toBe(1);
        });

        it('should not double-count same region', () => {
            const { track, grid, regionBounds, visitMap, regions, config } = setupTest({
                trackPoints: [{ lat: 0.5, lon: 0.5 }, { lat: 0.6, lon: 0.6 }]
            });

            mockGetAdjacentCells.mockReturnValue(['cell_0_0']);
            mockPointInBoundingBox.mockReturnValue(true);
            mockGetGeometry.mockReturnValue(mockPolygon);
            mockPointInPolygon.mockReturnValue(true);

            processTrack(track, grid, regionBounds, visitMap, regions, config);

            expect(visitMap.get('region1')?.visitCount).toBe(1);
        });
    });

    describe('edge cases', () => {
        it('should handle track with no points', () => {
            const track = createTrack([]);
            const grid = new Map<string, SpatialCell>();
            const regionBounds = new Map<string, BoundingBox>();
            const visitMap = new Map<string, RegionVisitData>();
            const regions: Regions[] = [];
            const config = { gridSize: 1 };

            processTrack(track, grid, regionBounds, visitMap, regions, config);

            expect(visitMap.size).toBe(0);
        });

        it('should handle empty grid cell', () => {
            const { track, grid, regionBounds, visitMap, regions, config } = setupTest({
                trackPoints: [{ lat: 0.5, lon: 0.5 }],
                gridCells: [['cell_0_0', []]]
            });

            regionBounds.clear();
            visitMap.clear();
            regions.length = 0;

            mockGetAdjacentCells.mockReturnValue(['cell_0_0']);

            processTrack(track, grid, regionBounds, visitMap, regions, config);

            expect(visitMap.size).toBe(0);
        });

        it('should handle missing geometry', () => {
            const { track, grid, regionBounds, visitMap, regions, config } = setupTest({
                trackPoints: [{ lat: 0.5, lon: 0.5 }]
            });

            mockGetAdjacentCells.mockReturnValue(['cell_0_0']);
            mockPointInBoundingBox.mockReturnValue(true);
            mockGetGeometry.mockReturnValue(null);

            processTrack(track, grid, regionBounds, visitMap, regions, config);

            expect(visitMap.get('region1')?.visitCount).toBe(0);
        });

        it('should handle missing bounding box', () => {
            const { track, grid, regionBounds, visitMap, regions, config } = setupTest({
                trackPoints: [{ lat: 0.5, lon: 0.5 }]
            });

            regionBounds.clear();

            mockGetAdjacentCells.mockReturnValue(['cell_0_0']);

            processTrack(track, grid, regionBounds, visitMap, regions, config);

            expect(visitMap.get('region1')?.visitCount).toBe(0);
        });
    });
});
