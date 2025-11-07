import L from 'leaflet';
import { Subdivision } from '@/lib/types/types';

export function drawSubdivisions(
    map: any,
    subdivisions: Subdivision[],
    onRegionClick?: (subdivision: Subdivision, layer: any) => void,
    initialWeight: number = 2
): any[] {
    const layers: any[] = [];

    subdivisions.forEach((subdivision) => {
        const layer = L.geoJSON(subdivision.geometry, {
            style: {
                fillColor: 'transparent',
                weight: initialWeight,
                opacity: 1,
                color: '#666',
                fillOpacity: 0,
                lineCap: 'round',
                lineJoin: 'round',
            },
            onEachFeature: (feature, leafletLayer) => {
                if (onRegionClick) {
                    leafletLayer.on('click', () => {
                        onRegionClick(subdivision, leafletLayer);
                    });
                }
            },
        }).addTo(map);

        layers.push(layer);
    });

    return layers;
}
