import L from 'leaflet';
import { HEATMAP_CONFIG } from '@/components/ActivityMap/config/mapConfig';
import { PixelPoint } from '@/components/ActivityMap/hooks/activityRendering/activityTypes';

/**
 * Creates a converter function that transforms lat/lng coordinates to pixel coordinates
 * relative to a given top-left origin point
 *
 * @param map - Leaflet map instance
 * @param topLeft - Top-left reference point in pixel coordinates
 * @param pixelDensity - Pixel density of the canvas
 * @returns Function that converts lat/lng to pixel coordinates
 */
export function createLatLngToPixelConverter(
  map: L.Map,
  topLeft: L.Point,
  pixelDensity: number
): (lat: number, lon: number) => PixelPoint {
  return (lat: number, lon: number): PixelPoint => {
    const point = map.project({ lat, lng: lon }, map.getZoom());
    return {
      x: (point.x - topLeft.x) * pixelDensity,
      y: (point.y - topLeft.y) * pixelDensity,
    };
  };
}
