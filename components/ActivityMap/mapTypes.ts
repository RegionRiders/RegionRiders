/**
 * RGB color tuple with values 0-255
 */
export type RGB = [r: number, g: number, b: number];

/**
 * RGBA color tuple with RGB values 0-255 and alpha 0-1
 */
export type RGBA = [r: number, g: number, b: number, a: number];

/**
 * Defines a color threshold for activity heatmap rendering
 * @property threshold - The intensity threshold value
 * @property color - The RGB or RGBA color array associated with the threshold
 */
export interface ColorThreshold {
  threshold: number;
  color: RGBA;
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
  /** Optional overlay tile layer URL pattern */
  overlayTileLayerUrl?: string;
  /** Optional overlay attribution text */
  overlayAttribution?: string;
  /** Apply grayscale filter to map source tile layer */
  mapSourceMonochrome?: boolean;
  /** Apply grayscale filter to map overlay tile layer */
  mapOverlayMonochrome?: boolean;
  /** Optional tint color applied above tile layers */
  mapTintColor?: RGBA;
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
