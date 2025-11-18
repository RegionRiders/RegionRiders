import { getApiUrl } from '@/lib/api';
import { logger } from '@/lib/logger/client';
import { GPXTrack } from '@/lib/types';
import { GPXCache } from '../cache/gpxCache';

/**
 * handles loading and parsing of gpx track files with caching
 */
export class GPXLoader {
  private static cache = new GPXCache();

  /**
   * loads gpx tracks from local storage or strava api
   *
   * @param source - data source, either 'local' files or 'api' integration
   * @param files - optional list of specific gpx filenames to load
   * @returns promise resolving to a map of parsed gpx tracks keyed by track id
   */
  static async loadTracks(
    source: 'local' | 'api' = 'api',
    files?: string[]
  ): Promise<Map<string, GPXTrack>> {
    const startTime = performance.now();
    logger.info(`[GPXLoader] Loading GPX tracks from ${source}...`);

    const tracks = source === 'local' ? await this.loadFromLocal(files) : await this.loadFromAPI();

    const duration = (performance.now() - startTime).toFixed(2);
    logger.info(`[GPXLoader] Loaded ${tracks.size} tracks in ${duration}ms`);

    return tracks;
  }

  /**
   * loads gpx tracks from local file storage with caching
   *
   * @param files - optional list of specific filenames to load
   * @returns promise resolving to an array of parsed tracks
   * @internal
   */
  private static async loadFromLocal(files?: string[]): Promise<Map<string, GPXTrack>> {
    let filesToLoad = files;
    if (!filesToLoad || filesToLoad.length === 0) {
      filesToLoad = await this.getLocalFileList();
    }

    logger.info(`[GPXLoader] Found ${filesToLoad.length} GPX files to load`);

    // load all tracks in parallel with caching
    const promises = filesToLoad.map(async (file) => {
      try {
        const track = await this.cache.loadTrack(file);

        // Set the name to the filename (without .gpx) for local files
        const trackId = file.replace('.gpx', '');
        const localTrack = { ...track, name: trackId, id: trackId };

        return { success: true as const, track: localTrack, file };
      } catch (error) {
        return { success: false as const, error: String(error), file };
      }
    });

    const results = await Promise.all(promises);

    // process results into a Map
    const tracksMap = new Map<string, GPXTrack>();
    const errors: string[] = [];

    for (const result of results) {
      if (result.success) {
        // Use filename (without .gpx) as key
        const trackId = result.file.replace('.gpx', '');
        tracksMap.set(trackId, result.track);
      } else {
        const errorMsg = `Failed to load ${result.file}: ${result.error}`;
        errors.push(errorMsg);
        logger.error(`[GPXLoader] ${errorMsg}`);
      }
    }

    if (errors.length > 0) {
      logger.warn(`[GPXLoader] ${errors.length} files failed: ${errors}`);
    }

    // log cache stats
    const stats = this.cache.getStats();
    logger.debug(`[GPXLoader] Cache: ${stats.cachedTracks} cached, ${stats.loadingTracks} loading`);

    return tracksMap;
  }

  /**
   * loads gpx data from strava api (not yet implemented)
   *
   * @returns promise resolving to array of tracks from api
   * @internal
   */
  private static async loadFromAPI(): Promise<Map<string, GPXTrack>> {
    logger.info('[GPXLoader] Loading from API...');
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
      logger.warn(`[GPXLoader] Could not load GPX file list: ${error}`);
      return [];
    }
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
