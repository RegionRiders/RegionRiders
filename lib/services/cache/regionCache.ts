import { getApiUrl } from '@/lib/client';
import { PerformanceConfig } from '@/lib/config/performanceConfig';
import { createComponentLogger } from '@/lib/logger/client';
import { Regions } from '@/lib/types';
import { LRUCacheWithTTL } from '@/lib/utils/lruCache';

const logger = createComponentLogger('RegionCache');

export interface CountryData {
  code: string;
  name: string;
  fileName: string;
  data?: Regions[];
  cachedAt?: number;
}

/**
 * manages caching of country region data to avoid redundant network requests
 * implements LRU eviction and ttl-based expiration
 */
export class RegionCache {
  private countryCache = new LRUCacheWithTTL<string, Regions[]>(
    PerformanceConfig.REGIONS.MAX_CACHED_COUNTRIES,
    PerformanceConfig.REGIONS.CACHE_TTL_MS
  );
  private loadingPromises = new Map<string, Promise<Regions[]>>();
  private totalRegionCount = 0;

  /**
   * loads country regions with automatic caching and deduplication
   *
   * @param country - country metadata including code, name, and geojson filename
   * @returns promise resolving to an array of regions for the country
   */
  async loadCountryRegions(country: CountryData): Promise<Regions[]> {
    const { fileName } = country;

    // check if already loading to avoid duplicate requests
    if (this.loadingPromises.has(fileName)) {
      logger.info(`Already loading ${country.name}, waiting...`);
      return this.loadingPromises.get(fileName)!;
    }

    // check if cached and not expired (LRU handles this)
    const cached = this.countryCache.get(fileName);
    if (cached) {
      logger.debug(`Cache hit: ${country.name} (${cached.length} regions)`);
      return cached;
    }

    // Check if we're approaching region limit
    if (this.totalRegionCount > PerformanceConfig.REGIONS.MAX_CACHED_REGIONS * 0.9) {
      logger.warn(
        `Approaching region limit: ${this.totalRegionCount}/${PerformanceConfig.REGIONS.MAX_CACHED_REGIONS}`
      );
    }

    // fetch and cache
    const promise = this.fetchAndCache(country);
    this.loadingPromises.set(fileName, promise);
    return promise;
  }

  /**
   * fetches region data from a geojson file and caches it
   *
   * @param country - country to fetch
   * @returns promise resolving to parsed regions
   * @internal
   */
  private async fetchAndCache(country: CountryData): Promise<Regions[]> {
    const { fileName } = country;

    try {
      const url = getApiUrl(`/data/regions/${fileName}`);
      const response = await fetch(url);

      if (!response.ok) {
        logger.info(`HTTP ${response.status} for ${fileName}`);
        return [];
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

      // cache it (LRU will auto-evict oldest if needed)
      this.countryCache.set(fileName, regions);
      this.totalRegionCount += regions.length;

      logger.debug(`Cached ${country.name}: ${regions.length} regions`);

      return regions;
    } catch (error) {
      logger.error(`Error loading ${fileName}: ${error}`);
      return [];
    } finally {
      this.loadingPromises.delete(fileName);
    }
  }

  /**
   * clears all cached country data and in-flight requests
   */
  clear(): void {
    this.countryCache.clear();
    this.loadingPromises.clear();
    this.totalRegionCount = 0;
  }

  /**
   * Clean expired entries
   */
  cleanExpired(): number {
    const removed = this.countryCache.cleanExpired();
    if (removed > 0) {
      logger.debug(`Cleaned ${removed} expired countries`);
      // Recalculate total region count
      this.recalculateTotalRegions();
    }
    return removed;
  }

  /**
   * Recalculate total region count
   */
  private recalculateTotalRegions(): void {
    this.totalRegionCount = 0;
    this.countryCache.forEach((regions) => {
      this.totalRegionCount += regions.length;
    });
  }

  getStats() {
    const cacheStats = this.countryCache.getStats();
    return {
      cachedCountries: cacheStats.size,
      expiredCountries: cacheStats.expired,
      loadingCountries: this.loadingPromises.size,
      totalRegions: this.totalRegionCount,
      maxCountries: PerformanceConfig.REGIONS.MAX_CACHED_COUNTRIES,
      maxRegions: PerformanceConfig.REGIONS.MAX_CACHED_REGIONS,
    };
  }
}
