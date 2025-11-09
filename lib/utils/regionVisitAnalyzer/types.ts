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
    regionIds: string[];
}

export interface AnalysisConfig {
    gridSize: number;
    pointSkipRatio: number;
}
