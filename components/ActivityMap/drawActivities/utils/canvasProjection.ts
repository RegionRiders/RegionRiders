import { MAP_CONFIG } from "@/components/ActivityMap/config/mapConfig";

export function createLatLngToPixelConverter(
    map: any,
    topLeft: any
): (lat: number, lon: number) => { x: number; y: number } {
    return (lat: number, lon: number) => {
        const point = map.project({ lat, lng: lon }, map.getZoom());
        return {
            x: (point.x - topLeft.x) * MAP_CONFIG.PIXEL_DENSITY,
            y: (point.y - topLeft.y) * MAP_CONFIG.PIXEL_DENSITY,
        };
    };
}
