'use client';

import L from 'leaflet';
import {
  REGION_VISIT_HEATMAP_COLOR_THRESHOLDS,
  REGION_VISIT_STATIC_COLOR_THRESHOLDS,
} from '@/components/ActivityMap/config/mapConfig';
import { RegionTileProfileConfig } from '@/components/ActivityMap/config/regionTileProfiles';
import { RegionRenderMode } from '@/components/ActivityMap/controls/LayersPanel/types';
import { getRegionColorsHeatmap } from '@/components/ActivityMap/hooks/region/renderingModes/getRegionColorsHeatmap';
import { getRegionColorsStatic } from '@/components/ActivityMap/hooks/region/renderingModes/getRegionColorsStatic';
import { calculateWeightForZoom } from '@/components/ActivityMap/hooks/region/utils/calculateWeightForZoom';
import { ColorThreshold } from '@/components/ActivityMap/mapTypes';
import { RegionVisitData } from '@/lib/utils/regionVisitAnalyzer';

export type RegionTileConfig = RegionTileProfileConfig;

export type RegionTileFeature = {
  properties?: Record<string, unknown>;
  id?: string | number;
};

export type RegionStyleSettings = {
  mode: RegionRenderMode;
  regionBorderThickness: number;
  effectiveStaticColors: ColorThreshold[];
  effectiveHeatmapColors: ColorThreshold[];
};

export function serializeColorThresholds(thresholds: ColorThreshold[]): string {
  return JSON.stringify(thresholds);
}

export function getEffectiveColors(
  colors: ColorThreshold[],
  fallback: ColorThreshold[]
): ColorThreshold[] {
  return colors.length > 0 ? colors : fallback;
}

function clampOpacity(value: number): number {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.min(Math.max(value, 0), 1);
}

function getRegionStyleColors(
  mode: RegionRenderMode,
  visit: RegionVisitData | undefined,
  regionStaticColor: ColorThreshold[],
  regionHeatmapColor: ColorThreshold[]
): { fillColor: string; strokeColor: string } {
  if (mode === 'heatmap') {
    return getRegionColorsHeatmap(
      visit,
      getEffectiveColors(regionHeatmapColor, REGION_VISIT_HEATMAP_COLOR_THRESHOLDS)
    );
  }

  return getRegionColorsStatic(
    visit,
    getEffectiveColors(regionStaticColor, REGION_VISIT_STATIC_COLOR_THRESHOLDS)
  );
}

function getColorAlpha(color: string): number | null {
  const rgbaMatch = color.match(
    /^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*([0-9]*\.?[0-9]+)\s*)?\)$/i
  );

  if (!rgbaMatch) {
    return null;
  }

  if (rgbaMatch[1] === undefined) {
    return 1;
  }

  const alpha = Number(rgbaMatch[1]);

  return Number.isFinite(alpha) ? alpha : null;
}

function getVisibleFillColor(
  fillColor: string,
  strokeOpacity: number,
  config: RegionTileConfig
): string {
  const fillAlpha = getColorAlpha(fillColor);

  if (strokeOpacity > 0 || fillAlpha === null || fillAlpha > 0) {
    return fillColor;
  }

  return config.style.fillColor;
}

function getRegionStrokeOpacity(currentZoom: number, config: RegionTileConfig): number {
  const settledOpacity = clampOpacity(config.style.opacity);

  if (currentZoom < config.strokeHideBelowZoom) {
    return 0;
  }

  if (currentZoom >= config.strokeFadeStartZoom) {
    return settledOpacity;
  }

  const fadeRange = config.strokeFadeStartZoom - config.strokeHideBelowZoom;
  if (fadeRange <= 0) {
    return settledOpacity;
  }

  const fadeProgress = (currentZoom - config.strokeHideBelowZoom) / fadeRange;
  return clampOpacity(settledOpacity * fadeProgress);
}

function getRegionFillOpacity(
  currentZoom: number,
  config: RegionTileConfig,
  fillColor: string
): number {
  if (getColorAlpha(fillColor) !== 0) {
    return 1;
  }

  if (currentZoom < config.strokeFadeStartZoom) {
    return clampOpacity(Math.max(config.style.fillOpacity, config.minimumLowDetailFillOpacity));
  }

  return clampOpacity(config.style.fillOpacity);
}

export function getRegionPathStyle(
  config: RegionTileConfig,
  visit: RegionVisitData | undefined,
  {
    mode,
    regionBorderThickness,
    effectiveStaticColors,
    effectiveHeatmapColors,
  }: RegionStyleSettings,
  currentZoom: number
): L.PathOptions {
  const { fillColor, strokeColor } = getRegionStyleColors(
    mode,
    visit,
    effectiveStaticColors,
    effectiveHeatmapColors
  );
  const opacity = getRegionStrokeOpacity(currentZoom, config);
  const fillOpacity = getRegionFillOpacity(currentZoom, config, fillColor);

  return {
    color: strokeColor,
    weight: calculateWeightForZoom(currentZoom, regionBorderThickness),
    fill: true,
    fillColor: getVisibleFillColor(fillColor, opacity, config),
    fillOpacity,
    opacity,
  };
}

export function getBaseRegionStyle(
  config: RegionTileConfig,
  styleSettings: RegionStyleSettings,
  zoom: number
): L.PathOptions {
  return getRegionPathStyle(config, undefined, styleSettings, zoom);
}

export function getUnvisitedRegionStyle(
  config: RegionTileConfig,
  mode: RegionRenderMode = 'static',
  regionBorderThickness: number = config.style.weight,
  regionStaticColor: ColorThreshold[] = REGION_VISIT_STATIC_COLOR_THRESHOLDS,
  regionHeatmapColor: ColorThreshold[] = REGION_VISIT_HEATMAP_COLOR_THRESHOLDS,
  currentZoom: number = config.detailCapZoom
): L.PathOptions {
  return getRegionPathStyle(
    config,
    undefined,
    {
      mode,
      regionBorderThickness,
      effectiveStaticColors: regionStaticColor,
      effectiveHeatmapColors: regionHeatmapColor,
    },
    currentZoom
  );
}

export function getVisitedRegionStyle(
  config: RegionTileConfig,
  visit: RegionVisitData,
  mode: RegionRenderMode = 'static',
  regionBorderThickness: number = config.style.weight,
  regionStaticColor: ColorThreshold[] = REGION_VISIT_STATIC_COLOR_THRESHOLDS,
  regionHeatmapColor: ColorThreshold[] = REGION_VISIT_HEATMAP_COLOR_THRESHOLDS,
  currentZoom: number = config.detailCapZoom
): L.PathOptions {
  return getRegionPathStyle(
    config,
    visit,
    {
      mode,
      regionBorderThickness,
      effectiveStaticColors: regionStaticColor,
      effectiveHeatmapColors: regionHeatmapColor,
    },
    currentZoom
  );
}

export function getRegionFeatureId(feature: RegionTileFeature): string {
  const regionId = feature.properties?.region_id;

  if (typeof regionId === 'string' && regionId.trim().length > 0) {
    return regionId.trim();
  }

  if (typeof regionId === 'number' && Number.isFinite(regionId)) {
    return String(regionId);
  }

  return String(feature.id ?? '');
}
