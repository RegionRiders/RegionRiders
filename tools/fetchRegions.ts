#!/usr/bin/env ts-node

/**
 * Fetch administrative regions from OpenStreetMap Overpass API
 * Each country gets its own file with custom admin level
 */

import * as fs from 'fs';
import * as path from 'path';
import { TopologySimplifier } from './utils/topologySimplifier';

interface CountryConfig {
    name: string;
    countryCode: string;
    osmName: string; // Name as it appears in OSM
    adminLevel: number; // Which admin level to fetch (e.g., 6 for voivodeships in Poland, 4 for states in USA)
    fileName: string; // e.g., "poland.geojson"
}

interface OverpassElement {
    type: string;
    id: number;
    tags?: Record<string, any>;
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

class MultiCountryFetcher {
    private readonly OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
    private readonly timeout: number;

    constructor(timeout: number = 180) {
        this.timeout = timeout;
    }

    async fetchAllCountries(countries: CountryConfig[]): Promise<void> {
        console.log(`📍 Starting to fetch regions for ${countries.length} countries...\n`);

        for (const country of countries) {
            console.log(`\n${'='.repeat(60)}`);
            console.log(`🌍 Country: ${country.name} (${country.countryCode})`);
            console.log(`📋 Admin Level: ${country.adminLevel}`);
            console.log(`${'='.repeat(60)}`);

            try {
                const geojson = await this.fetchCountryRegions(country.osmName, country.adminLevel, country.countryCode);

                if (geojson.features.length === 0) {
                    console.log(`⚠️  No regions found for ${country.name}`);
                    continue;
                }

                const outputPath = `public/data/regions/${country.fileName}`;
                this.saveGeoJSON(geojson, outputPath, true);

                console.log(`✅ Completed: ${geojson.features.length} regions saved`);
            } catch (error) {
                console.error(`❌ Error fetching ${country.name}:`, error);
            }

            // Rate limiting: wait between requests
            await new Promise((resolve) => setTimeout(resolve, 2000));
        }

        console.log(`\n${'='.repeat(60)}`);
        console.log('✅ All countries processed!');
    }

    private async fetchCountryRegions(
        osmName: string,
        adminLevel: number,
        countryCode: string
    ): Promise<GeoJSON.FeatureCollection> {
        const query = this.buildQuery(osmName, adminLevel);
        console.log(`📡 Querying Overpass API for admin_level=${adminLevel}...`);

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
            const geojson = this.convertToGeoJSON(osmData, countryCode);

            console.log(`📊 Found ${geojson.features.length} regions`);
            return geojson;
        } catch (error) {
            console.error('❌ Request failed:', error);
            throw error;
        }
    }

    private buildQuery(osmName: string, adminLevel: number): string {
        return `
[out:json][timeout:${this.timeout}];
// Find the country by name
area[name="${osmName}"]->.searchArea;
// Select administrative regions at the specified level
relation(area.searchArea)["boundary"="administrative"]["admin_level"="${adminLevel}"];
// Output with full geometry
out body geom;
`;
    }

    private convertToGeoJSON(
        osmData: OverpassResponse,
        countryCode: string
    ): GeoJSON.FeatureCollection {
        const features: GeoJSON.Feature[] = [];

        for (const element of osmData.elements) {
            if (element.type !== 'relation') continue;

            const geometry = this.extractGeometry(element);
            if (!geometry) continue;

            const properties = {
                ...element.tags,
                osm_id: element.id,
                osm_type: element.type,
                country_code: countryCode,
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

        const outerRings = this.chainWays(Array.from(outerWaysByRef.values()));
        const innerRings = this.chainWays(Array.from(innerWaysByRef.values()));

        if (outerRings.length === 0) return null;

        if (outerRings.length === 1) {
            return {
                type: 'Polygon',
                coordinates: [outerRings[0], ...innerRings],
            };
        }

        return {
            type: 'MultiPolygon',
            coordinates: outerRings.map((ring) => [ring]),
        };
    }

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

                    if (wayStart[0] === ringEnd[0] && wayStart[1] === ringEnd[1]) {
                        ring.push(...way.slice(1));
                        remaining.delete(idx);
                        found = true;
                        break;
                    }

                    if (wayEnd[0] === ringEnd[0] && wayEnd[1] === ringEnd[1]) {
                        ring.push(...way.reverse().slice(1));
                        remaining.delete(idx);
                        found = true;
                        break;
                    }
                }

                if (!found) break;
            }

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

