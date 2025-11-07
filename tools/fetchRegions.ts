#!/usr/bin/env ts-node
/**
 * Fetch administrative regions from OpenStreetMap Overpass API
 * and save them as GeoJSON files with topology-preserving simplification.
 */

import * as fs from 'fs';
import * as path from 'path';
import { TopologySimplifier } from './utils/topologySimplifier';

interface OverpassElement {
    type: string;
    id: number;
    tags?: Record<string, string>;
    members?: Array<{
        type: string;
        ref: number;
        role: string;
        geometry?: Array<{ lat: number; lon: number }>;
    }>;
}

interface OverpassResponse {
    elements: OverpassElement[];
}

class OverpassRegionFetcher {
    private readonly OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
    private readonly timeout: number;

    constructor(timeout: number = 180) {
        this.timeout = timeout;
    }

    async fetchAdminLevelInRegion(
        regionName: string,
        adminLevel: number
    ): Promise<GeoJSON.FeatureCollection> {
        const query = this.buildQuery(regionName, adminLevel);

        console.log(`Fetching admin_level=${adminLevel} regions in '${regionName}'...`);
        console.log(`Query:\n${query}\n`);

        try {
            const response = await fetch(this.OVERPASS_URL, {
                method: 'POST',
                body: new URLSearchParams({ data: query }),
                signal: AbortSignal.timeout(this.timeout * 1000),
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`HTTP ${response.status}: ${response.statusText}\n${text}`);
            }

            const osmData: OverpassResponse = await response.json();
            const geojson = this.convertToGeoJSON(osmData);

            console.log(`✓ Found ${geojson.features.length} regions`);
            return geojson;
        } catch (error) {
            console.error('✗ Request failed:', error);
            throw error;
        }
    }

    private buildQuery(regionName: string, adminLevel: number): string {
        const query = `
[out:json][timeout:${this.timeout}];
// Find the parent area by name
area[name="${regionName}"]->.searchArea;
// Select relations with admin_level in that area
relation(area.searchArea)["boundary"="administrative"]["admin_level"="${adminLevel}"];
// Output with geometry
out body geom;
`;
        return query;
    }

    private convertToGeoJSON(osmData: OverpassResponse): GeoJSON.FeatureCollection {
        const features: GeoJSON.Feature[] = [];

        for (const element of osmData.elements) {
            if (element.type !== 'relation') continue;

            const geometry = this.extractGeometry(element);
            if (!geometry) continue;

            const properties = {
                ...element.tags,
                osm_id: element.id,
                osm_type: element.type,
            };

            features.push({
                type: 'Feature',
                id: element.id,
                properties,
                geometry,
            });
        }

        return {
            type: 'FeatureCollection',
            features,
        };
    }

    private extractGeometry(element: OverpassElement): GeoJSON.Geometry | null {
        if (!element.members) return null;

        const outerWaysByRef = new Map<number, number[][]>();
        const innerWaysByRef = new Map<number, number[][]>();

        // Map each way by its ref, keeping coords
        for (const member of element.members) {
            if (member.type !== 'way' || !member.geometry) continue;

            const coords = member.geometry.map((pt) => [pt.lon, pt.lat]);

            if (member.role === 'outer') {
                outerWaysByRef.set(member.ref, coords);
            } else if (member.role === 'inner') {
                innerWaysByRef.set(member.ref, coords);
            }
        }

        if (outerWaysByRef.size === 0) return null;

        // Chain ways together to form complete rings
        const outerRings = this.chainWays(Array.from(outerWaysByRef.values()));
        const innerRings = this.chainWays(Array.from(innerWaysByRef.values()));

        if (outerRings.length === 0) return null;

        // Single polygon
        if (outerRings.length === 1) {
            return {
                type: 'Polygon',
                coordinates: [outerRings[0], ...innerRings],
            };
        }

        // MultiPolygon
        return {
            type: 'MultiPolygon',
            coordinates: outerRings.map((ring) => [ring]),
        };
    }

