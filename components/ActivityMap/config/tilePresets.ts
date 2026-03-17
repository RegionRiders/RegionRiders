export interface TilePreset {
  name: string;
  url: string;
  attribution: string;
}

export const TILE_PRESETS: Record<string, TilePreset> = {
  standard: {
    name: 'Standard',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors',
  },
  satellite: {
    name: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles © Esri',
  },
  terrain: {
    name: 'Terrain',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '© OpenTopoMap contributors',
  },
  dark: {
    name: 'Dark',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '© CARTO',
  },
  cycling: {
    name: 'Cycling',
    url: 'https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',
    attribution: '© CyclOSM & OpenStreetMap',
  },
  neutralBase: {
    name: 'Alidade Smooth',
    url: 'https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png',
    attribution: '© Stadia Maps, © OpenMapTiles, © OSM contributors',
  },
  bikeOverlay: {
    name: 'Cycling Routes',
    url: 'https://tile.waymarkedtrails.org/cycling/{z}/{x}/{y}.png',
    attribution: '© Waymarked Trails',
  },
  minimalBiking: {
    name: 'Stadia Outdoors',
    url: 'https://tiles.stadiamaps.com/tiles/outdoors/{z}/{x}/{y}{r}.png',
    attribution: '&copy; Stadia Maps, &copy; OSM contributors',
  },
} as const;

export const DEFAULT_TILE_PRESET = TILE_PRESETS.standard;

export const MAP_SOURCE_PRESET_KEYS = [
  'standard',
  'satellite',
  'terrain',
  'dark',
  'cycling',
  'neutralBase',
  'minimalBiking',
] as const;

export const MAP_OVERLAY_PRESET_KEYS = ['bikeOverlay'] as const;
