import { GPXTrack, Subdivision } from '../types/types';
import { parseGPXFile } from '../utils/gpxParser';

export class DataLoader {
    static async loadGPXTracks(
        source: 'local' | 'api' = 'local',
        files?: string[]
    ): Promise<GPXTrack[]> {
        const startTime = performance.now();
        console.log(`📂 [DataLoader] Loading GPX tracks from ${source}...`);

        if (source === 'api') {
            return this.loadFromAPI();
        }

        if (!files || files.length === 0) {
            files = await this.getLocalGPXFileList();
        }

        const tracks: GPXTrack[] = [];
        const errors: string[] = [];

        console.log(`📄 [DataLoader] Found ${files.length} GPX files to load`);

        for (const file of files) {
            try {
                const track = await parseGPXFile(`/data/gpx/${file}`);
                tracks.push(track);
                console.log(`✅ [DataLoader] Loaded: ${file} (${track.points.length} points)`);
            } catch (error) {
                const errorMsg = `Failed to load ${file}: ${error}`;
                errors.push(errorMsg);
                console.error(`❌ [DataLoader] ${errorMsg}`);
            }
        }

        const duration = (performance.now() - startTime).toFixed(2);
        console.log(`✅ [DataLoader] Loaded ${tracks.length} tracks in ${duration}ms`);

        if (errors.length > 0) {
            console.warn('⚠️ [DataLoader] Some files failed:', errors);
        }

        return tracks;
    }

    static async loadSubdivisions(
        bounds?: { north: number; south: number; east: number; west: number },
        zoom?: number
    ): Promise<Subdivision[]> {
        const startTime = performance.now();
        console.log(`🗺️ [DataLoader] Loading subdivisions (zoom=${zoom})`);

        try {
            const response = await fetch('/data/subdivisions.geojson');
            const geojson = await response.json();

            const subs = geojson.features.map((feature: any) => ({
                id: feature.id,
                name: feature.properties?.name || 'Unknown',
                country: feature.properties?.country || '',
                geometry: feature.geometry,
                properties: feature.properties || {},
            }));

            const duration = (performance.now() - startTime).toFixed(2);
            console.log(`✅ [DataLoader] Loaded ${subs.length} subdivisions (${duration}ms)`);

            return subs;
        } catch (error) {
            console.error('❌ [DataLoader] Error loading subdivisions:', error);
            return [];
        }
    }

    private static async getLocalGPXFileList(): Promise<string[]> {
        try {
            const response = await fetch('/api/gpx-files');
            const data = await response.json();
            return data.files || [];
        } catch {
            console.warn('⚠️ [DataLoader] Could not load GPX file list');
            return [];
        }
    }

    private static async loadFromAPI(): Promise<GPXTrack[]> {
        console.log('📡 [DataLoader] Loading from API...');
        return [];
    }
}
