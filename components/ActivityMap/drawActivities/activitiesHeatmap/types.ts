import L from "leaflet";
import type {RefObject} from "react";

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

export interface HeatmapRefs {
    currentImageLayerRef: RefObject<L.ImageOverlay | null>;
    renderAbortRef: RefObject<boolean>;
    renderTimeoutRef: RefObject<NodeJS.Timeout | null>;
}

export interface PixelPoint {
    x: number;
    y: number;
}

/**
 * Defines a color threshold for activity heatmap rendering
 * @property threshold - The intensity threshold value
 * @property color - The RGBA color array associated with the threshold
 */
export interface ColorThreshold {
    threshold: number;
    color: number[];
}
