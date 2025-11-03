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

export interface Subdivision {
  id: string;
  name: string;
  country: string;
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  properties: Record<string, any>;
}

export interface IntersectionPoint {
  lat: number;
  lon: number;
  trackIds: string[];
  intensity: number;
}

export interface HeatmapSegment {
  start: GPXPoint;
  end: GPXPoint;
  intensity: number;
  trackId: string;
}

export interface MapState {
  tracks: Map<string, GPXTrack>;
  subdivisions: Subdivision[];
  intersections: IntersectionPoint[];
  loading: boolean;
  error: string | null;
}
