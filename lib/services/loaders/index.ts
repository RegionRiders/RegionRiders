import { GPXTrack, Regions } from '@/lib/types';
import { GPXLoader } from './gpxLoader';
import { RegionLoader } from './RegionLoader';

/**
 * main data loading service - facade for gpx and region loaders
 * @example
 * ```
 * const tracks = await DataLoader.loadGPXTracks('local', { limit: 50, offset: 0 });
 * const regions = await DataLoader.loadRegions(bounds);
 * ```
 */
export class DataLoader {
  /**
   * loads gpx tracks from local storage or strava api
   */
  static async loadGPXTracks(
    source: 'local' | 'api' = 'api',
    options?: {
      files?: string[];
      limit?: number;
      offset?: number;
    }
  ): Promise<Map<string, GPXTrack>> {
    return GPXLoader.loadTracks(source, options);
  }

  /**
   * Get total count of available tracks
   */
  static async getTotalTrackCount(): Promise<number> {
    return GPXLoader.getTotalFileCount();
  }

  /**
   * loads regions optionally filtered by bounds and countries
   */
  static async loadRegions(
    bounds?: { north: number; south: number; east: number; west: number },
    countries?: string[]
  ): Promise<Regions[]> {
    return RegionLoader.loadRegions(bounds, countries);
  }

  /**
   * clears all cached data (gpx tracks and regions)
   */
  static clearCache(): void {
    GPXLoader.clearCache();
    RegionLoader.clearCache();
  }

  /**
   * gets cache statistics for debugging
   */
  static getCacheStats() {
    return {
      gpx: GPXLoader.getCacheStats(),
    };
  }
}
