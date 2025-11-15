import { GeoJSON } from 'geojson';

export interface RegionVisitData {
  regionId: string;
  regionName: string;
  visitCount: number;
  visited: boolean;
  trackIds: string[];
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
}

export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

export interface SpatialCell {
  regionIds: string[]; // which regions overlap this grid cell
}

export interface AnalysisConfig {
  gridSize: number; // in degrees, ~0.1 = 11km cells
}
