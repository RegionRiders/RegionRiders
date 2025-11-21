import { GeoJSON } from 'geojson';

export interface Regions {
  id: string;
  name: string;
  country: string;
  adminLevel: number;
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  properties: Record<string, any>;
}
