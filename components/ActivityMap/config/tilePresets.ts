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
  opentopomap: {
    name: 'Terrain',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '© OpenTopoMap contributors',
  },
  carto_dark: {
    name: 'Carto Dark',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '© CARTO',
  },
  carto_light: {
    name: 'Carto Light',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '© CARTO',
  },
  cyclosm: {
    name: 'CyclOSM',
    url: 'https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',
    attribution: '© CyclOSM & OpenStreetMap',
  },
  alidade_smooth: {
    name: 'Alidade Smooth',
    url: 'https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png',
    attribution: '© Stadia Maps, © OpenMapTiles, © OSM contributors',
  },
  alidade_smooth_dark: {
    name: 'Alidade Smooth Dark',
    url: 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png',
    attribution: '© Stadia Maps, © OpenMapTiles, © OSM contributors',
  },
  bike_overlay: {
    name: 'Cycling Routes',
    url: 'https://tile.waymarkedtrails.org/cycling/{z}/{x}/{y}.png',
    attribution: '© Waymarked Trails',
  },
  hiking: {
    name: 'Hiking',
    url: 'https://tile.waymarkedtrails.org/hiking/{z}/{x}/{y}.png',
    attribution: '© Waymarked Trails',
  },
  none: {
    name: 'None',
    url: '',
    attribution: '&copy; Stadia Maps, &copy; OSM contributors',
  },
} as const;

export const DEFAULT_TILE_PRESET = TILE_PRESETS.standard;

export const MAP_SOURCE_PRESET_KEYS = [
  'standard',
  'satellite',
  'opentopomap',
  'carto_dark',
  'carto_light',
  'cyclosm',
  'alidade_smooth_dark',
  'alidade_smooth',
  'none',
] as const;

export const MAP_OVERLAY_PRESET_KEYS = ['none', 'bike_overlay', 'hiking'] as const;
