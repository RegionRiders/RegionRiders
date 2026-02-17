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
  
  // Memory safety limits
  private static readonly MAX_REGIONS_TO_LOAD = 5000; // Prevent loading too many regions
  private static readonly WARN_THRESHOLD = 3000; // Warning threshold
  private static readonly CHUNK_SIZE = 500; // Process regions in chunks

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
          
          // Early exit if we're approaching memory limits
          if (allRegions.length > this.MAX_REGIONS_TO_LOAD) {
            logger.warn(
              `Region limit exceeded (${allRegions.length} > ${this.MAX_REGIONS_TO_LOAD}). ` +
              `Stopping load to prevent memory issues.`
            );
            break;
          }
        } catch (error) {
          const errorMsg = `Failed to load ${country.name}`;
          errors.push(errorMsg);
          logger.error(`${errorMsg}: ${error}`);
        }
      }

      // Warn if approaching limits
      if (allRegions.length > this.WARN_THRESHOLD) {
        logger.warn(
          `Large region count: ${allRegions.length} regions loaded. ` +
          `This may impact performance. Consider zooming in or filtering countries.`
        );
      }

      // Filter by bounds if provided - process in chunks to avoid blocking
      const filteredRegions = bounds
        ? await this.filterRegionsByBoundsChunked(allRegions, bounds)
        : allRegions;

      const duration = (performance.now() - startTime).toFixed(2);
      logger.debug(
        `Loaded ${filteredRegions.length}/${allRegions.length} regions (${duration}ms)`
      );

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
   * Filter regions by bounds in chunks to avoid blocking the UI thread
   * @private
   */
  private static async filterRegionsByBoundsChunked(
    regions: Regions[],
    bounds: { north: number; south: number; east: number; west: number }
  ): Promise<Regions[]> {
    const filtered: Regions[] = [];
    
    for (let i = 0; i < regions.length; i += this.CHUNK_SIZE) {
      const chunk = regions.slice(i, i + this.CHUNK_SIZE);
      const chunkFiltered = chunk.filter((region) => 
        this.boundsChecker.isInBounds(region, bounds)
      );
      filtered.push(...chunkFiltered);
      
      // Yield to event loop every chunk to keep UI responsive
      if (i + this.CHUNK_SIZE < regions.length) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
    
    return filtered;
  }

  /**
   * clears all cached region data
   */
  static clearCache(): void {
    logger.debug('Clearing caches');
    this.cache.clear();
    this.boundsChecker.clearCache();
  }
  
  /**
   * Get memory usage statistics
   */
  static getStats() {
    const cacheStats = this.cache.getStats();
    return {
      ...cacheStats,
      maxRegions: this.MAX_REGIONS_TO_LOAD,
      warnThreshold: this.WARN_THRESHOLD,
    };
  }
}
