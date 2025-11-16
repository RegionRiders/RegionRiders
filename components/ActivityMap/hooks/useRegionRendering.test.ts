// components/ActivityMap/hooks/useRegionRendering.test.ts

import { renderHook } from '@testing-library/react';
import { useRegionRendering } from './useRegionRendering';
import { GeoJSON } from 'geojson';
import { Regions } from '@/lib/types/types';

// Mock the drawing function
jest.mock('../drawRegions/drawRegions', () => ({
    drawRegions: jest.fn(() => []),
}));

describe('useRegionRendering', () => {
    const mockMap = {
        on: jest.fn(),
        off: jest.fn(),
        invalidateSize: jest.fn(),
        getZoom: jest.fn(() => 10),
        hasLayer: jest.fn(() => false),
        removeLayer: jest.fn(),
    } as any;

    const mockPolygon: GeoJSON.Polygon = {
        type: 'Polygon',
        coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]
    };

    const mockRegion: Regions = {
        id: 'region1',
        name: 'Test Region',
        country: 'Test Country',
        geometry: mockPolygon,
        properties: {},
    };

    const mockRegionVisits = new Map([
        ['region1', {
            regionId: 'region1',
            regionName: 'Test Region',
            visitCount: 5,
            trackIds: ['track1'],
            visited: true,
            geometry: mockPolygon
        }]
    ]);

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('initialization', () => {
        it('should handle null map', () => {
            expect(() => {
                renderHook(() => useRegionRendering(null, [mockRegion], mockRegionVisits, true));
            }).not.toThrow();
        });

        it('should handle null region visits', () => {
            const emptyVisits = new Map();
            expect(() => {
                renderHook(() => useRegionRendering(mockMap, [mockRegion], emptyVisits, true));
            }).not.toThrow();
        });

        it('should handle empty regions', () => {
            expect(() => {
                renderHook(() => useRegionRendering(mockMap, [], mockRegionVisits, true));
            }).not.toThrow();
        });
    });

    describe('rendering', () => {
        it('should render regions when map and visits are provided', () => {
            expect(() => {
                renderHook(() => useRegionRendering(mockMap, [mockRegion], mockRegionVisits, true));
            }).not.toThrow();
        });
    });

    describe('dependencies', () => {
        it('should re-render when regionVisits change', () => {
            const { rerender } = renderHook(
                ({ visits }) => useRegionRendering(mockMap, [mockRegion], visits, true),
                { initialProps: { visits: mockRegionVisits } }
            );

            const newVisits = new Map([
                ['region1', {
                    regionId: 'region1',
                    regionName: 'Test Region',
                    visitCount: 5,
                    trackIds: ['track1'],
                    visited: true,
                    geometry: mockPolygon
                }],
                ['region2', {
                    regionId: 'region2',
                    regionName: 'Region 2',
                    visitCount: 3,
                    trackIds: ['track2'],
                    visited: true,
                    geometry: mockPolygon
                }]
            ]);

            expect(() => rerender({ visits: newVisits })).not.toThrow();
        });
    });
});
