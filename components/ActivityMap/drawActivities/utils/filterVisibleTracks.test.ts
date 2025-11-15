import { filterVisibleTracks } from './filterVisibleTracks';
import { GPXTrack } from '@/lib/types/types';
import L from 'leaflet';

describe('filterVisibleTracks', () => {
  const createTrack = (id: string, points: Array<{ lat: number; lon: number }>): GPXTrack => ({
    id,
    name: `Track ${id}`,
    points,
    metadata: {},
  });

  const createBounds = (north: number, south: number, east: number, west: number) => {
    return {
      contains: (latlng: [number, number]) => {
        const [lat, lon] = latlng;
        return lat >= south && lat <= north && lon >= west && lon <= east;
      },
    } as L.LatLngBounds;
  };

  it('should return tracks within bounds', () => {
    const tracks = new Map([
      ['t1', createTrack('t1', [{ lat: 50.5, lon: 20.5 }])],
      ['t2', createTrack('t2', [{ lat: 51.5, lon: 21.5 }])],
    ]);

    const bounds = createBounds(52, 50, 22, 20);

    const result = filterVisibleTracks(tracks, bounds);

    expect(result).toHaveLength(2);
    expect(result[0][0]).toBe('t1');
    expect(result[1][0]).toBe('t2');
  });

  it('should filter out tracks outside bounds', () => {
    const tracks = new Map([
      ['t1', createTrack('t1', [{ lat: 50.5, lon: 20.5 }])],
      ['t2', createTrack('t2', [{ lat: 60.0, lon: 30.0 }])],
    ]);

    const bounds = createBounds(52, 50, 22, 20);

    const result = filterVisibleTracks(tracks, bounds);

    expect(result).toHaveLength(1);
    expect(result[0][0]).toBe('t1');
  });

  it('should include track if any point is within bounds', () => {
    const tracks = new Map([
      [
        't1',
        createTrack('t1', [
          { lat: 60.0, lon: 30.0 }, // Outside
          { lat: 50.5, lon: 20.5 }, // Inside
          { lat: 70.0, lon: 40.0 }, // Outside
        ]),
      ],
    ]);

    const bounds = createBounds(52, 50, 22, 20);

    const result = filterVisibleTracks(tracks, bounds);

    expect(result).toHaveLength(1);
  });

  it('should filter out tracks with no points', () => {
    const tracks = new Map([
      ['t1', createTrack('t1', [])],
      ['t2', createTrack('t2', [{ lat: 50.5, lon: 20.5 }])],
    ]);

    const bounds = createBounds(52, 50, 22, 20);

    const result = filterVisibleTracks(tracks, bounds);

    expect(result).toHaveLength(1);
    expect(result[0][0]).toBe('t2');
  });

  it('should filter out tracks with undefined points', () => {
    const tracks = new Map([
      ['t1', { ...createTrack('t1', []), points: undefined as any }],
      ['t2', createTrack('t2', [{ lat: 50.5, lon: 20.5 }])],
    ]);

    const bounds = createBounds(52, 50, 22, 20);

    const result = filterVisibleTracks(tracks, bounds);

    expect(result).toHaveLength(1);
    expect(result[0][0]).toBe('t2');
  });

  it('should return empty array for empty tracks map', () => {
    const tracks = new Map();
    const bounds = createBounds(52, 50, 22, 20);

    const result = filterVisibleTracks(tracks, bounds);

    expect(result).toHaveLength(0);
  });

  it('should handle tracks at boundary edges', () => {
    const tracks = new Map([
      ['t1', createTrack('t1', [{ lat: 50.0, lon: 20.0 }])],
      ['t2', createTrack('t2', [{ lat: 52.0, lon: 22.0 }])],
    ]);

    const bounds = createBounds(52, 50, 22, 20);

    const result = filterVisibleTracks(tracks, bounds);

    expect(result).toHaveLength(2);
  });

  it('should return track tuples with ID and track object', () => {
    const tracks = new Map([['t1', createTrack('t1', [{ lat: 50.5, lon: 20.5 }])]]);

    const bounds = createBounds(52, 50, 22, 20);

    const result = filterVisibleTracks(tracks, bounds);

    expect(result[0]).toHaveLength(2);
    expect(result[0][0]).toBe('t1');
    expect(result[0][1]).toMatchObject({
      id: 't1',
      name: 'Track t1',
    });
  });

  it('should preserve track order from Map', () => {
    const tracks = new Map([
      ['t1', createTrack('t1', [{ lat: 50.1, lon: 20.1 }])],
      ['t2', createTrack('t2', [{ lat: 50.2, lon: 20.2 }])],
      ['t3', createTrack('t3', [{ lat: 50.3, lon: 20.3 }])],
    ]);

    const bounds = createBounds(52, 50, 22, 20);

    const result = filterVisibleTracks(tracks, bounds);

    expect(result[0][0]).toBe('t1');
    expect(result[1][0]).toBe('t2');
    expect(result[2][0]).toBe('t3');
  });
});