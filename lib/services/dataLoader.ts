import { GPXTrack, Subdivision } from '../types';
import { parseGPXFile } from '../utils/gpxParser';

export class DataLoader {
    static async loadGPXTracks(
        source: 'local' | 'api' = 'local',
        files?: string[]
    ): Promise<GPXTrack[]> {
        if (source === 'api') {
            return this.loadFromAPI();
        }

        if (!files || files.length === 0) {
            files = await this.getLocalGPXFileList();
        }

        const tracks: GPXTrack[] = [];
        const errors: string[] = [];

        for (const file of files) {
            try {
                const track = await parseGPXFile(`/data/gpx/${file}`);
                tracks.push(track);
            } catch (error) {
                errors.push(`Failed to load ${file}: ${error}`);
            }
        }

        if (errors.length > 0) {
            console.warn('Some GPX files failed to load:', errors);
        }

        return tracks;
    }

    /**
     * Load subdivisions visible in the current map viewport
     * @param bounds - Map bounds { north, south, east, west }
     * @param zoom - Current zoom level (for level-of-detail)
     */
    static async loadSubdivisions(
        bounds?: { north: number; south: number; east: number; west: number },
        zoom?: number
    ): Promise<Subdivision[]> {
        try {
            // For now: load from local mock file
            // Later: call API with bounds and zoom
            const response = await this.loadSubdivisionsLocal(bounds, zoom);
            return response;
        } catch (error) {
            console.error('Failed to load subdivisions:', error);
            return [];
        }
    }

    /**
     * MOCK: Load from local file
     * In production, this will be replaced by API call
     */
    private static async loadSubdivisionsLocal(
        bounds?: { north: number; south: number; east: number; west: number },
        zoom?: number
    ): Promise<Subdivision[]> {
        const response = await fetch('/data/subdivisions.geojson');
        const geojson = await response.json();

        let features = geojson.features;

        // Mock viewport filtering (remove in production - server will handle this)
        if (bounds) {
            features = features.filter((feature: any) => {
                // Simple bounding box check
                const coords = this.getFeatureCoords(feature.geometry);
                return coords.some(([lon, lat]) =>
                    lat >= bounds.south && lat <= bounds.north &&
                    lon >= bounds.west && lon <= bounds.east
                );
            });
        }

        return features.map((feature: any) => ({
            id: feature.properties.id || feature.id,
            name: feature.properties.name || '',
            country: feature.properties.country || '',
            geometry: feature.geometry,
            properties: feature.properties,
        }));
    }

    /**
     * PRODUCTION: Load from API (not yet implemented)
     * Replace loadSubdivisionsLocal with this when backend is ready
     */
    private static async loadSubdivisionsFromAPI(
        bounds: { north: number; south: number; east: number; west: number },
        zoom: number
    ): Promise<Subdivision[]> {
        const params = new URLSearchParams({
            north: bounds.north.toString(),
            south: bounds.south.toString(),
            east: bounds.east.toString(),
            west: bounds.west.toString(),
            zoom: zoom.toString(),
        });

        const response = await fetch(`/api/subdivisions?${params}`);
        const result = await response.json();
        return result.data || [];
    }

    private static getFeatureCoords(geometry: any): [number, number][] {
        if (geometry.type === 'Polygon') {
            return geometry.coordinates[0];
        } else if (geometry.type === 'MultiPolygon') {
            return geometry.coordinates.flatMap((polygon: any) => polygon[0]);
        }
        return [];
    }

    private static async loadFromAPI(): Promise<GPXTrack[]> {
        try {
            const response = await fetch('/api/activities');
            const result = await response.json();
            return result.data || [];
        } catch (error) {
            console.error('Failed to load from API:', error);
            return [];
        }
    }

    private static async getLocalGPXFileList(): Promise<string[]> {
        try {
            const response = await fetch('/api/gpx-files');
            const result = await response.json();
            return result.files || [];
        } catch {
            return [];
        }
    }
}
