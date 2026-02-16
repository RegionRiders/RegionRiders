import { getApiUrl } from '@/lib/client';
import { PerformanceConfig } from '@/lib/config/performanceConfig';
import { createComponentLogger } from '@/lib/logger/client';
import { GPXTrack } from '@/lib/types';
import { loadAllWithLimit } from '@/lib/utils/concurrentLoader';
import { GPXCache } from '../cache/gpxCache';

const logger = createComponentLogger('GPXLoader');

/**
 * handles loading and parsing of gpx track files with caching and concurrency control
 */
export class GPXLoader {
  private static cache = new GPXCache();

  /**
   * loads gpx tracks from local storage or strava api
   *
   * @param source - data source, either 'local' files or 'api' integration
   * @param options - loading options (files, limit, offset)
   * @returns promise resolving to a map of parsed gpx tracks keyed by track id
   */
  static async loadTracks(
    source: 'local' | 'api' = 'api',
    options?: {
      files?: string[];
      limit?: number;
      offset?: number;
    }
  ): Promise<Map<string, GPXTrack>> {
    const startTime = performance.now();
    logger.info(`Loading GPX tracks from ${source}...`);

    const tracks =
      source === 'local' ? await this.loadFromLocal(options) : await this.loadFromAPI();

    const duration = (performance.now() - startTime).toFixed(2);
    logger.info(`Loaded ${tracks.size} tracks in ${duration}ms`);

    // Clean expired cache entries
    this.cache.cleanExpired();

    return tracks;
  }

  /**
   * loads gpx tracks from local file storage with caching and concurrency limits
   *
   * @param options - loading options
   * @returns promise resolving to map of parsed tracks
   * @internal
   */
  private static async loadFromLocal(options?: {
    files?: string[];
    limit?: number;
    offset?: number;
  }): Promise<Map<string, GPXTrack>> {
    let filesToLoad = options?.files;

    if (!filesToLoad || filesToLoad.length === 0) {
      filesToLoad = await this.getLocalFileList();
    }

    // Apply offset and limit for pagination
    const offset = options?.offset || 0;
    const limit = options?.limit || PerformanceConfig.GPX.INITIAL_LOAD_LIMIT;
    filesToLoad = filesToLoad.slice(offset, offset + limit);

    logger.info(`Loading ${filesToLoad.length} GPX files (offset: ${offset}, limit: ${limit})`);

    // load all tracks with concurrency control
    const results = await loadAllWithLimit(
      filesToLoad,
      (file) => this.cache.loadTrack(file),
      PerformanceConfig.GPX.MAX_CONCURRENT_LOADS
    );

    // process results into a Map
    const tracksMap = new Map<string, GPXTrack>();
    const errors: string[] = [];

    for (const result of results) {
      if (result.success) {
        // Use filename (without .gpx) as key
        const trackId = result.item.replace('.gpx', '');
        const localTrack = { ...result.result, name: trackId, id: trackId };
        tracksMap.set(trackId, localTrack);
      } else {
        const errorMsg = `Failed to load ${result.item}: ${result.error.message}`;
        errors.push(errorMsg);
        logger.error(errorMsg);
      }
    }

    if (errors.length > 0) {
      logger.warn(`${errors.length} files failed to load`);
    }

    // log cache stats
    const stats = this.cache.getStats();
    logger.debug(
      `Cache: ${stats.cachedTracks}/${stats.maxCapacity} tracks, ` +
        `${stats.expiredTracks} expired, ${stats.loadingTracks} loading`
    );

    return tracksMap;
  }

  /**
   * loads gpx data from strava api (not yet implemented)
   *
   * @returns promise resolving to array of tracks from api
   * @internal
   */
  private static async loadFromAPI(): Promise<Map<string, GPXTrack>> {
    logger.info('Loading from API...');
    // TODO: implement strava api integration
    return new Map();
  }

  /**
   * fetches list of available gpx files from api endpoint
   *
   * @returns promise resolving to array of gpx filenames
   * @internal
   */
  private static async getLocalFileList(): Promise<string[]> {
    try {
      const url = getApiUrl('/api/gpx-files');
      const response = await fetch(url);
      const data = await response.json();
      return data.files || [];
    } catch (error) {
      logger.warn(`Could not load GPX file list: ${error}`);
      return [];
    }
  }

  /**
   * Get total count of available files (for pagination)
   */
  static async getTotalFileCount(): Promise<number> {
    const files = await this.getLocalFileList();
    return files.length;
  }

  /**
   * clears gpx track cache
   */
  static clearCache(): void {
    this.cache.clear();
  }

  /**
   * gets cache statistics for debugging
   */
  static getCacheStats() {
    return this.cache.getStats();
  }
}