    private saveGeoJSON(geojson: GeoJSON.FeatureCollection, outputPath: string, simplify: boolean = true): void {
        const dir = path.dirname(outputPath);

        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        let finalGeoJSON = geojson;

        if (simplify && geojson.features.length > 0) {
            console.log('🔧 Simplifying geometries...');
            const simplifier = new TopologySimplifier(0.001);
            finalGeoJSON = {
                ...geojson,
                features: simplifier.simplifyFeatureCollection(geojson.features),
            };

            const originalPoints = this.countPoints(geojson);
            const simplifiedPoints = this.countPoints(finalGeoJSON);
            const reduction = ((1 - simplifiedPoints / originalPoints) * 100).toFixed(1);

            console.log(`📉 Reduced from ${originalPoints} to ${simplifiedPoints} points (${reduction}% reduction)`);
        }

        fs.writeFileSync(outputPath, JSON.stringify(finalGeoJSON, null, 2), 'utf-8');
        console.log(`💾 Saved to ${outputPath}`);
    }

    private countPoints(geojson: GeoJSON.FeatureCollection): number {
        let count = 0;

        for (const feature of geojson.features) {
            const geometry = feature.geometry as GeoJSON.Geometry;

            if (geometry.type === 'Polygon') {
                count += geometry.coordinates.reduce((sum, ring: number[][]) => sum + ring.length, 0);
            } else if (geometry.type === 'MultiPolygon') {
                count += geometry.coordinates.reduce(
                    (sum, polygon: number[][][]) =>
                        sum + polygon.reduce((s, ring: number[][]) => s + ring.length, 0),
                    0
                );
            }
        }

        return count;
    }
}

// Define countries and their admin levels
const COUNTRIES: CountryConfig[] = [
    // Poland - gminy (level 7)
    {
        name: 'Poland',
        countryCode: 'PL',
        osmName: 'Polska',
        adminLevel: 7, // Gminy
        fileName: 'poland.geojson',
    },

    // Slovakia - municipalities (level 8)
    {
        name: 'Slovakia',
        countryCode: 'SK',
        osmName: 'Slovensko',
        adminLevel: 9, // Municipalități
        fileName: 'slovakia.geojson',
    },

    // Hungary - municipalities (level 8)
    {
        name: 'Hungary',
        countryCode: 'HU',
        osmName: 'Magyarorszag',
        adminLevel: 7, // Municipalități
        fileName: 'hungary.geojson',
    },

    // Germany - gemeinden (level 8)
    {
        name: 'Germany',
        countryCode: 'DE',
        osmName: 'Deutschland',
        adminLevel: 8, // Gemeinden
        fileName: 'germany.geojson',
    },

    // Belgium - municipalities/communes (level 8)
    {
        name: 'Belgium',
        countryCode: 'BE',
        osmName: 'Belgie',
        adminLevel: 8, // Communes/Gemeentes
        fileName: 'belgium.geojson',
    },

    // France - communes (level 8)
    {
        name: 'France',
        countryCode: 'FR',
        osmName: 'France',
        adminLevel: 7,
        fileName: 'france.geojson',
    },

    // // Netherlands - municipalities (level 8)
    {
        name: 'Netherlands',
        countryCode: 'NL',
        osmName: 'Nederland',
        adminLevel: 8, // Gemeenten
        fileName: 'netherlands.geojson',
    },
];


async function main() {
    const fetcher = new MultiCountryFetcher(180);
    await fetcher.fetchAllCountries(COUNTRIES);
}

main().catch(console.error);

export { MultiCountryFetcher, CountryConfig };
