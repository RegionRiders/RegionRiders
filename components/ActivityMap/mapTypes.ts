/**
 * Defines a color threshold for activity heatmap rendering
 * @property threshold - The intensity threshold value
 * @property color - The RGBA color array associated with the threshold
 */
export interface ColorThreshold {
  threshold: number;
  color: number[];
}

/**
 * Leaflet map initialization options
 */
export interface MapConfig {
  /** Default map center [lat, lng] */
  center: [number, number];
  zoom: number;
  maxZoom: number;
  minZoom: number;
  /** Tile layer URL pattern with {z}/{x}/{y} placeholders */
  tileLayerUrl: string;
  /** Attribution text for map tiles */
  attribution: string;
}
