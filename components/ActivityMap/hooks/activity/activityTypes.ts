import type { RefObject } from 'react';
import L from 'leaflet';
import { ColorThreshold, RGBA } from '@/components/ActivityMap/mapTypes';

export interface CanvasDimensions {
  canvasWidth: number;
  canvasHeight: number;
  topLeft: L.Point;
  bottomRight: L.Point;
}

export interface PixelBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface RenderState {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  accumulator: Float32Array;
  bounds: L.LatLngBounds;
  canvasWidth: number;
  canvasHeight: number;
  topLeft: L.Point;
  currentZoom: number;
  renderStartTime: number;
  touchedBounds: PixelBounds | null;
}

// Shared render refs
export interface RenderRefs {
  renderAbortRef: RefObject<boolean>;
  renderTimeoutRef: RefObject<ReturnType<typeof setTimeout> | null>;
}

// Heatmap-specific refs
export interface HeatmapRefs extends RenderRefs {
  currentImageLayerRef: RefObject<L.ImageOverlay | null>;
  currentImageUrlRef: RefObject<string | null>;
  activeRenderIdRef: RefObject<number>;
  heatmapDensity: number;
  lineThickness: number;
  layerTransparency: number;
  heatmapColorThresholds?: ColorThreshold[];
}

// Line-specific refs (for lines module)
export interface LinesRefs extends RenderRefs {
  lineThickness: number;
  lineColor: RGBA;
  lineHoverColor: RGBA;
  layerTransparency: number;
}

export interface PixelPoint {
  x: number;
  y: number;
}
