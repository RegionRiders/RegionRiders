// components/ActivityMap/drawRegions/drawRegions.ts
'use client';

import L from 'leaflet';
import { Regions } from '@/lib/types/types';
import {getRegionColorForCount} from "@/components/ActivityMap/drawRegions/utils/getRegionColorForCount";
import {RegionVisitData} from "@/lib/utils/regionVisitAnalyzer";

export function drawRegions(
    map: any,
    regions: Regions[],
    visitData: Map<string, RegionVisitData>,
    onRegionClick?: (region: Regions, visitInfo: RegionVisitData | undefined, layer: any) => void,
    initialWeight: number = 2
): any[] {
    const startTime = performance.now();
    console.log(`🖍️ [drawregions] Drawing ${regions.length} regions with weight=${initialWeight.toFixed(2)}`);

    const layers: any[] = [];

    regions.forEach((region) => {
        const visit = visitData.get(region.id);
        const visited = !!visit?.visited && (visit?.visitCount ?? 0) > 0;

        // Derive colors from visit count when visited, otherwise use neutral stroke
        let fillColor = 'transparent';
        let strokeColor = '#666';

        if (visited && typeof visit?.visitCount === 'number') {
            const [r, g, b] = getRegionColorForCount(visit.visitCount);
            fillColor = `rgba(${r},${g},${b},0.35)`; // semi-transparent region fill
            strokeColor = `rgba(${r},${g},${b},1)`;   // colored outline
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
    console.log(`✅ [drawregions] Complete (${layers.length} layers, ${visitedCount} visited, ${duration}ms)`);

    return layers;
}
