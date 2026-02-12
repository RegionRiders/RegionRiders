import RBush from 'rbush';
import { Regions } from '@/lib/types';

interface IndexedRegion {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  region: Regions;
}

export class RegionSpatialIndex {
  private tree: RBush<IndexedRegion>;

  constructor(regions: Regions[]) {
    this.tree = new RBush();
    this.buildIndex(regions);
  }

  private buildIndex(regions: Regions[]): void {
    const items: IndexedRegion[] = regions.map((region) => {
      const bounds = this.getBounds(region);
      return {
        minX: bounds.west,
        minY: bounds.south,
        maxX: bounds.east,
        maxY: bounds.north,
        region,
      };
    });
    this.tree.load(items);
  }

  private getBounds(region: Regions): {
    north: number;
    south: number;
    east: number;
    west: number;
  } {
    const coords = this.extractAllCoordinates(region.geometry);

    const lats = coords.map((c) => c[1]);
    const lons = coords.map((c) => c[0]);

    return {
      north: Math.max(...lats),
      south: Math.min(...lats),
      east: Math.max(...lons),
      west: Math.min(...lons),
    };
  }

  private extractAllCoordinates(geometry: any): number[][] {
    // Handle different GeoJSON geometry types
    if (geometry.type === 'Polygon') {
      // Flatten all rings (exterior + holes)
      return geometry.coordinates.flat();
    } else if (geometry.type === 'MultiPolygon') {
      // Flatten all polygons and all rings
      return geometry.coordinates.flat(2);
    }
    return [];
  }

  /**
   * Find candidate regions that might contain this point
   * Returns only regions whose bounding box contains the point
   * Much faster than checking all regions: O(log n) vs O(n)
   */
  findCandidateRegions(lon: number, lat: number): Regions[] {
    const candidates = this.tree.search({
      minX: lon,
      minY: lat,
      maxX: lon,
      maxY: lat,
    });
    return candidates.map((item) => item.region);
  }

  /**
   * Get total number of indexed regions
   */
  getSize(): number {
    return this.tree.all().length;
  }
}
