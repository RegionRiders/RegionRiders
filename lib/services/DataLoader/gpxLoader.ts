import { GPXTrack } from '@/lib/types/types';
import { GPXCache } from '../cache/gpxCache';
import logger from "@/lib/utils/logger";

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
     * @returns promise resolving to an array of parsed gpx tracks
     */
    static async loadTracks(
        source: 'local' | 'api' = 'api',
        files?: string[]
    ): Promise<GPXTrack[]> {
        const startTime = performance.now();
        logger.info(`[GPXLoader] Loading GPX tracks from ${source}...`);

        const tracks = source === 'local'
            ? await this.loadFromLocal(files)
            : await this.loadFromAPI();

        const duration = (performance.now() - startTime).toFixed(2);
        logger.info(`[GPXLoader] Loaded ${tracks.length} tracks in ${duration}ms`);

        return tracks;
    }

    /**
     * loads gpx tracks from local file storage with caching
     *
     * @param files - optional list of specific filenames to load
     * @returns promise resolving to an array of parsed tracks
     * @internal
     */
    private static async loadFromLocal(files?: string[]): Promise<GPXTrack[]> {
        let filesToLoad = files;
        if (!filesToLoad || filesToLoad.length === 0) {
            filesToLoad = await this.getLocalFileList();
        }

        logger.info(`[GPXLoader] Found ${filesToLoad.length} GPX files to load`);

        // load all tracks in parallel with caching
        const promises = filesToLoad.map(async (file) => {
            try {
                const track = await this.cache.loadTrack(file);
                return { success: true as const, track, file };
            } catch (error) {
                return { success: false as const, error: String(error), file };
            }
        });

        const results = await Promise.all(promises);

        // process results
        const tracks: GPXTrack[] = [];
        const errors: string[] = [];

        for (const result of results) {
            if (result.success) {
                tracks.push(result.track);
            } else {
                const errorMsg = `Failed to load ${result.file}: ${result.error}`;
                errors.push(errorMsg);
                logger.error(`[GPXLoader] ${errorMsg}`);
            }
        }

        if (errors.length > 0) {
            logger.warn(`[GPXLoader] ${errors.length} files failed:`, errors);
        }

        // log cache stats
        const stats = this.cache.getStats();
        logger.debug(`[GPXLoader] Cache: ${stats.cachedTracks} cached, ${stats.loadingTracks} loading`);
        return tracks;
    }

    /**
     * loads gpx data from strava api (not yet implemented)
     *
     * @returns promise resolving to array of tracks from api
     * @internal
     */
    private static async loadFromAPI(): Promise<GPXTrack[]> {
        logger.info('[GPXLoader] Loading from API...');
        // TODO: implement strava api integration
        return [];
    }

    /**
     * fetches list of available gpx files from api endpoint
     *
     * @returns promise resolving to array of gpx filenames
     * @internal
     */
    private static async getLocalFileList(): Promise<string[]> {
        try {
            const response = await fetch('/api/gpx-files');
            const data = await response.json();
            return data.files || [];
        } catch {
            logger.warn('[GPXLoader] Could not load GPX file list');
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
