export type RegionZoomAnimationEvent = {
  zoom?: number;
};

export type RegionZoomState = {
  currentZoom: number;
  committedStyleZoom: number;
  visibleStyleZoom: number;
  pendingCommitZoom: number | null;
  pendingTileZoom: number | null;
  pendingTileReady: boolean;
};

export function clearPendingZoomState(zoomState: RegionZoomState): void {
  zoomState.pendingCommitZoom = null;
  zoomState.pendingTileZoom = null;
  zoomState.pendingTileReady = false;
}

export function getVisibleStyleZoom(
  zoomState: RegionZoomState,
  fallbackZoom: number
): number {
  return (
    zoomState.visibleStyleZoom ||
    zoomState.committedStyleZoom ||
    zoomState.currentZoom ||
    fallbackZoom
  );
}

export function syncVisibleZoom(
  zoomState: RegionZoomState,
  nextZoom: number
): void {
  zoomState.currentZoom = nextZoom;
  zoomState.visibleStyleZoom = nextZoom;
}

export function preparePendingCommit(
  nextZoom: number,
  zoomState: RegionZoomState,
  detailCapZoom: number
): void {
  const nextTileZoom = Math.min(nextZoom, detailCapZoom);
  const committedTileZoom = Math.min(zoomState.committedStyleZoom || nextZoom, detailCapZoom);

  // Reusing the same native tile zoom does not require waiting for another batch.
  if (nextZoom === zoomState.committedStyleZoom || nextTileZoom === committedTileZoom) {
    zoomState.committedStyleZoom = nextZoom;
    clearPendingZoomState(zoomState);
    return;
  }

  zoomState.pendingCommitZoom = nextZoom;
  zoomState.pendingTileZoom = nextTileZoom;
  zoomState.pendingTileReady = false;
}

export function markPendingTileReady(
  zoomState: RegionZoomState,
  tileZoom: number | undefined
): void {
  if (tileZoom === undefined || zoomState.pendingTileZoom === null) {
    return;
  }

  if (tileZoom === zoomState.pendingTileZoom) {
    zoomState.pendingTileReady = true;
  }
}

export function commitPendingZoom(zoomState: RegionZoomState): void {
  if (zoomState.pendingCommitZoom === null || !zoomState.pendingTileReady) {
    return;
  }

  zoomState.committedStyleZoom = zoomState.pendingCommitZoom;
  clearPendingZoomState(zoomState);
}
