import { Regions } from '@/lib/types';

interface Bounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

/**
 * handles bounding box calculations and viewport intersection checks for region
 * caches computed bounding boxes for performance
 */
export class BoundsChecker {
  private boundingBoxCache = new Map<string, Bounds>();

  /**
   * checks if the region's bounding box intersects with viewport bounds
   *
   * @param region - geographic region to check
   * @param bounds - viewport boundaries
   * @returns true if a region is at least partially visible in viewport
   */
  isInBounds(region: Regions, bounds: Bounds): boolean {
    const geometry = region.geometry as any;
    if (!geometry || !geometry.coordinates) {
      return false;
    }

    // check cache first
    let regionBounds = this.boundingBoxCache.get(region.id);

    if (!regionBounds) {
      regionBounds = this.calculateBounds(geometry);
      this.boundingBoxCache.set(region.id, regionBounds);
    }

    // check if bounding boxes intersect on both axes
    const latOverlap = regionBounds.south <= bounds.north && regionBounds.north >= bounds.south;
    const lonOverlap = regionBounds.west <= bounds.east && regionBounds.east >= bounds.west;

    return latOverlap && lonOverlap;
  }

  /**
   * calculates bounding box for a geojson geometry
   *
   * @param geometry - geojson polygon or multipolygon geometry
   * @returns computed bounding box with north, south, east, west coordinates
   * @internal
   */
  private calculateBounds(geometry: any): Bounds {
    const regionBounds: Bounds = {
      north: -90,
      south: 90,
      east: -180,
      west: 180,
    };

    // get all coordinate rings for the geometry
    const rings: number[][][] =
      geometry.type === 'Polygon'
        ? [geometry.coordinates[0]]
        : geometry.type === 'MultiPolygon'
          ? geometry.coordinates.map((poly: any) => poly[0])
          : [];

    for (const ring of rings) {
      for (const [lon, lat] of ring) {
        regionBounds.north = Math.max(regionBounds.north, lat);
        regionBounds.south = Math.min(regionBounds.south, lat);
        regionBounds.east = Math.max(regionBounds.east, lon);
        regionBounds.west = Math.min(regionBounds.west, lon);
      }
    }

    return regionBounds;
  }

  /**
   * clears all cached bounding boxes
   */
  clearCache(): void {
    this.boundingBoxCache.clear();
  }
}
