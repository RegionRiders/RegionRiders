export function drawSubdivisions(map: any, subdivisions: Subdivision[], onFeatureClick?: (feature: any) => void) {
    const L = require('leaflet');

    subdivisions.forEach((sub) => {
        try {
            const geoJSON = L.geoJSON(sub.geometry as any, {
                style: { color: '#333', weight: 1, opacity: 0.6, fillOpacity: 0.05 },
                renderer: L.canvas({ padding: 0.5 }),
                onEachFeature: (feature: any, layer: any) => {
                    layer.on('click', () => {
                        if (onFeatureClick) onFeatureClick({ type: 'subdivision', data: sub });
                    });
                    layer.bindPopup(`<strong>${sub.name}</strong><br>${sub.country}`);
                },
            });
            geoJSON.addTo(map);
        } catch (error) {
            console.error(`Error rendering subdivision ${sub.name}:`, error);
        }
    });
}
