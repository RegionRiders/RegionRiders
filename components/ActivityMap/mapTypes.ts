/**
 * RGB color tuple with values 0-255
 */
export type RGB = [r: number, g: number, b: number];

/**
 * RGBA color tuple with RGB values 0-255 and alpha 0-255
 */
export type RGBA = [r: number, g: number, b: number, a: number];

/**
 * Defines a color threshold for activity heatmap rendering
 * @property threshold - The intensity threshold value
 * @property color - The RGB or RGBA color array associated with the threshold
 */
export interface ColorThreshold {
  threshold: number;
  color: RGB | RGBA;
}

/**
 * Leaflet map initialization options
 */
export interface LeafletConfig {
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

/**
 *  Heatmap rendering configuration options
 */
export interface HeatmapConfig {
  HEATMAP_RENDER_DELAY: number;
  PIXEL_DENSITY: number;
  ACTIVITY_LINE_THICKNESS: number;
  REGION_LINE_THICKNESS: number;
}
