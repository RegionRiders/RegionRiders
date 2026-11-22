'use client';

import {
  Popup,
  type ExpressionSpecification,
  type GeoJSONSource,
  type MapLayerMouseEvent,
  type Map as MapLibreMap,
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

export function tracksToGeoJson(tracks: Map<string, GPXTrack>): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature<GeoJSON.LineString>[] = [];
  let featureId = 1;

  tracks.forEach((track, trackId) => {
    if (!track.points || track.points.length < 2) {
      return;
    }

    const coordinates: [number, number][] = [];
    for (const point of track.points) {
      if (Number.isFinite(point.lon) && Number.isFinite(point.lat)) {
        coordinates.push([point.lon, point.lat]);
      }
    }

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

  return {
    type: 'FeatureCollection',
    features,
  };
}

export function buildActivityLinesPaint(options: ActivityLinesStyleOptions) {
  const baseWidth = getActivityLinePixelWidthFromControl(options.lineThickness);
  const hoverWidth = baseWidth * 2;
  const normalColor = rgbaToCss(options.lineColor);
  const hoverColor = rgbaToCss(options.lineHoverColor);
  const opacity = Math.max(0, Math.min(1, options.layerTransparency ?? 1));

  return {
    'line-color': [
      'case',
      ['boolean', ['feature-state', 'hover'], false],
      hoverColor,
      normalColor,
    ] as ExpressionSpecification,
    'line-width': [
      'case',
      ['boolean', ['feature-state', 'hover'], false],
      hoverWidth,
      baseWidth,
    ] as ExpressionSpecification,
    'line-opacity': opacity,
  };
}

/**
 * Mounts or updates the GPU GeoJSON line layer for activities with hover highlight and click popup.
 * Returns a cleanup function that removes listeners, popup, layer, and source.
 */
export function mountActivityLinesLayer(
  map: MapLibreMap,
  tracks: Map<string, GPXTrack>,
  options: ActivityLinesStyleOptions
): () => void {
  const geojson = tracksToGeoJson(tracks);
  const paint = buildActivityLinesPaint(options);
  let hoveredId: string | number | null = null;
  let activePopup: Popup | null = null;

  const existingSource = map.getSource(MAP_SOURCE_IDS.ACTIVITIES_LINES) as
    | GeoJSONSource
    | undefined;

  if (existingSource && typeof existingSource.setData === 'function') {
    existingSource.setData(geojson);
  } else {
    map.addSource(MAP_SOURCE_IDS.ACTIVITIES_LINES, {
      type: 'geojson',
      data: geojson,
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
      paint,
    });
  } else {
    map.setPaintProperty(MAP_LAYER_IDS.ACTIVITIES_LINES, 'line-color', paint['line-color']);
    map.setPaintProperty(MAP_LAYER_IDS.ACTIVITIES_LINES, 'line-width', paint['line-width']);
    map.setPaintProperty(MAP_LAYER_IDS.ACTIVITIES_LINES, 'line-opacity', paint['line-opacity']);
  }

  const clearHover = () => {
    if (hoveredId !== null && map.getSource(MAP_SOURCE_IDS.ACTIVITIES_LINES)) {
      map.setFeatureState(
        { source: MAP_SOURCE_IDS.ACTIVITIES_LINES, id: hoveredId },
        { hover: false }
      );
      hoveredId = null;
    }
    const canvas = map.getCanvas?.();
    if (canvas) {
      canvas.style.cursor = '';
    }
  };

  const handleMouseMove = (event: MapLayerMouseEvent) => {
    const feature = event.features?.[0];
    if (!feature || feature.id === undefined) {
      clearHover();
      return;
    }

    if (hoveredId !== null && hoveredId !== feature.id) {
      map.setFeatureState(
        { source: MAP_SOURCE_IDS.ACTIVITIES_LINES, id: hoveredId },
        { hover: false }
      );
    }

    hoveredId = feature.id;
    map.setFeatureState(
      { source: MAP_SOURCE_IDS.ACTIVITIES_LINES, id: hoveredId },
      { hover: true }
    );

    const canvas = map.getCanvas?.();
    if (canvas) {
      canvas.style.cursor = 'pointer';
    }
  };

  const handleMouseLeave = () => {
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

  map.on('mousemove', MAP_LAYER_IDS.ACTIVITIES_LINES, handleMouseMove);
  map.on('mouseleave', MAP_LAYER_IDS.ACTIVITIES_LINES, handleMouseLeave);
  map.on('click', MAP_LAYER_IDS.ACTIVITIES_LINES, handleClick);

  return () => {
    clearHover();
    activePopup?.remove();
    activePopup = null;
    map.off('mousemove', MAP_LAYER_IDS.ACTIVITIES_LINES, handleMouseMove);
    map.off('mouseleave', MAP_LAYER_IDS.ACTIVITIES_LINES, handleMouseLeave);
    map.off('click', MAP_LAYER_IDS.ACTIVITIES_LINES, handleClick);

    if (map.getLayer(MAP_LAYER_IDS.ACTIVITIES_LINES)) {
      map.removeLayer(MAP_LAYER_IDS.ACTIVITIES_LINES);
    }
    if (map.getSource(MAP_SOURCE_IDS.ACTIVITIES_LINES)) {
      map.removeSource(MAP_SOURCE_IDS.ACTIVITIES_LINES);
    }
  };
}
