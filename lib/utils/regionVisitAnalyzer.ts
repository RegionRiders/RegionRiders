import { GPXTrack, Subdivision, GPXPoint } from '../types/types';

interface RegionVisitData {
    regionId: string;
    regionName: string;
    visitCount: number;
    visited: boolean;
    color: string;
    trackIds: string[];
}

export class RegionVisitAnalyzer {
    private static boundingBoxCache = new Map<string, { minLat: number; maxLat: number; minLon: number; maxLon: number }>();

    /**
     * Analyze GPX tracks and count how many times each region was visited
     * Optimized with bounding boxes and early exit
     */
    static analyzeRegionVisits(
        tracks: GPXTrack[],
        subdivisions: Subdivision[]
    ): Map<string, RegionVisitData> {
        const visitMap = new Map<string, RegionVisitData>();

        // Initialize all regions
        subdivisions.forEach((region) => {
            visitMap.set(region.id, {
                regionId: region.id,
                regionName: region.name,
                visitCount: 0,
                visited: false,
                color: '#666',
                trackIds: [],
            });
        });

        // Precompute bounding boxes for all regions
        const regionBounds = new Map<string, any>();
        subdivisions.forEach((region) => {
            const bbox = this.getBoundingBox(region.geometry);
            regionBounds.set(region.id, bbox);
        });

        // For each track, count visited regions
        tracks.forEach((track) => {
            const visitedRegions = new Set<string>();

            // Early exit: if track has no points, skip
            if (!track.points || track.points.length === 0) return;

            // Check each point
            for (const point of track.points) {
                // Skip if already counted this region for this track
                if (visitedRegions.size === subdivisions.length) break; // All regions checked

                for (const region of subdivisions) {
                    if (visitedRegions.has(region.id)) continue;

                    const bbox = regionBounds.get(region.id);

                    // Quick bounding box check first (eliminates 90%+ of checks)
                    if (!this.pointInBoundingBox(point, bbox)) {
                        continue;
                    }

                    // Only do expensive point-in-polygon if bounding box passes
                    if (this.pointInPolygon(point, region.geometry)) {
                        visitedRegions.add(region.id);

                        const data = visitMap.get(region.id)!;
                        data.visitCount++;
                        data.visited = true;
                        data.color = '#22c55e';
                        if (!data.trackIds.includes(track.id)) {
                            data.trackIds.push(track.id);
                        }
                    }
                }
            }
        });

        return visitMap;
    }

    /**
     * Get bounding box for a geometry
     */
    private static getBoundingBox(geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon) {
        let minLat = Infinity,
            maxLat = -Infinity,
            minLon = Infinity,
            maxLon = -Infinity;

        const processRing = (ring: [number, number][]) => {
            for (const [lon, lat] of ring) {
                minLat = Math.min(minLat, lat);
                maxLat = Math.max(maxLat, lat);
                minLon = Math.min(minLon, lon);
                maxLon = Math.max(maxLon, lon);
            }
        };

        if (geometry.type === 'Polygon') {
            geometry.coordinates.forEach(processRing);
        } else {
            geometry.coordinates.forEach((polygon) => {
                polygon.forEach(processRing);
            });
        }

        return { minLat, maxLat, minLon, maxLon };
    }

    /**
     * Quick bounding box check (100x faster than point-in-polygon)
     */
    private static pointInBoundingBox(
        point: GPXPoint,
        bbox: { minLat: number; maxLat: number; minLon: number; maxLon: number }
    ): boolean {
        return (
            point.lat >= bbox.minLat &&
            point.lat <= bbox.maxLat &&
            point.lon >= bbox.minLon &&
            point.lon <= bbox.maxLon
        );
    }

    /**
     * Point-in-polygon algorithm
     */
    private static pointInPolygon(
        point: GPXPoint,
        geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon
    ): boolean {
        if (geometry.type === 'Polygon') {
            return this.isPointInPolygon(point, geometry.coordinates[0]);
        } else {
            return geometry.coordinates.some((polygon) =>
                this.isPointInPolygon(point, polygon[0])
            );
        }
    }

    /**
     * Ray casting for point-in-polygon
     */
    private static isPointInPolygon(point: GPXPoint, polygonCoords: [number, number][]): boolean {
        const x = point.lon;
        const y = point.lat;
        let inside = false;

        for (let i = 0, j = polygonCoords.length - 1; i < polygonCoords.length; j = i++) {
            const xi = polygonCoords[i][0];
            const yi = polygonCoords[i][1];
            const xj = polygonCoords[j][0];
            const yj = polygonCoords[j][1];

            const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
            if (intersect) inside = !inside;
        }

        return inside;
    }
}

export type { RegionVisitData };
