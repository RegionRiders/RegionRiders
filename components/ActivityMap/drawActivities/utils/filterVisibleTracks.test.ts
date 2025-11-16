import L from 'leaflet';
import { filterVisibleTracks } from './filterVisibleTracks';
import { GPXTrack } from '@/lib/types/types';

describe('filterVisibleTracks', () => {
    const createBounds = (south: number, west: number, north: number, east: number) => {
        // Leaflet expects [[lat, lng], [lat, lng]] for southwest and northeast corners
        return L.latLngBounds([[south, west], [north, east]]);
    };

    const createTrack = (points: Array<{ lat: number; lon: number }>): GPXTrack => {
        return {
            points,
            name: 'Test Track',
            distance: 1000,
            movingTime: 600,
            totalTime: 600,
            elevationGain: 100,
            elevationLoss: 100,
        } as unknown as GPXTrack;
    };

    describe('basic filtering', () => {
        it('should include tracks fully within bounds', () => {
            const bounds = createBounds(50, 10, 52, 12);
            const tracks = new Map([
                ['track1', createTrack([
                    { lat: 51, lon: 11 },
                    { lat: 51.5, lon: 11.5 }
                ])]
            ]);

            const result = filterVisibleTracks(tracks, bounds);
            expect(result).toHaveLength(1);
            expect(result[0][0]).toBe('track1');
        });

        it('should exclude tracks completely outside bounds', () => {
            const bounds = createBounds(50, 10, 52, 12);
            const tracks = new Map([
                ['track1', createTrack([
                    { lat: 60, lon: 20 },
                    { lat: 61, lon: 21 }
                ])]
            ]);

            const result = filterVisibleTracks(tracks, bounds);
            expect(result).toHaveLength(0);
        });

        it('should include tracks partially within bounds', () => {
            const bounds = createBounds(50, 10, 52, 12);
            const tracks = new Map([
                ['track1', createTrack([
                    { lat: 49, lon: 9 },   // Outside
                    { lat: 51, lon: 11 },  // Inside
                    { lat: 53, lon: 13 }   // Outside
                ])]
            ]);

            const result = filterVisibleTracks(tracks, bounds);
            expect(result).toHaveLength(1);
        });
    });

    describe('edge cases', () => {
        it('should filter tracks with no points', () => {
            const bounds = createBounds(50, 10, 52, 12);
            const tracks = new Map([
                ['track1', createTrack([])],
                ['track2', createTrack([{ lat: 51, lon: 11 }])]
            ]);

            const result = filterVisibleTracks(tracks, bounds);
            expect(result).toHaveLength(1);
            expect(result[0][0]).toBe('track2');
        });

        it('should handle tracks with undefined points', () => {
            const bounds = createBounds(50, 10, 52, 12);
            const tracks = new Map([
                ['track1', { ...createTrack([]), points: undefined as any }],
                ['track2', createTrack([{ lat: 51, lon: 11 }])]
            ]);

            const result = filterVisibleTracks(tracks, bounds);
            expect(result).toHaveLength(1);
            expect(result[0][0]).toBe('track2');
        });

        it('should return empty array for empty track map', () => {
            const bounds = createBounds(50, 10, 52, 12);
            const tracks = new Map();

            const result = filterVisibleTracks(tracks, bounds);
            expect(result).toHaveLength(0);
        });

        it('should handle track with single point on boundary', () => {
            const bounds = createBounds(50, 10, 52, 12);
            const tracks = new Map([
                ['track1', createTrack([{ lat: 50, lon: 10 }])]
            ]);

            const result = filterVisibleTracks(tracks, bounds);
            expect(result).toHaveLength(1);
        });
    });

    describe('multiple tracks', () => {
        it('should filter multiple tracks correctly', () => {
            const bounds = createBounds(50, 10, 52, 12);
            const tracks = new Map([
                ['inside1', createTrack([{ lat: 51, lon: 11 }])],
                ['outside1', createTrack([{ lat: 60, lon: 20 }])],
                ['inside2', createTrack([{ lat: 51.5, lon: 11.5 }])],
                ['outside2', createTrack([{ lat: 40, lon: 5 }])],
            ]);

            const result = filterVisibleTracks(tracks, bounds);
            expect(result).toHaveLength(2);
            expect(result.map(([id]) => id)).toEqual(['inside1', 'inside2']);
        });

        it('should preserve track data in filtered results', () => {
            const bounds = createBounds(50, 10, 52, 12);
            const track = createTrack([{ lat: 51, lon: 11 }]);
            const tracks = new Map([['track1', track]]);

            const result = filterVisibleTracks(tracks, bounds);
            expect(result[0][1]).toBe(track);
            expect(result[0][1].name).toBe('Test Track');
        });
    });

    describe('boundary conditions', () => {
        it('should include points exactly on boundary', () => {
            const bounds = createBounds(50, 10, 52, 12);
            const tracks = new Map([
                ['north', createTrack([{ lat: 52, lon: 11 }])],
                ['south', createTrack([{ lat: 50, lon: 11 }])],
                ['east', createTrack([{ lat: 51, lon: 12 }])],
                ['west', createTrack([{ lat: 51, lon: 10 }])],
            ]);

            const result = filterVisibleTracks(tracks, bounds);
            expect(result).toHaveLength(4);
        });

        it('should work with very small bounds', () => {
            const bounds = createBounds(51.0, 11.0, 51.001, 11.001);
            const tracks = new Map([
                ['inside', createTrack([{ lat: 51.0005, lon: 11.0005 }])],
                ['outside', createTrack([{ lat: 51.002, lon: 11.002 }])],
            ]);

            const result = filterVisibleTracks(tracks, bounds);
            expect(result).toHaveLength(1);
            expect(result[0][0]).toBe('inside');
        });
    });
});
