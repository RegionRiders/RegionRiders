import { GPXTrack } from '@/lib/types';
import { GPXLoader } from './gpxLoader';

/**
 * main data loading service - facade for GPX track loading
 */
export class DataLoader {
  /**
   * loads gpx tracks from local storage or strava api
   */
  static async loadGPXTracks(
    source: 'local' | 'api' = 'api',
    files?: string[]
  ): Promise<Map<string, GPXTrack>> {
    return GPXLoader.loadTracks(source, files);
  }

  /**
   * clears cached gpx data
   */
  static clearCache(): void {
    GPXLoader.clearCache();
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
