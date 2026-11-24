'use client';

import { Popup, type Map as MapLibreMap, type MapMouseEvent, type PointLike } from 'maplibre-gl';
import { MAP_LAYER_IDS } from '@/components/ActivityMap/config/mapLayerIds';
import {
  ActivityLinesStyleOptions,
  simplifyCoordinatesRdp,
  WebGL2LinesLayer,
} from '@/components/ActivityMap/hooks/activity/activitiesLines/WebGL2LinesLayer';
import { GPXTrack } from '@/lib/types';

export type { ActivityLinesStyleOptions };
export { simplifyCoordinatesRdp };

const mountedLinesLayers = new WeakMap<MapLibreMap, WebGL2LinesLayer>();

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Updates paint/uniform options of the mounted WebGL2 activity lines layer in <1ms on GPU
 * without rebuilding geometry or spatial index.
 */
export function updateActivityLinesPaint(
  map: MapLibreMap,
  options: ActivityLinesStyleOptions
): void {
  const layer = mountedLinesLayers.get(map);
  if (layer) {
    layer.updateOptions(options);
  }
}

/**
 * Mounts the WebGL2 offscreen-FBO activity lines layer so `layerTransparency` applies
 * uniformly to the entire composited layer rather than per-line (avoiding alpha accumulation
 * on overlapping tracks). Hover and click hit-testing use an RBush spatial index with
 * rAF-coalesced pointer queries.
 *
 * Returns a cleanup function that removes listeners, popup, and layer.
 */
export function mountActivityLinesLayer(
  map: MapLibreMap,
  tracks: Map<string, GPXTrack>,
  options: ActivityLinesStyleOptions
): () => void {
  const layer = new WebGL2LinesLayer(tracks, options);
  mountedLinesLayers.set(map, layer);

  if (map.getLayer(MAP_LAYER_IDS.ACTIVITIES_LINES)) {
    map.removeLayer(MAP_LAYER_IDS.ACTIVITIES_LINES);
  }
  if (map.getLayer(MAP_LAYER_IDS.ACTIVITIES_LINES_HOVER)) {
    map.removeLayer(MAP_LAYER_IDS.ACTIVITIES_LINES_HOVER);
  }
  map.addLayer(layer);

  let pendingPoint: PointLike | null = null;
  let rafId: number | null = null;
  let activePopup: Popup | null = null;

  const cancelPendingHoverFrame = () => {
    pendingPoint = null;
    if (rafId !== null && typeof globalThis.cancelAnimationFrame === 'function') {
      globalThis.cancelAnimationFrame(rafId);
    }
    rafId = null;
  };

  const applyHover = (trackIndex: number) => {
    layer.setHoveredTrackIndex(trackIndex);
    const canvas = map.getCanvas?.();
    if (canvas) {
      canvas.style.cursor = trackIndex >= 0 ? 'pointer' : '';
    }
  };

  const clearHover = () => {
    cancelPendingHoverFrame();
    applyHover(-1);
  };

  const flushPendingHover = () => {
    rafId = null;
    const point = pendingPoint;
    pendingPoint = null;

    if (!point || !map.getLayer(MAP_LAYER_IDS.ACTIVITIES_LINES)) {
      return;
    }

    const pt = Array.isArray(point) ? { x: point[0], y: point[1] } : point;
    const hit = layer.hitTest(pt);
    applyHover(hit ? hit.trackIndex : -1);
  };

  const handleMouseMove = (event: MapMouseEvent) => {
    if (event.originalEvent?.buttons) {
      clearHover();
      return;
    }

    pendingPoint = event.point;

    if (typeof globalThis.requestAnimationFrame === 'function') {
      if (rafId === null) {
        rafId = globalThis.requestAnimationFrame(flushPendingHover);
      }
    } else {
      flushPendingHover();
    }
  };

  const handleMouseOut = () => {
    clearHover();
  };

  const handleDragStart = () => {
    clearHover();
  };

  const handleClick = (event: MapMouseEvent) => {
    const hit = layer.hitTest(event.point);
    if (!hit) {
      return;
    }

    const sanitized = escapeHtml(hit.name || hit.trackId || 'Unknown Activity');

    activePopup?.remove();
    activePopup = new Popup()
      .setLngLat(event.lngLat)
      .setHTML(
        `
          <div style="font-family: sans-serif; min-width: 150px;">
            <b>${sanitized}</b><br>
            <small style="color: #666;">Placeholder</small>
          </div>
        `
      )
      .addTo(map);
  };

  map.on('mousemove', handleMouseMove);
  map.on('mouseout', handleMouseOut);
  map.on('dragstart', handleDragStart);
  map.on('click', handleClick);

  return () => {
    clearHover();
    activePopup?.remove();
    activePopup = null;
    map.off('mousemove', handleMouseMove);
    map.off('mouseout', handleMouseOut);
    map.off('dragstart', handleDragStart);
    map.off('click', handleClick);

    if (mountedLinesLayers.get(map) === layer) {
      mountedLinesLayers.delete(map);
    }

    if (map.getLayer(MAP_LAYER_IDS.ACTIVITIES_LINES)) {
      map.removeLayer(MAP_LAYER_IDS.ACTIVITIES_LINES);
    }
  };
}
