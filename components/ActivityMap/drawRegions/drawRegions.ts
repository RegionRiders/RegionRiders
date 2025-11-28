'use client';

import L from 'leaflet';
import { getRegionColorForCount } from '@/components/ActivityMap/drawRegions/utils/getRegionColorForCount';
import { createComponentLogger } from '@/lib/logger/client';
import { Regions } from '@/lib/types';
import { RegionVisitData } from '@/lib/utils/regionVisitAnalyzer';

const logger = createComponentLogger('drawRegions');

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

    let fillColor = 'transparent';
    let strokeColor = '#000';

    if (visited && typeof visit?.visitCount === 'number') {
      const [r, g, b, a] = getRegionColorForCount(visit.visitCount);
      fillColor = `rgba(${r},${g},${b},${a})`;
      strokeColor = `rgba(${r},${g},${b},1)`;
    }

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
            onRegionClick(region, visit, leafletLayer);
          });
        }
      },
    }).addTo(map);

    layers.push(layer);
  });

  if (process.env.NODE_ENV === 'development') {
    const duration = (performance.now() - startTime).toFixed(2);
    const visitedCount = Array.from(visitData.values()).filter((v) => v.visited).length;
    logger.debug(`Visited ${visitedCount}/${regions.length} regions, ${duration}ms`);
  }

  return layers;
}
