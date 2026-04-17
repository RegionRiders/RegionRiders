import { getRegionTileSourceUrl } from '@/components/ActivityMap/config/regionTileSource';
import { RegionRenderProfile } from '@/lib/services/maps/selectRenderProfile';

export interface RegionTileProfileConfig {
  sourceUrl: string;
  layerName: string;
  paneName: string;
  minZoom: number;
  detailCapZoom: number;
  displayMaxZoom: number;
  strokeFadeStartZoom: number;
  strokeHideBelowZoom: number;
  minimumLowDetailFillOpacity: number;
  style: {
    color: string;
    weight: number;
    fillColor: string;
    fillOpacity: number;
    opacity: number;
  };
}

const REGION_TILE_PROFILES: Record<RegionRenderProfile, RegionTileProfileConfig> = {
  mobile: {
    sourceUrl: '',
    layerName: 'regions',
    paneName: 'regionsPane',
    minZoom: 4,
    detailCapZoom: 12,
    displayMaxZoom: 18,
    strokeFadeStartZoom: 7,
    strokeHideBelowZoom: 5,
    minimumLowDetailFillOpacity: 0.14,
    style: {
      color: '#0A7E43',
      weight: 1,
      fillColor: '#0A7E43',
      fillOpacity: 0.08,
      opacity: 0.9,
    },
  },
  desktop: {
    sourceUrl: '',
    layerName: 'regions',
    paneName: 'regionsPane',
    minZoom: 3,
    detailCapZoom: 12,
    displayMaxZoom: 18,
    strokeFadeStartZoom: 6,
    strokeHideBelowZoom: 4,
    minimumLowDetailFillOpacity: 0.14,
    style: {
      color: '#0A7E43',
      weight: 1.5,
      fillColor: '#0A7E43',
      fillOpacity: 0.1,
      opacity: 1,
    },
  },
};

export function getRegionTileProfileConfig(profile: RegionRenderProfile): RegionTileProfileConfig {
  return {
    ...REGION_TILE_PROFILES[profile],
    sourceUrl: getRegionTileSourceUrl(),
  };
}
