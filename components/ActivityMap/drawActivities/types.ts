import type { RefObject } from 'react';
import L from 'leaflet';

export interface CanvasDimensions {
  canvasWidth: number;
  canvasHeight: number;
  topLeft: L.Point;
  bottomRight: L.Point;
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
}

// Shared render refs
export interface RenderRefs {
  renderAbortRef: RefObject<boolean>;
  renderTimeoutRef: RefObject<NodeJS.Timeout | null>;
}

// Heatmap-specific refs
export interface HeatmapRefs extends RenderRefs {
  currentImageLayerRef: RefObject<L.ImageOverlay | null>;
}

// Line-specific refs (for lines module)
export interface LinesRefs extends RenderRefs {}
// Can be extended later if you add more line-only refs

export interface PixelPoint {
  x: number;
  y: number;
}
