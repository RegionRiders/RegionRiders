import { GPXTrack, Regions } from '../types/types';
import { parseGPXFile } from '../utils/gpxParser';

interface CountryData {
    code: string;
    name: string;
    fileName: string;
    data?: Regions[];
    cachedAt?: number;
}

/**
 * Ultra-optimized data loader with:
 * - Viewport-based region culling (only load visible regions)
 * - Country file caching (avoid re-fetching)
 * - Efficient bounding box checks
 * - Progress tracking
 */
export class DataLoader {
    private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
    private static countryCache = new Map<string, CountryData>();
    private static loadingPromises = new Map<string, Promise<Regions[]>>();

    static async loadGPXTracks(
        source: 'local' | 'api' = 'local',
        files?: string[]
    ): Promise<GPXTrack[]> {
        const startTime = performance.now();
        console.log(`📂 [DataLoader] Loading GPX tracks from ${source}...`);

        if (source === 'api') {
            return this.loadFromAPI();
        }

        if (!files || files.length === 0) {
            files = await this.getLocalGPXFileList();
        }

        const tracks: GPXTrack[] = [];
        const errors: string[] = [];

        console.log(`📄 [DataLoader] Found ${files.length} GPX files to load`);

        for (const file of files) {
            try {
                const track = await parseGPXFile(`/data/gpx/${file}`);
                tracks.push(track);
                console.log(`✅ [DataLoader] Loaded: ${file} (${track.points.length} points)`);
            } catch (error) {
                const errorMsg = `Failed to load ${file}: ${error}`;
                errors.push(errorMsg);
                console.error(`❌ [DataLoader] ${errorMsg}`);
            }
        }

        const duration = (performance.now() - startTime).toFixed(2);
        console.log(`✅ [DataLoader] Loaded ${tracks.length} tracks in ${duration}ms`);

        if (errors.length > 0) {
            console.warn('⚠️ [DataLoader] Some files failed:', errors);
        }

        return tracks;
    }

    /**
     * Load ONLY regions visible in viewport (key optimization!)
     */
    static async loadregionsInViewport(
        bounds: { north: number; south: number; east: number; west: number },
        zoom?: number
    ): Promise<Regions[]> {
        const startTime = performance.now();
        console.log(`🗺️ [DataLoader] Loading regions in viewport (zoom=${zoom})...`);

        try {
            const countryFiles = await this.getAvailableCountries();
            const allregions: Regions[] = [];
            const errors: string[] = [];

            for (const country of countryFiles) {
                try {
                    // Load or use cached country data
                    const subs = await this.loadCountryRegions(country.fileName, country);

                    if (!subs || subs.length === 0) continue;

                    // Filter to only regions in viewport - MAJOR optimization!
                    const filtered = subs.filter((sub) => this.isInBounds(sub, bounds));

                    allregions.push(...filtered);

                    if (filtered.length > 0) {
                        console.log(`✅ ${country.name}: ${filtered.length}/${subs.length} in viewport`);
                    }
                } catch (error) {
                    const errorMsg = `Failed to load ${country.name}`;
                    errors.push(errorMsg);
                    console.error(`❌ [DataLoader] ${errorMsg}:`, error);
                }
            }

            const duration = (performance.now() - startTime).toFixed(2);
            console.log(`✅ [DataLoader] Loaded ${allregions.length} regions in viewport (${duration}ms)`);

            if (errors.length > 0) {
                console.warn(`⚠️ [DataLoader] ${errors.length} countries failed to load`);
            }

            return allregions;
        } catch (error) {
            console.error('❌ [DataLoader] Error loading regions:', error);
            return [];
        }
    }

    /**
     * Load all regions (for initial map state)
     */
    static async loadregions(
        bounds?: { north: number; south: number; east: number; west: number },
        zoom?: number,
        countries?: string[]
    ): Promise<Regions[]> {
        const startTime = performance.now();
        console.log(
            `🗺️ [DataLoader] Loading regions (zoom=${zoom}, countries=${countries?.join(',')})`
        );

        try {
            const countryFiles = await this.getAvailableCountries();

            // Filter by requested countries if specified
            let filesToLoad = countries
                ? countryFiles.filter((f) => countries.includes(f.code))
                : countryFiles;

            if (filesToLoad.length === 0) {
                console.warn('⚠️ [DataLoader] No matching country files found');
                return [];
            }

            const allregions: Regions[] = [];
            const errors: string[] = [];

            console.log(`📍 Loading ${filesToLoad.length} country files...`);

            for (const country of filesToLoad) {
                try {
                    const subs = await this.loadCountryRegions(country.fileName, country);
                    allregions.push(...subs);
                    console.log(`✅ Loaded ${country.name}: ${subs.length} regions`);
                } catch (error) {
                    const errorMsg = `Failed to load ${country.name}`;
                    errors.push(errorMsg);
                    console.error(`❌ [DataLoader] ${errorMsg}:`, error);
                }
            }

            // Optional: Filter by bounds if provided
            if (bounds) {
                const filteredSubs = allregions.filter((sub) => this.isInBounds(sub, bounds));
                console.log(`🔍 Filtered to ${filteredSubs.length} regions within bounds`);
                const duration = (performance.now() - startTime).toFixed(2);
                console.log(`✅ [DataLoader] Loaded ${filteredSubs.length} regions (${duration}ms)`);
                return filteredSubs;
            }

            const duration = (performance.now() - startTime).toFixed(2);
            console.log(
                `✅ [DataLoader] Loaded ${allregions.length} total regions (${duration}ms)`
            );

            if (errors.length > 0) {
                console.warn(`⚠️ [DataLoader] ${errors.length} countries failed to load`);
            }

            return allregions;
        } catch (error) {
            console.error('❌ [DataLoader] Error loading regions:', error);
            return [];
        }
    }

