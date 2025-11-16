import { logger } from '@/lib/logger/client';
import { Regions } from '@/lib/types/types';

export interface CountryData {
  code: string;
  name: string;
  fileName: string;
  data?: Regions[];
  cachedAt?: number;
}

/**
 * manages caching of country region data to avoid redundant network requests
 * implements ttl-based expiration and deduplication of concurrent requests
 */
export class RegionCache {
  private static readonly CACHE_TTL = 100 * 60 * 1000; // 100 minutes
  private countryCache = new Map<string, CountryData>();
  private loadingPromises = new Map<string, Promise<Regions[]>>();

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
      logger.info(`[RegionCache] Already loading ${country.name}, waiting...`);
      return this.loadingPromises.get(fileName)!;
    }

    // check if cached and not expired
    const cached = this.countryCache.get(fileName);
    if (cached && cached.data && cached.cachedAt) {
      const age = Date.now() - cached.cachedAt;
      if (age < RegionCache.CACHE_TTL) {
        return cached.data;
      }
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

    const existing = this.countryCache.get(fileName);
    try {
      const response = await fetch(`/data/regions/${fileName}`);

      if (!response.ok) {
        logger.info(`[RegionCache] HTTP ${response.status} for ${fileName}`);
        return existing?.data ?? [];
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

      // cache it
      this.countryCache.set(fileName, {
        code: country.code,
        name: country.name,
        fileName,
        data: regions,
        cachedAt: Date.now(),
      });

      logger.debug(`[RegionCache] Cached ${country.name}: ${regions.length} regions`);

      return regions;
    } catch (error) {
      logger.error(`[RegionCache] Error loading ${fileName}: ${error}`);
      return existing?.data ?? [];
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
  }
}
