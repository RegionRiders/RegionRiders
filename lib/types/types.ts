export interface GPXPoint {
  lat: number;
  lon: number;
  ele?: number;
  time?: string;
}

export interface GPXTrack {
  id: string;
  name: string;
  points: GPXPoint[];
  metadata?: {
    date?: string;
    distance?: number;
    duration?: number;
  };
}

export interface Regions {
  id: string;
  name: string;
  country: string;
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  properties: Record<string, any>;
}
