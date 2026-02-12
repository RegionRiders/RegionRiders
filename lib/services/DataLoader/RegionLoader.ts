import { createComponentLogger } from '@/lib/logger/client';
import { Regions } from '@/lib/types';
import { RegionCache } from '../cache/regionCache';
import { countryConfig } from '../config/countryConfig';
import { BoundsChecker } from '../geometry/boundsChecker';

const logger = createComponentLogger('RegionLoader');

/**
 * handles loading and filtering of geographic region data
 */
export class RegionLoader {
  private static cache = new RegionCache();
  private static boundsChecker = new BoundsChecker();

  /**
   * loads all regions optionally filtered by bounds and for specified countries
   *
   * @param bounds - optional viewport bounds to filter results
   * @param countries - optional array of country codes (e.g., ['PL', 'DE'])
   * @returns promise resolving to all requested regions
   */
  static async loadRegions(
    bounds?: { north: number; south: number; east: number; west: number },
    countries?: string[]
  ): Promise<Regions[]> {
    const startTime = performance.now();
    logger.debug(`Loading regions ${countries?.join(',') || 'all'}`);

    try {
      const countryFiles = countryConfig.getAvailableCountries();

      const filesToLoad = countries
        ? countryFiles.filter((f) => countries.includes(f.code))
        : countryFiles;

      if (filesToLoad.length === 0) {
        logger.warn('No matching country files found');
        return [];
      }

      const allRegions: Regions[] = [];
      const errors: string[] = [];

      logger.debug(`Loading ${filesToLoad.length} country files...`);

      for (const country of filesToLoad) {
        try {
          const regions = await this.cache.loadCountryRegions(country);
          allRegions.push(...regions);
        } catch (error) {
          const errorMsg = `Failed to load ${country.name}`;
          errors.push(errorMsg);
          logger.error(`${errorMsg}: ${error}`);
        }
      }

      // filter by bounds if provided
      const filteredRegions = bounds
        ? allRegions.filter((region) => this.boundsChecker.isInBounds(region, bounds))
        : allRegions;

      const duration = (performance.now() - startTime).toFixed(2);
      logger.debug(`Loaded ${filteredRegions.length} total regions (${duration}ms)`);

      if (errors.length > 0) {
        logger.warn(`${errors.length} countries failed to load`);
      }

      return filteredRegions;
    } catch (error) {
      logger.error(`Error loading regions: ${error}`);
      return [];
    }
  }

  /**
   * clears all cached region data
   */
  static clearCache(): void {
    logger.debug('Clearing caches');
    this.cache.clear();
    this.boundsChecker.clearCache();
  }
}
