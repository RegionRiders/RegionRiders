import { RegionTileConfig } from './regionStyleHelpers';

export type RegionZoomAnimationEvent = {
  zoom?: number;
};

export type RegionZoomState = {
  currentZoom: number;
  committedStyleZoom: number;
  displayStyleZoom: number;
  pendingStyleZoom: number | null;
  pendingTileZoom: number | null;
  pendingTileReady: boolean;
};

export function clearPendingZoomState(zoomState: RegionZoomState): void {
  zoomState.pendingStyleZoom = null;
  zoomState.pendingTileZoom = null;
  zoomState.pendingTileReady = false;
}

export function getResolvedStyleZoom(
  config: RegionTileConfig,
  zoomState: RegionZoomState
): number {
  return (
    zoomState.displayStyleZoom ||
    zoomState.committedStyleZoom ||
    zoomState.currentZoom ||
    config.detailCapZoom
  );
}

export function getDisplayZoomForLiveUpdate(
  nextZoom: number,
  zoomState: RegionZoomState
): number {
  const settledZoom = zoomState.committedStyleZoom || nextZoom;
  return nextZoom < settledZoom ? nextZoom : settledZoom;
}