    /**
     * Chain ways together to form continuous rings
     * Ways in OSM are individual line segments that need to be connected end-to-end
     */
    private chainWays(ways: number[][][]): number[][][] {
        if (ways.length === 0) return [];
        if (ways.length === 1) return ways;

        const rings: number[][][] = [];
        const remaining = new Set(ways.map((_, i) => i));

        while (remaining.size > 0) {
            const ring: number[][] = [];
            let currentIdx = remaining.values().next().value;
            remaining.delete(currentIdx);

            let currentWay = ways[currentIdx];
            ring.push(...currentWay);

            // Chain ways until ring closes
            while (
                ring[0][0] !== ring[ring.length - 1][0] ||
                ring[0][1] !== ring[ring.length - 1][1]
                ) {
                const ringEnd = ring[ring.length - 1];
                let found = false;

                for (const idx of remaining) {
                    const way = ways[idx];
                    const wayStart = way[0];
                    const wayEnd = way[way.length - 1];

                    // Way starts where ring ends
                    if (wayStart[0] === ringEnd[0] && wayStart[1] === ringEnd[1]) {
                        ring.push(...way.slice(1)); // Skip first point (already added)
                        remaining.delete(idx);
                        found = true;
                        break;
                    }

                    // Way ends where ring ends (reverse it)
                    if (wayEnd[0] === ringEnd[0] && wayEnd[1] === ringEnd[1]) {
                        ring.push(...way.reverse().slice(1));
                        remaining.delete(idx);
                        found = true;
                        break;
                    }
                }

                if (!found) {
                    // Ring closed or no more ways to connect
                    break;
                }
            }

            // Only add if ring is closed (first and last point match)
            if (
                ring.length > 2 &&
                ring[0][0] === ring[ring.length - 1][0] &&
                ring[0][1] === ring[ring.length - 1][1]
            ) {
                rings.push(ring);
            }
        }

        return rings;
    }

    saveGeoJSON(geojson: GeoJSON.FeatureCollection, outputPath: string, simplify: boolean = true): void {
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        let finalGeoJSON = geojson;

        // Apply topology-preserving simplification
        if (simplify && geojson.features.length > 0) {
            console.log('Simplifying geometries while preserving topology...');
            const simplifier = new TopologySimplifier(0.001); // ~50m tolerance
            finalGeoJSON = {
                ...geojson,
                features: simplifier.simplifyFeatureCollection(geojson.features)
            };

            // Calculate reduction
            const originalPoints = this.countPoints(geojson);
            const simplifiedPoints = this.countPoints(finalGeoJSON);
            const reduction = ((1 - simplifiedPoints / originalPoints) * 100).toFixed(1);
            console.log(`✓ Reduced from ${originalPoints} to ${simplifiedPoints} points (${reduction}% reduction)`);
        }

        fs.writeFileSync(outputPath, JSON.stringify(finalGeoJSON, null, 2), 'utf-8');
        console.log(`✓ Saved to ${outputPath}`);
    }

    private countPoints(geojson: GeoJSON.FeatureCollection): number {
        let count = 0;
        for (const feature of geojson.features) {
            const geometry = feature.geometry as GeoJSON.Geometry;
            if (geometry.type === 'Polygon') {
                count += geometry.coordinates.reduce((sum, ring: number[][]) => sum + ring.length, 0);
            } else if (geometry.type === 'MultiPolygon') {
                count += geometry.coordinates.reduce((sum, polygon: number[][][]) =>
                    sum + polygon.reduce((s, ring: number[][]) => s + ring.length, 0), 0
                );
            }
        }
        return count;
    }
}

async function main() {
    const fetcher = new OverpassRegionFetcher(180);

    // Try different name variations
    let geojson: GeoJSON.FeatureCollection | null = null;

    const nameVariations = [
        'Polska',
    ];

    for (const name of nameVariations) {
        try {
            console.log(`\nTrying region name: "${name}"`);
            geojson = await fetcher.fetchAdminLevelInRegion(name, 7);
            if (geojson.features.length > 0) {
                console.log(`✓ Success with name: "${name}"`);
                break;
            }
        } catch (error) {
            console.log(`✗ Failed with name: "${name}"`);
        }
    }

    if (!geojson || geojson.features.length === 0) {
        console.error('\n✗ Could not fetch regions with any name variation');
        process.exit(1);
    }

    // Save to public/data directory (with simplification enabled)
    const outputPath = 'public/data/subdivisions.geojson';
    fetcher.saveGeoJSON(geojson, outputPath, true);

    // Print summary
    console.log('\n' + '='.repeat(50));
    console.log(`Total regions fetched: ${geojson.features.length}`);
    console.log('\nRegions:');
    for (const feature of geojson.features) {
        const name = feature.properties?.name || 'Unknown';
        const adminLevel = feature.properties?.admin_level || '?';
        const osmId = feature.properties?.osm_id || '?';
        console.log(`  - ${name} (admin_level=${adminLevel}, osm_id=${osmId})`);
    }
}

main().catch(console.error);

export { OverpassRegionFetcher };
