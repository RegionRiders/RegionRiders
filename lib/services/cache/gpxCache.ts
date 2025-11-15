import { GPXTrack } from '@/lib/types/types';
import { parseGPXFile } from '@/lib/utils/gpxParser';
import { logger } from '@/lib/logger';

interface GPXCacheEntry {
    track: GPXTrack;
    cachedAt: number;
}

/**
 * manages caching of gpx track files to avoid redundant parsing
 * implements ttl-based expiration and deduplication of concurrent requests
 */
export class GPXCache {
    private static readonly CACHE_TTL = 100 * 60 * 1000; // 100 minutes
    private trackCache = new Map<string, GPXCacheEntry>();
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

        // check if cached and not expired
        const cached = this.trackCache.get(fileName);
        if (cached) {
            const age = Date.now() - cached.cachedAt;
            if (age < GPXCache.CACHE_TTL) {
                return cached.track;
            }
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
            const track = await parseGPXFile(`/data/gpx/${fileName}`);

            // cache it
            this.trackCache.set(fileName, {
                track,
                cachedAt: Date.now(),
            });

            logger.debug(`[GPXCache] Cached ${fileName}: ${track.points.length} points`);

            return track;
        } catch (error) {
            logger.error(`[GPXCache] Error loading ${fileName}: ${error}`);
            throw error;
        } finally {
            this.loadingPromises.delete(fileName);
        }
    }

    /**
     * gets cache statistics for debugging
     */
    getStats() {
        return {
            cachedTracks: this.trackCache.size,
            loadingTracks: this.loadingPromises.size,
        };
    }

    /**
     * clears all cached track data and in-flight requests
     */
    clear(): void {
        logger.debug('[GPXCache] Clearing cache');
        this.trackCache.clear();
        this.loadingPromises.clear();
    }
}
