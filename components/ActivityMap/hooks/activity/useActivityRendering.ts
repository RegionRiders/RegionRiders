'use client';

import { useEffect, useRef } from 'react';
import type { Map as MapLibreMap } from 'maplibre-gl';
import { MAP_LAYER_IDS } from '@/components/ActivityMap/config/mapLayerIds';
import {
  ActivityRenderMode,
  LineColorSwatch,
} from '@/components/ActivityMap/controls/LayersPanel/types';
import { WebGL2HeatmapLayer } from '@/components/ActivityMap/hooks/activity/activitiesHeatmap/WebGL2HeatmapLayer';
import {
  mountActivityLinesLayer,
  updateActivityLinesPaint,
} from '@/components/ActivityMap/hooks/activity/activitiesLines/activityLinesLayer';
import { normalizeActivityThicknessControl } from '@/components/ActivityMap/hooks/activity/utils/activityThickness';
import { ColorThreshold } from '@/components/ActivityMap/mapTypes';
import { createComponentLogger } from '@/lib/logger/client';
import { GPXTrack } from '@/lib/types';

const logger = createComponentLogger('useActivityRendering');

export function useActivityRendering(
  map: MapLibreMap | null,
  tracks: Map<string, GPXTrack>,
  showActivities: boolean = true,
  mode: ActivityRenderMode = 'heatmap',
  activityThickness: number = 3,
  activityLayerTransparency: number = 1,
  heatmapDensity: number = 2,
  activityLineColor: LineColorSwatch = {
    normal: [255, 0, 0, 0.5],
    hover: [255, 100, 100, 0.7],
  },
  heatmapColorThresholds?: ColorThreshold[],
  heatmapIntensity?: number,
  heatmapZoomAttenuation?: number
) {
  const normalizedThickness = normalizeActivityThicknessControl(activityThickness);
  const heatmapLayerRef = useRef<WebGL2HeatmapLayer | null>(null);
  const isLinesMountedRef = useRef<boolean>(false);

  const latestHeatmapOptionsRef = useRef({
    lineThickness: normalizedThickness,
    layerTransparency: activityLayerTransparency,
    heatmapDensity,
    heatmapIntensity,
    heatmapZoomAttenuation,
    colorThresholds: heatmapColorThresholds,
  });
  latestHeatmapOptionsRef.current = {
    lineThickness: normalizedThickness,
    layerTransparency: activityLayerTransparency,
    heatmapDensity,
    heatmapIntensity,
    heatmapZoomAttenuation,
    colorThresholds: heatmapColorThresholds,
  };

  const latestLinesOptionsRef = useRef({
    lineThickness: normalizedThickness,
    lineColor: activityLineColor.normal,
    lineHoverColor: activityLineColor.hover,
    layerTransparency: activityLayerTransparency,
  });
  latestLinesOptionsRef.current = {
    lineThickness: normalizedThickness,
    lineColor: activityLineColor.normal,
    lineHoverColor: activityLineColor.hover,
    layerTransparency: activityLayerTransparency,
  };

  // Lifecycle effect for Heatmap mode (keeps WebGL buffers alive across slider drags)
  useEffect(() => {
    if (!map || !showActivities || mode !== 'heatmap' || tracks.size === 0) {
      return;
    }

    logger.debug(`Mounting WebGL2 heatmap layer for ${tracks.size} tracks`);
    const layer = new WebGL2HeatmapLayer(tracks, latestHeatmapOptionsRef.current);
    heatmapLayerRef.current = layer;

    if (map.getLayer(MAP_LAYER_IDS.ACTIVITIES_HEATMAP)) {
      map.removeLayer(MAP_LAYER_IDS.ACTIVITIES_HEATMAP);
    }
    map.addLayer(layer);

    return () => {
      if (map.getLayer(MAP_LAYER_IDS.ACTIVITIES_HEATMAP)) {
        map.removeLayer(MAP_LAYER_IDS.ACTIVITIES_HEATMAP);
      }
      if (heatmapLayerRef.current === layer) {
        heatmapLayerRef.current = null;
      }
    };
  }, [map, showActivities, mode, tracks]);

  // Fast uniform / LUT update for Heatmap mode without re-uploading track geometry
  useEffect(() => {
    if (!heatmapLayerRef.current || mode !== 'heatmap' || !showActivities) {
      return;
    }

    heatmapLayerRef.current.updateOptions({
      lineThickness: normalizedThickness,
      layerTransparency: activityLayerTransparency,
      heatmapDensity,
      heatmapIntensity,
      heatmapZoomAttenuation,
      colorThresholds: heatmapColorThresholds,
    });
  }, [
    mode,
    showActivities,
    normalizedThickness,
    activityLayerTransparency,
    heatmapDensity,
    heatmapIntensity,
    heatmapZoomAttenuation,
    heatmapColorThresholds,
  ]);

  // Lifecycle effect for Lines mode (builds GeoJSON and tiles ONCE per tracks/mode mount)
  useEffect(() => {
    if (!map || !showActivities || mode !== 'lines' || tracks.size === 0) {
      isLinesMountedRef.current = false;
      return;
    }

    logger.debug(`Rendering ${tracks.size} tracks in lines mode`);
    const cleanup = mountActivityLinesLayer(map, tracks, latestLinesOptionsRef.current);
    isLinesMountedRef.current = true;

    return () => {
      isLinesMountedRef.current = false;
      cleanup();
    };
  }, [map, tracks, showActivities, mode]);

  // Instant (<1ms) GPU paint update for Lines mode when sliders or colors change
  useEffect(() => {
    if (!map || !showActivities || mode !== 'lines' || !isLinesMountedRef.current) {
      return;
    }

    updateActivityLinesPaint(map, {
      lineThickness: normalizedThickness,
      lineColor: activityLineColor.normal,
      lineHoverColor: activityLineColor.hover,
      layerTransparency: activityLayerTransparency,
    });
  }, [
    map,
    showActivities,
    mode,
    normalizedThickness,
    activityLayerTransparency,
    activityLineColor,
  ]);
}
