import { getApiUrl } from '@/lib/client';
import { createComponentLogger } from '@/lib/logger/client';
import { GPXTrack } from '@/lib/types';
import { parseGPXFile } from '@/lib/utils/gpxParser';
import { LRUCacheWithTTL } from '@/lib/utils/lruCache';
import { PerformanceConfig } from '@/lib/config/performanceConfig';

const logger = createComponentLogger('GPXCache');

/**
 * manages caching of gpx track files to avoid redundant parsing
 * implements LRU eviction and ttl-based expiration
 */
export class GPXCache {
  private trackCache = new LRUCacheWithTTL<string, GPXTrack>(
    PerformanceConfig.GPX.MAX_CACHED_TRACKS,
    PerformanceConfig.GPX.CACHE_TTL_MS
  );
  private loadingPromises = new Map<string, Promise<GPXTrack>>();

  /**
   * loads a single gpx file with automatic caching and deduplication
   *
   * @param fileName - name of the gpx file to load
   * @returns promise resolving to parsed gpx track
   */
  async loadTrack(fileName: string): Promise<GPXTrack> {
    // check if already loading to avoid duplicate requests
    if (this.loadingPromises.has(fileName)) {
      return this.loadingPromises.get(fileName)!;
    }

    // check if cached and not expired (LRU cache handles TTL)
    const cached = this.trackCache.get(fileName);
    if (cached) {
      logger.debug(`Cache hit: ${fileName}`);
      return cached;
    }

    // fetch and cache
    const promise = this.fetchAndCache(fileName);
    this.loadingPromises.set(fileName, promise);
    return promise;
  }

  /**
   * fetches and parses gpx file, then caches it
   *
   * @param fileName - gpx file name
   * @returns promise resolving to parsed track
   * @internal
   */
  private async fetchAndCache(fileName: string): Promise<GPXTrack> {
    try {
      const url = getApiUrl(`/data/gpx/${fileName}`);
      const track = await parseGPXFile(url);

      // cache it (LRU will auto-evict if needed)
      this.trackCache.set(fileName, track);

      logger.debug(`Cached ${fileName}: ${track.points.length} points`);

      return track;
    } catch (error) {
      logger.error(`Error loading ${fileName}: ${error}`);
      throw error;
    } finally {
      this.loadingPromises.delete(fileName);
    }
  }

  /**
   * gets cache statistics for debugging
   */
  getStats() {
    const stats = this.trackCache.getStats();
    return {
      cachedTracks: stats.size,
      expiredTracks: stats.expired,
      loadingTracks: this.loadingPromises.size,
      maxCapacity: PerformanceConfig.GPX.MAX_CACHED_TRACKS,
    };
  }

  /**
   * clears all cached track data and in-flight requests
   */
  clear(): void {
    logger.debug('Clearing cache');
    this.trackCache.clear();
    this.loadingPromises.clear();
  }

  /**
   * Remove expired entries to free memory
   */
  cleanExpired(): number {
    const removed = this.trackCache.cleanExpired();
    if (removed > 0) {
      logger.debug(`Cleaned ${removed} expired tracks`);
    }
    return removed;
  }
}
