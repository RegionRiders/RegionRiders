import * as apiConfig from '@/lib/api/config';
import * as gpxParser from '@/lib/utils/gpxParser';
import { GPXCache } from './gpxCache';

jest.mock('@/lib/utils/gpxParser');
jest.mock('@/lib/api/config');

describe('GPXCache', () => {
  let cache: GPXCache;

  beforeEach(() => {
    cache = new GPXCache();
    jest.clearAllMocks();

    // Mock getApiUrl to return full URL
    (apiConfig.getApiUrl as jest.Mock).mockImplementation((path: string) => {
      return `http://localhost:3000${path}`;
    });
  });

  it('should load and cache a track', async () => {
    const mockTrack = {
      name: 'Test Track',
      id: 'test',
      points: [{ lat: 50, lon: 20, elevation: 100 }],
      distance: 1000,
      elevationGain: 50,
      elevationLoss: 30,
    };

    (gpxParser.parseGPXFile as jest.Mock).mockResolvedValue(mockTrack);

    const result = await cache.loadTrack('test.gpx');

    expect(result).toEqual(mockTrack);
    expect(apiConfig.getApiUrl).toHaveBeenCalledWith('/data/gpx/test.gpx');
    expect(gpxParser.parseGPXFile).toHaveBeenCalledWith('http://localhost:3000/data/gpx/test.gpx');
  });

  it('should return cached track on subsequent calls', async () => {
    const mockTrack = {
      name: 'Test Track',
      id: 'test',
      points: [{ lat: 50, lon: 20, elevation: 100 }],
      distance: 1000,
      elevationGain: 50,
      elevationLoss: 30,
    };

    (gpxParser.parseGPXFile as jest.Mock).mockResolvedValue(mockTrack);

    // First call
    await cache.loadTrack('test.gpx');
    // Second call
    const result = await cache.loadTrack('test.gpx');

    expect(result).toEqual(mockTrack);
    expect(gpxParser.parseGPXFile).toHaveBeenCalledTimes(1);
  });

  it('should handle errors', async () => {
    const mockError = new Error('Failed to load GPX');
    (gpxParser.parseGPXFile as jest.Mock).mockRejectedValue(mockError);

    await expect(cache.loadTrack('test.gpx')).rejects.toThrow('Failed to load GPX');
  });

  it('should clear cache', async () => {
    const mockTrack = {
      name: 'Test Track',
      id: 'test',
      points: [{ lat: 50, lon: 20, elevation: 100 }],
      distance: 1000,
      elevationGain: 50,
      elevationLoss: 30,
    };

    (gpxParser.parseGPXFile as jest.Mock).mockResolvedValue(mockTrack);

    await cache.loadTrack('test.gpx');
    cache.clear();
    await cache.loadTrack('test.gpx');

    expect(gpxParser.parseGPXFile).toHaveBeenCalledTimes(2);
  });
});