    /**
     * Get available countries configuration
     */
    private static async getAvailableCountries(): Promise<CountryData[]> {
        return [
            { code: 'PL', name: 'Poland', fileName: 'poland.geojson' },
            { code: 'SK', name: 'Slovakia', fileName: 'slovakia.geojson' },
            { code: 'HU', name: 'Hungary', fileName: 'hungary.geojson' },
            { code: 'DE', name: 'Germany', fileName: 'germany.geojson' },
            { code: 'FR', name: 'France', fileName: 'france.geojson' },
            { code: 'NL', name: 'Netherlands', fileName: 'netherlands.geojson' },
        ];
    }

    /**
     * Load country regions with caching to avoid re-fetching
     */
    private static async loadCountryRegions(
        fileName: string,
        country: CountryData
    ): Promise<Regions[]> {
        // Check if already loading (avoid duplicate requests)
        if (this.loadingPromises.has(fileName)) {
            console.log(`⏳ [DataLoader] Already loading ${country.name}, waiting...`);
            return this.loadingPromises.get(fileName)!;
        }

        // Check if cached and not expired
        const cached = this.countryCache.get(fileName);
        if (cached && cached.data && cached.cachedAt) {
            const age = Date.now() - cached.cachedAt;
            if (age < this.CACHE_TTL) {
                console.log(`📦 [DataLoader] Using cached ${country.name} (${(age / 1000).toFixed(1)}s old)`);
                return cached.data;
            }
        }

        // Fetch and cache
        const promise = (async () => {
            try {
                const response = await fetch(`/data/regions/${fileName}`);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const geojson = await response.json();

                const regions: Regions[] = geojson.features.map((feature: any) => ({
                    id: feature.id,
                    name: feature.properties?.name || 'Unknown',
                    country: feature.properties?.country_code || '',
                    adminLevel: feature.properties?.admin_level || 0,
                    geometry: feature.geometry,
                    properties: feature.properties || {},
                }));

                // Cache it
                this.countryCache.set(fileName, {
                    code: country.code,
                    name: country.name,
                    fileName,
                    data: regions,
                    cachedAt: Date.now(),
                });

                console.log(`💾 [DataLoader] Cached ${country.name}: ${regions.length} regions`);

                return regions;
            } catch (error) {
                console.error(`❌ [DataLoader] Error loading ${fileName}:`, error);
                return [];
            } finally {
                this.loadingPromises.delete(fileName);
            }
        })();

        this.loadingPromises.set(fileName, promise);
        return promise;
    }

    /**
     * Fast bounding box check (O(1) - just check first few points)
     */
    private static isInBounds(
        sub: Regions,
        bounds: { north: number; south: number; east: number; west: number }
    ): boolean {
        const geometry = sub.geometry as any;

        if (!geometry || !geometry.coordinates) return false;

        // Get first ring coordinates
        const coords =
            geometry.type === 'Polygon'
                ? geometry.coordinates[0]
                : geometry.type === 'MultiPolygon'
                    ? geometry.coordinates[0][0]
                    : [];

        if (coords.length === 0) return false;

        // Check only first 10 points for speed (good enough for viewport check)
        const sampleSize = Math.min(10, coords.length);
        const step = Math.max(1, Math.floor(coords.length / sampleSize));

        for (let i = 0; i < coords.length; i += step) {
            const [lon, lat] = coords[i];

            if (lat >= bounds.south && lat <= bounds.north && lon >= bounds.west && lon <= bounds.east) {
                return true;
            }
        }

        return false;
    }

    /**
     * Get local GPX file list from API
     */
    private static async getLocalGPXFileList(): Promise<string[]> {
        try {
            const response = await fetch('/api/gpx-files');
            const data = await response.json();
            return data.files || [];
        } catch {
            console.warn('⚠️ [DataLoader] Could not load GPX file list');
            return [];
        }
    }

    /**
     * Load from API (placeholder)
     */
    private static async loadFromAPI(): Promise<GPXTrack[]> {
        console.log('📡 [DataLoader] Loading from API...');
        return [];
    }

    /**
     * Clear all caches (call on app refresh)
     */
    static clearCache(): void {
        console.log('🧹 [DataLoader] Clearing all caches');
        this.countryCache.clear();
        this.loadingPromises.clear();
    }
}
