'use client';

import {
  Popup,
  type ExpressionSpecification,
  type GeoJSONSource,
  type MapLayerMouseEvent,
  type Map as MapLibreMap,
  type MapMouseEvent,
  type PointLike,
} from 'maplibre-gl';
import { MAP_LAYER_IDS, MAP_SOURCE_IDS } from '@/components/ActivityMap/config/mapLayerIds';
import { getActivityLinePixelWidthFromControl } from '@/components/ActivityMap/hooks/activity/utils/activityThickness';
import { RGBA } from '@/components/ActivityMap/mapTypes';
import { GPXTrack } from '@/lib/types';

export interface ActivityLinesStyleOptions {
  lineThickness: number;
  lineColor: RGBA;
  lineHoverColor: RGBA;
  layerTransparency: number;
}

/**
 * Douglas-Peucker simplification tolerance in degrees (~8m at mid-latitudes).
 * Removes 1-second GPS jitter kinks that create sharp visual artifacts and reduces
 * GeoJSON vertex count by ~75-85% for instant worker tiling.
 */
const RDP_SIMPLIFY_TOLERANCE_DEG = 0.00008;
const RDP_SIMPLIFY_TOLERANCE_SQ = RDP_SIMPLIFY_TOLERANCE_DEG * RDP_SIMPLIFY_TOLERANCE_DEG;

