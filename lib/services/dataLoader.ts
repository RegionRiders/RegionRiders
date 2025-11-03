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

  static async loadSubdivisions(): Promise<Subdivision[]> {
    try {
      const response = await fetch('/data/subdivisions.geojson');
      const geojson = await response.json();

      return geojson.features.map((feature: any) => ({
        id: feature.properties.id || feature.id,
        name: feature.properties.name || '',
        country: feature.properties.country || '',
        geometry: feature.geometry,
        properties: feature.properties,
      }));
    } catch (error) {
      console.error('Failed to load subdivisions:', error);
      return [];
    }
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

  static async getTrack(
    trackId: string,
    source: 'local' | 'api' = 'local'
  ): Promise<GPXTrack | null> {
    return null;
  }
}
