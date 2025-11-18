'use client';

import L from 'leaflet';
import { getRegionColorForCount } from '@/components/ActivityMap/drawRegions/utils/getRegionColorForCount';
import { logger } from '@/lib/logger/client';
import { Regions } from '@/lib/types';
import { RegionVisitData } from '@/lib/utils/regionVisitAnalyzer';

/**
 * renders region boundaries on a map with colors based on visit count
 * creates leaflet geojson layers with click handlers
 *
 * @param map - leaflet map instance
 * @param regions - regions to draw
 * @param visitData - visit statistics for coloring
 * @param onRegionClick - optional click handler for interaction
 * @param initialWeight - stroke width (default: 2)
 * @returns array of leaflet layers for cleanup
 */
export function drawRegions(
  map: any,
  regions: Regions[],
  visitData: Map<string, RegionVisitData>,
  onRegionClick?: (region: Regions, visitInfo: RegionVisitData | undefined, layer: any) => void,
  initialWeight: number = 2
): any[] {
  const startTime = performance.now();
  const layers: any[] = [];

  regions.forEach((region) => {
    const visit = visitData.get(region.id);
    const visited = !!visit?.visited && (visit?.visitCount ?? 0) > 0;

    // color based on visit count, or neutral if unvisited
    let fillColor = 'transparent';
    let strokeColor = '#666';

    if (visited && typeof visit?.visitCount === 'number') {
      const [r, g, b] = getRegionColorForCount(visit.visitCount);
      fillColor = `rgba(${r},${g},${b},0.35)`;
      strokeColor = `rgba(${r},${g},${b},1)`;
    }

    const layer = L.geoJSON(region.geometry, {
      style: {
        fillColor: visited ? fillColor : 'transparent',
        weight: initialWeight,
        opacity: 1,
        color: strokeColor,
        fillOpacity: visited ? 0.25 : 0,
        lineCap: 'round',
        lineJoin: 'round',
      },
      onEachFeature: (_feature, leafletLayer) => {
        if (onRegionClick) {
          leafletLayer.on('click', () => {
            onRegionClick(region, visit, leafletLayer);
          });
        }
      },
    }).addTo(map);

    layers.push(layer);
  });

  const duration = (performance.now() - startTime).toFixed(2);
  const visitedCount = Array.from(visitData.values()).filter((v) => v.visited).length;
  logger.debug(`[drawRegions] Visited ${visitedCount}/${regions.length} regions, ${duration}ms`);

  return layers;
}
