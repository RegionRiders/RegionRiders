import { getApiUrl } from '@/lib/client';
import { createComponentLogger } from '@/lib/logger/client';
import { GPXTrack } from '@/lib/types';
import { GPXCache } from '../cache/gpxCache';

const logger = createComponentLogger('GPXLoader');

/**
 * handles loading and parsing of gpx track files with caching
 */
export class GPXLoader {
  private static cache = new GPXCache();
  
  // Memory safety limits
  private static readonly MAX_TRACKS_TO_LOAD = 100; // Prevent loading too many tracks
  private static readonly WARN_THRESHOLD = 50; // Warning threshold
  private static readonly BATCH_SIZE = 10; // Load tracks in batches
  private static readonly MAX_CONCURRENT = 5; // Max parallel file loads

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
    logger.info(`Loading GPX tracks from ${source}...`);

    const tracks = source === 'local' ? await this.loadFromLocal(files) : await this.loadFromAPI();

    const duration = (performance.now() - startTime).toFixed(2);
    
    if (tracks.size > this.WARN_THRESHOLD) {
      logger.warn(
        `Large track count: ${tracks.size} tracks loaded in ${duration}ms. ` +
        `This may impact performance during analysis.`
      );
    } else {
      logger.info(`Loaded ${tracks.size} tracks in ${duration}ms`);
    }

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

    // Apply limit to prevent memory issues
    if (filesToLoad.length > this.MAX_TRACKS_TO_LOAD) {
      logger.warn(
        `Track limit exceeded (${filesToLoad.length} > ${this.MAX_TRACKS_TO_LOAD}). ` +
        `Loading only first ${this.MAX_TRACKS_TO_LOAD} tracks to prevent memory issues.`
      );
      filesToLoad = filesToLoad.slice(0, this.MAX_TRACKS_TO_LOAD);
    }

    logger.info(`Found ${filesToLoad.length} GPX files to load`);

    // Load tracks in controlled batches to avoid overwhelming the browser
    const tracksMap = new Map<string, GPXTrack>();
    const errors: string[] = [];

    for (let i = 0; i < filesToLoad.length; i += this.BATCH_SIZE) {
      const batch = filesToLoad.slice(i, i + this.BATCH_SIZE);
      
      // Load batch with concurrency limit
      const batchResults = await this.loadBatchWithConcurrency(batch, this.MAX_CONCURRENT);
      
      // Process results
      for (const result of batchResults) {
        if (result.success) {
          const trackId = result.file.replace('.gpx', '');
          tracksMap.set(trackId, result.track);
        } else {
          const errorMsg = `Failed to load ${result.file}: ${result.error}`;
          errors.push(errorMsg);
          logger.error(`${errorMsg}`);
        }
      }
      
      // Log progress for large loads
      if (filesToLoad.length > 20 && i + this.BATCH_SIZE < filesToLoad.length) {
        logger.debug(`Loaded ${i + this.BATCH_SIZE}/${filesToLoad.length} tracks...`);
      }
    }

    if (errors.length > 0) {
      logger.warn(`${errors.length} files failed to load`);
    }

    // log cache stats
    const stats = this.cache.getStats();
    logger.debug(`Cache: ${stats.cachedTracks} cached, ${stats.loadingTracks} loading`);

    return tracksMap;
  }

  /**
   * Load a batch of files with concurrency control
   * @private
   */
  private static async loadBatchWithConcurrency(
    files: string[],
    maxConcurrent: number
  ): Promise<Array<{ success: true; track: GPXTrack; file: string } | { success: false; error: string; file: string }>> {
    const results: Array<{ success: true; track: GPXTrack; file: string } | { success: false; error: string; file: string }> = [];
    const queue = [...files];
    const inProgress: Promise<void>[] = [];

    while (queue.length > 0 || inProgress.length > 0) {
      // Start new loads up to concurrency limit
      while (inProgress.length < maxConcurrent && queue.length > 0) {
        const file = queue.shift()!;
        const promise = this.loadSingleTrack(file).then(result => {
          results.push(result);
        });
        inProgress.push(promise);
      }

      // Wait for at least one to complete
      if (inProgress.length > 0) {
        await Promise.race(inProgress);
        // Remove completed promises
        for (let i = inProgress.length - 1; i >= 0; i--) {
          const settled = await Promise.race([
            inProgress[i].then(() => true),
            Promise.resolve(false)
          ]);
          if (settled) {
            inProgress.splice(i, 1);
          }
        }
      }
    }

    return results;
  }

  /**
   * Load a single track file
   * @private
   */
  private static async loadSingleTrack(
    file: string
  ): Promise<{ success: true; track: GPXTrack; file: string } | { success: false; error: string; file: string }> {
    try {
      const track = await this.cache.loadTrack(file);
      const trackId = file.replace('.gpx', '');
      const localTrack = { ...track, name: trackId, id: trackId };
      return { success: true as const, track: localTrack, file };
    } catch (error) {
      return { success: false as const, error: String(error), file };
    }
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
  
  /**
   * Get memory usage statistics
   */
  static getStats() {
    const cacheStats = this.cache.getStats();
    return {
      ...cacheStats,
      maxTracks: this.MAX_TRACKS_TO_LOAD,
      warnThreshold: this.WARN_THRESHOLD,
    };
  }
}
