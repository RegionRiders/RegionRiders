'use client';

import L from 'leaflet';
import { getRegionColorForCount } from '@/components/ActivityMap/drawRegions/utils/getRegionColorForCount';
import { Regions } from '@/lib/types';
import { RegionVisitData } from '@/lib/utils/regionVisitAnalyzer';

export type RegionRenderMode = 'heatmap' | 'lines';

/**
 * renders region boundaries on a map with colors based on visit count
 * creates leaflet geojson layers with click handlers
 *
 * @param map - leaflet map instance
 * @param regions - regions to draw
 * @param visitData - visit statistics for coloring
 * @param onRegionClick - optional click handler for interaction
 * @param initialWeight - stroke width (default: 2)
 * @param mode - display mode of the regions
 * @returns array of leaflet layers for cleanup
 */
export function drawRegions(
  map: L.Map,
  regions: Regions[],
  visitData: Map<string, RegionVisitData>,
  onRegionClick?: (
    region: Regions,
    visitInfo: RegionVisitData | undefined,
    layer: L.GeoJSON
  ) => void,
  initialWeight: number = 2,
  mode: RegionRenderMode = 'heatmap'
): L.GeoJSON[] {
  const layers: L.GeoJSON[] = [];

  regions.forEach((region) => {
    const visit = visitData.get(region.id);
    const visited = !!visit?.visited && (visit?.visitCount ?? 0) > 0;

    const fillColor = `rgba(100,100,100,0.25)`;
    const strokeColor = `rgba(100,100,100,1)`;

    // if (visited && typeof visit?.visitCount === 'number') {
    //   const [r, g, b, a] = getRegionColorForCount(visit.visitCount);
    //   fillColor = `rgba(${r},${g},${b},${a})`;
    //   strokeColor = `rgba(${r},${g},${b},1)`;
    // } else {
    //   const [r, g, b, a] = getRegionColorForCount(0);
    //   fillColor = `rgba(${r},${g},${b},${a})`;
    //   strokeColor = `rgba(${r},${g},${b},1)`;
    // }

    const layer = L.geoJSON(region.geometry, {
      style: {
        fillColor,
        weight: initialWeight,
        opacity: 1,
        color: strokeColor,
        fillOpacity: 1,
        lineCap: 'round',
        lineJoin: 'round',
      },
      onEachFeature: (_feature, leafletLayer) => {
        if (onRegionClick) {
          leafletLayer.on('click', () => {
            onRegionClick(region, visit, layer);
          });
        }
      },
    }).addTo(map);

    layers.push(layer);
  });

  return layers;
}
