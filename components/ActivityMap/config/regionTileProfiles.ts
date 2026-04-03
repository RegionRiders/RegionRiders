import { getApiUrl } from '@/lib/client';
import { RegionRenderProfile } from '@/lib/services/maps/selectRenderProfile';

export interface RegionTileProfileConfig {
  sourceUrl: string;
  layerName: string;
  paneName: string;
  minZoom: number;
  maxZoom: number;
  style: {
    color: string;
    weight: number;
    fillColor: string;
    fillOpacity: number;
    opacity: number;
  };
}

const BASE_TILESET_PATH = '/api/regions/tiles/v1/{z}/{x}/{y}.pbf';

const REGION_TILE_PROFILES: Record<RegionRenderProfile, RegionTileProfileConfig> = {
  mobile: {
    sourceUrl: getApiUrl(BASE_TILESET_PATH),
    layerName: 'regions',
    paneName: 'regionsPane',
    minZoom: 4,
    maxZoom: 12,
    style: {
      color: '#c51b1f',
      weight: 1,
      fillColor: '#c51b1f',
      fillOpacity: 0.08,
      opacity: 0.9,
    },
  },
  desktop: {
    sourceUrl: getApiUrl(BASE_TILESET_PATH),
    layerName: 'regions',
    paneName: 'regionsPane',
    minZoom: 3,
    maxZoom: 14,
    style: {
      color: '#d7301f',
      weight: 1.5,
      fillColor: '#d7301f',
      fillOpacity: 0.1,
      opacity: 1,
    },
  },
};

export function getRegionTileProfileConfig(profile: RegionRenderProfile): RegionTileProfileConfig {
  return REGION_TILE_PROFILES[profile];
}