function rgbaToCss([r, g, b, a]: RGBA): string {
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${Math.max(0, Math.min(1, a))})`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function sqPointToSegmentDist(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  let x = x1;
  let y = y1;
  let dx = x2 - x1;
  let dy = y2 - y1;

  if (dx !== 0 || dy !== 0) {
    const t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy);
    if (t > 1) {
      x = x2;
      y = y2;
    } else if (t > 0) {
      x += dx * t;
      y += dy * t;
    }
  }

  dx = px - x;
  dy = py - y;
  return dx * dx + dy * dy;
}

/**
 * Iterative Ramer-Douglas-Peucker simplification on [lon, lat] coordinates
 * (non-recursive so long 25,000+ point tracks never risk stack overflow).
 */
export function simplifyCoordinatesRdp(
  coords: [number, number][],
  toleranceSq: number = RDP_SIMPLIFY_TOLERANCE_SQ
): [number, number][] {
  const len = coords.length;
  if (len <= 2 || toleranceSq <= 0) {
    return coords;
  }

  const keep = new Uint8Array(len);
  keep[0] = 1;
  keep[len - 1] = 1;

  const stack: number[] = [0, len - 1];

  while (stack.length > 0) {
    const end = stack.pop()!;
    const start = stack.pop()!;

    let maxSqDist = 0;
    let index = -1;
    const [x1, y1] = coords[start];
    const [x2, y2] = coords[end];

    for (let i = start + 1; i < end; i++) {
      const sqDist = sqPointToSegmentDist(coords[i][0], coords[i][1], x1, y1, x2, y2);
      if (sqDist > maxSqDist) {
        index = i;
        maxSqDist = sqDist;
      }
    }

    if (maxSqDist > toleranceSq && index !== -1) {
      keep[index] = 1;
      stack.push(start, index, index, end);
    }
  }

  const result: [number, number][] = [];
  for (let i = 0; i < len; i++) {
    if (keep[i]) {
      result.push(coords[i]);
    }
  }
  return result;
}

const simplifiedGeoJsonCache = new WeakMap<
  Map<string, GPXTrack>,
  { size: number; geojson: GeoJSON.FeatureCollection }
>();

export function tracksToGeoJson(tracks: Map<string, GPXTrack>): GeoJSON.FeatureCollection {
  const cached = simplifiedGeoJsonCache.get(tracks);
  if (cached && cached.size === tracks.size) {
    return cached.geojson;
  }

  const features: GeoJSON.Feature<GeoJSON.LineString>[] = [];
  let featureId = 1;

  tracks.forEach((track, trackId) => {
    if (!track.points || track.points.length < 2) {
      return;
    }

    const rawCoordinates: [number, number][] = [];
    for (let i = 0; i < track.points.length; i++) {
      const point = track.points[i];
      if (Number.isFinite(point.lon) && Number.isFinite(point.lat)) {
        rawCoordinates.push([point.lon, point.lat]);
      }
    }

    if (rawCoordinates.length < 2) {
      return;
    }

    const coordinates = simplifyCoordinatesRdp(rawCoordinates);
    if (coordinates.length < 2) {
      return;
    }

    features.push({
      type: 'Feature',
      id: featureId++,
      properties: {
        trackId,
        name: track.name || trackId || 'Unknown Activity',
      },
      geometry: {
        type: 'LineString',
        coordinates,
      },
    });
  });

  const geojson: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features,
  };

  simplifiedGeoJsonCache.set(tracks, { size: tracks.size, geojson });
  return geojson;
}

export function buildActivityLinesPaint(options: ActivityLinesStyleOptions) {
  const baseWidth = getActivityLinePixelWidthFromControl(options.lineThickness);
  const hoverWidth = baseWidth * 2;
  const normalColor = rgbaToCss(options.lineColor);
  const hoverColor = rgbaToCss(options.lineHoverColor);
  const opacity = Math.max(0, Math.min(1, options.layerTransparency ?? 1));
  const hoverOpacity = opacity === 0 ? 0 : Math.min(1, Math.max(opacity, 0.85));

  return {
    base: {
      'line-color': normalColor,
      'line-width': baseWidth,
      // Hide the hovered feature in the base layer on the exact same frame it appears
      // in the top hover layer so the line is replaced rather than double-rendered.
      'line-opacity': [
        'case',
        ['boolean', ['feature-state', 'hover'], false],
        0,
        opacity,
      ] as ExpressionSpecification,
    },
    hover: {
      'line-color': hoverColor,
      // Zero width + zero opacity for non-hovered features so the GPU culls them
      // while sharing the exact same LineBucket geometry (no filter -> zero worker re-tiling).
      'line-width': [
        'case',
        ['boolean', ['feature-state', 'hover'], false],
        hoverWidth,
        0,
      ] as ExpressionSpecification,
      'line-opacity': [
        'case',
        ['boolean', ['feature-state', 'hover'], false],
        hoverOpacity,
        0,
      ] as ExpressionSpecification,
    },
  };
}

/**
 * Updates paint properties of the base and top-most hover activity line layers in <1ms on GPU
 * without rebuilding GeoJSON or re-tiling in the MapLibre worker.
 */
export function updateActivityLinesPaint(
  map: MapLibreMap,
  options: ActivityLinesStyleOptions
): void {
  const paint = buildActivityLinesPaint(options);

  if (map.getLayer(MAP_LAYER_IDS.ACTIVITIES_LINES)) {
    map.setPaintProperty(MAP_LAYER_IDS.ACTIVITIES_LINES, 'line-color', paint.base['line-color']);
    map.setPaintProperty(MAP_LAYER_IDS.ACTIVITIES_LINES, 'line-width', paint.base['line-width']);
    map.setPaintProperty(
      MAP_LAYER_IDS.ACTIVITIES_LINES,
      'line-opacity',
      paint.base['line-opacity']
    );
  }

  if (map.getLayer(MAP_LAYER_IDS.ACTIVITIES_LINES_HOVER)) {
    map.setPaintProperty(
      MAP_LAYER_IDS.ACTIVITIES_LINES_HOVER,
      'line-color',
      paint.hover['line-color']
    );
    map.setPaintProperty(
      MAP_LAYER_IDS.ACTIVITIES_LINES_HOVER,
      'line-width',
      paint.hover['line-width']
    );
    map.setPaintProperty(
      MAP_LAYER_IDS.ACTIVITIES_LINES_HOVER,
      'line-opacity',
      paint.hover['line-opacity']
    );
  }
}

/**
 * Mounts the GPU GeoJSON line layer and a top-most hover highlight layer sharing the same
 * source and LineBucket geometry. Hover state is driven exclusively via synchronous
 * `feature-state` updates coalesced to one `requestAnimationFrame` per frame so hovering is
 * instantaneous across all tiles, replaces the base line cleanly, and never queues worker
 * re-tiling on rapid cursor sweeps.
 *
 * Returns a cleanup function that removes listeners, popup, layers, and source.
 */
export function mountActivityLinesLayer(
  map: MapLibreMap,
  tracks: Map<string, GPXTrack>,
  options: ActivityLinesStyleOptions
): () => void {
  const geojson = tracksToGeoJson(tracks);
  const paint = buildActivityLinesPaint(options);
  let hoveredId: string | number | null = null;
  let pendingPoint: PointLike | null = null;
  let rafId: number | null = null;
  let activePopup: Popup | null = null;

  const existingSource = map.getSource(MAP_SOURCE_IDS.ACTIVITIES_LINES) as
    | GeoJSONSource
    | undefined;

  if (existingSource && typeof existingSource.setData === 'function') {
    map.removeFeatureState?.({ source: MAP_SOURCE_IDS.ACTIVITIES_LINES });
    existingSource.setData(geojson);
  } else {
    map.addSource(MAP_SOURCE_IDS.ACTIVITIES_LINES, {
      type: 'geojson',
      data: geojson,
      maxzoom: 16,
      tolerance: 0.375,
    });
  }

  if (!map.getLayer(MAP_LAYER_IDS.ACTIVITIES_LINES)) {
    map.addLayer({
      id: MAP_LAYER_IDS.ACTIVITIES_LINES,
      type: 'line',
      source: MAP_SOURCE_IDS.ACTIVITIES_LINES,
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
      paint: paint.base,
    });
  } else {
    updateActivityLinesPaint(map, options);
  }

  // Dedicated hover layer placed strictly ABOVE all other lines.
  // Intentionally omits `filter` and matches `layout` so MapLibre shares a single LineBucket
  // between base and hover layers, and `setFeatureState` updates both in <1ms on the GPU.
  if (!map.getLayer(MAP_LAYER_IDS.ACTIVITIES_LINES_HOVER)) {
    map.addLayer({
      id: MAP_LAYER_IDS.ACTIVITIES_LINES_HOVER,
      type: 'line',
      source: MAP_SOURCE_IDS.ACTIVITIES_LINES,
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
      paint: paint.hover,
    });
  }

  const cancelPendingHoverFrame = () => {
    pendingPoint = null;
    if (rafId !== null && typeof globalThis.cancelAnimationFrame === 'function') {
      globalThis.cancelAnimationFrame(rafId);
    }
    rafId = null;
  };

  const applyHover = (nextHoveredId: string | number | null) => {
    if (hoveredId === nextHoveredId) {
      return;
    }

    const hasSource = Boolean(map.getSource(MAP_SOURCE_IDS.ACTIVITIES_LINES));

    if (hoveredId !== null && hasSource) {
      map.setFeatureState(
        { source: MAP_SOURCE_IDS.ACTIVITIES_LINES, id: hoveredId },
        { hover: false }
      );
    }

    hoveredId = nextHoveredId;

    if (hoveredId !== null && hasSource) {
      map.setFeatureState(
        { source: MAP_SOURCE_IDS.ACTIVITIES_LINES, id: hoveredId },
        { hover: true }
      );
    }

    const canvas = map.getCanvas?.();
    if (canvas) {
      canvas.style.cursor = hoveredId !== null ? 'pointer' : '';
    }
  };

  const clearHover = () => {
    cancelPendingHoverFrame();
    applyHover(null);
  };

  const flushPendingHover = () => {
    rafId = null;
    const point = pendingPoint;
    pendingPoint = null;

    if (!point || !map.getLayer(MAP_LAYER_IDS.ACTIVITIES_LINES)) {
      return;
    }

    const features = map.queryRenderedFeatures(point, {
      layers: [MAP_LAYER_IDS.ACTIVITIES_LINES],
    });
    const feature = features[0];
    const nextHoveredId = feature?.id !== undefined && feature.id !== null ? feature.id : null;
    applyHover(nextHoveredId);
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

  const handleClick = (event: MapLayerMouseEvent) => {
    const feature = event.features?.[0];
    if (!feature) {
      return;
    }

    const displayName = String(
      feature.properties?.name || feature.properties?.trackId || 'Unknown Activity'
    );
    const sanitized = escapeHtml(displayName);

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
  map.on('click', MAP_LAYER_IDS.ACTIVITIES_LINES, handleClick);

  return () => {
    clearHover();
    activePopup?.remove();
    activePopup = null;
    map.off('mousemove', handleMouseMove);
    map.off('mouseout', handleMouseOut);
    map.off('dragstart', handleDragStart);
    map.off('click', MAP_LAYER_IDS.ACTIVITIES_LINES, handleClick);

    if (map.getLayer(MAP_LAYER_IDS.ACTIVITIES_LINES_HOVER)) {
      map.removeLayer(MAP_LAYER_IDS.ACTIVITIES_LINES_HOVER);
    }
    if (map.getLayer(MAP_LAYER_IDS.ACTIVITIES_LINES)) {
      map.removeLayer(MAP_LAYER_IDS.ACTIVITIES_LINES);
    }
    if (map.getSource(MAP_SOURCE_IDS.ACTIVITIES_LINES)) {
      map.removeSource(MAP_SOURCE_IDS.ACTIVITIES_LINES);
    }
  };
}
