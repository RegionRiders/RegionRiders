'use client';

import L from 'leaflet';
import { Subdivision } from '@/lib/types/types';

export function drawSubdivisions(
    map: any,
    subdivisions: Subdivision[],
    visitData: Map<string, any>,
    onRegionClick?: (subdivision: Subdivision, visitInfo: any, layer: any) => void,
    initialWeight: number = 2
): any[] {
    const startTime = performance.now();
    console.log(`🖍️ [drawSubdivisions] Drawing ${subdivisions.length} regions with weight=${initialWeight.toFixed(2)}`);

    const layers: any[] = [];

    subdivisions.forEach((subdivision) => {
        const visit = visitData.get(subdivision.id);
        const color = visit?.color || '#666';
        const visited = visit?.visited || false;

        const layer = L.geoJSON(subdivision.geometry, {
            style: {
                fillColor: visited ? '#86efac' : 'transparent',
                weight: initialWeight,
                opacity: visited ? 1 : 1,
                color: color,
                fillOpacity: visited ? 0.15 : 0,
                lineCap: 'round',
                lineJoin: 'round',
            },
            onEachFeature: (feature, leafletLayer) => {
                if (onRegionClick) {
                    leafletLayer.on('click', () => {
                        onRegionClick(subdivision, visit!, leafletLayer);
                    });
                }
            },
        }).addTo(map);

        layers.push(layer);
    });

    const duration = (performance.now() - startTime).toFixed(2);
    const visitedCount = Array.from(visitData.values()).filter(v => v.visited).length;
    console.log(`✅ [drawSubdivisions] Complete (${layers.length} layers, ${visitedCount} visited, ${duration}ms)`);

    return layers;
}
