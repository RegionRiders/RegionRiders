import type {
  DataDrivenPropertyValueSpecification,
  ExpressionSpecification,
  FillLayerSpecification,
  LineLayerSpecification,
} from 'maplibre-gl';
import {
  REGION_VISIT_HEATMAP_COLOR_THRESHOLDS,
  REGION_VISIT_STATIC_COLOR_THRESHOLDS,
} from '@/components/ActivityMap/config/mapConfig';
import { RegionTileProfileConfig } from '@/components/ActivityMap/config/regionTileProfiles';
import { RegionRenderMode } from '@/components/ActivityMap/controls/LayersPanel/types';
import { calculateWeightForZoom } from '@/components/ActivityMap/hooks/region/utils/calculateWeightForZoom';
import { ColorThreshold, RGBA } from '@/components/ActivityMap/mapTypes';

export interface RegionPaintInput {
  config: RegionTileProfileConfig;
  mode: RegionRenderMode;
  regionBorderThickness: number;
  regionLayerTransparency: number;
  regionStaticColor: ColorThreshold[];
  regionHeatmapColor: ColorThreshold[];
}

export interface RegionPaintSpecs {
  fillPaint: NonNullable<FillLayerSpecification['paint']>;
  linePaint: NonNullable<LineLayerSpecification['paint']>;
}

function clampOpacity(value: number): number {
  if (!Number.isFinite(value)) {
    return 1;
  }
  return Math.min(Math.max(value, 0), 1);
}

function rgbaToCss([r, g, b, a]: RGBA, alphaMultiplier: number = 1): string {
  const effectiveAlpha = clampOpacity(a * alphaMultiplier);
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${effectiveAlpha})`;
}

function rgbToSolidCss([r, g, b]: RGBA): string {
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

function getEffectiveThresholds(
  thresholds: ColorThreshold[],
  fallback: ColorThreshold[]
): ColorThreshold[] {
  return thresholds.length > 0 ? thresholds : fallback;
}

function buildZoomLineWidthExpression(
  borderThickness: number
): DataDrivenPropertyValueSpecification<number> {
  const safeThickness = Number.isFinite(borderThickness) ? Math.max(0.35, borderThickness) : 2;
  // MapLibre zoom z corresponds to legacy 256px zoom (z + 1)
  const sampleMapLibreZooms = [2, 4, 6, 8, 9, 10, 12];
  const stops: (number | ExpressionSpecification)[] = [];

  for (const mlZoom of sampleMapLibreZooms) {
    stops.push(mlZoom, calculateWeightForZoom(mlZoom + 1, safeThickness));
  }

  return ['interpolate', ['linear'], ['zoom'], ...stops] as ExpressionSpecification;
}

function buildZoomStrokeOpacityExpression(
  config: RegionTileProfileConfig,
  layerTransparency: number
): DataDrivenPropertyValueSpecification<number> {
  const settledOpacity = clampOpacity(config.style.opacity) * clampOpacity(layerTransparency);
  const hideZoom = Math.max(0, config.strokeHideBelowZoom - 1);
  const fadeStartZoom = Math.max(hideZoom + 0.01, config.strokeFadeStartZoom - 1);

  return [
    'interpolate',
    ['linear'],
    ['zoom'],
    hideZoom,
    0,
    fadeStartZoom,
    settledOpacity,
  ] as ExpressionSpecification;
}

/**
 * Builds native GPU MapLibre paint expressions for region fill and border layers.
 * Strictly honors the user's selected unvisited and visited color swatches and alpha values.
 */
export function buildRegionPaintExpressions(input: RegionPaintInput): RegionPaintSpecs {
  const {
    config,
    mode,
    regionBorderThickness,
    regionLayerTransparency,
    regionStaticColor,
    regionHeatmapColor,
  } = input;

  const transparency = clampOpacity(regionLayerTransparency);
  const staticThresholds = getEffectiveThresholds(
    regionStaticColor,
    REGION_VISIT_STATIC_COLOR_THRESHOLDS
  );
  const heatmapThresholds = getEffectiveThresholds(
    regionHeatmapColor,
    REGION_VISIT_HEATMAP_COLOR_THRESHOLDS
  );

  const lineWidth = buildZoomLineWidthExpression(regionBorderThickness);
  const lineOpacity = buildZoomStrokeOpacityExpression(config, transparency);

  const isVisitedExpr: ExpressionSpecification = [
    'all',
    ['boolean', ['feature-state', 'visited'], false],
    ['>', ['coalesce', ['feature-state', 'visitCount'], 0], 0],
  ];

  if (mode === 'heatmap') {
    const sorted = [...heatmapThresholds].sort((a, b) => a.threshold - b.threshold);
    const unvisitedColorTuple = sorted[0]?.color ?? [60, 60, 60, 0];
    const visitedStops = sorted.filter((t) => t.threshold > 0);

    const unvisitedFillColor = rgbToSolidCss(unvisitedColorTuple);
    const unvisitedStrokeColor = rgbToSolidCss(unvisitedColorTuple);
    const unvisitedFillOpacity = clampOpacity(unvisitedColorTuple[3] * transparency);

    let visitedFillExpr: DataDrivenPropertyValueSpecification<string>;
    let visitedStrokeExpr: DataDrivenPropertyValueSpecification<string>;

    if (visitedStops.length === 0) {
      visitedFillExpr = unvisitedFillColor;
      visitedStrokeExpr = unvisitedStrokeColor;
    } else if (visitedStops.length === 1) {
      visitedFillExpr = rgbaToCss(visitedStops[0].color, transparency);
      visitedStrokeExpr = rgbToSolidCss(visitedStops[0].color);
    } else {
      const fillStopArgs: (number | string)[] = [];
      const strokeStopArgs: (number | string)[] = [];
      for (const stop of visitedStops) {
        fillStopArgs.push(stop.threshold, rgbaToCss(stop.color, transparency));
        strokeStopArgs.push(stop.threshold, rgbToSolidCss(stop.color));
      }
      visitedFillExpr = [
        'interpolate',
        ['linear'],
        ['coalesce', ['feature-state', 'visitCount'], 0],
        ...fillStopArgs,
      ] as ExpressionSpecification;
      visitedStrokeExpr = [
        'interpolate',
        ['linear'],
        ['coalesce', ['feature-state', 'visitCount'], 0],
        ...strokeStopArgs,
      ] as ExpressionSpecification;
    }

    return {
      fillPaint: {
        'fill-color': [
          'case',
          isVisitedExpr,
          visitedFillExpr,
          unvisitedFillColor,
        ] as ExpressionSpecification,
        'fill-opacity': ['case', isVisitedExpr, 1, unvisitedFillOpacity] as ExpressionSpecification,
      },
      linePaint: {
        'line-color': [
          'case',
          isVisitedExpr,
          visitedStrokeExpr,
          unvisitedStrokeColor,
        ] as ExpressionSpecification,
        'line-width': lineWidth,
        'line-opacity': lineOpacity,
      },
    };
  }

  // Static visited / unvisited mode
  const unvisitedTuple = staticThresholds[0]?.color ?? [60, 60, 60, 0];
  const visitedTuple = staticThresholds[1]?.color ?? unvisitedTuple;

  const unvisitedFillColor = rgbToSolidCss(unvisitedTuple);
  const visitedFillColor = rgbToSolidCss(visitedTuple);

  const unvisitedStrokeColor = rgbToSolidCss(unvisitedTuple);
  const visitedStrokeColor = rgbToSolidCss(visitedTuple);

  const unvisitedOpacity = clampOpacity(unvisitedTuple[3] * transparency);
  const visitedOpacity = clampOpacity(visitedTuple[3] * transparency);

  return {
    fillPaint: {
      'fill-color': [
        'case',
        isVisitedExpr,
        visitedFillColor,
        unvisitedFillColor,
      ] as ExpressionSpecification,
      'fill-opacity': [
        'case',
        isVisitedExpr,
        visitedOpacity,
        unvisitedOpacity,
      ] as ExpressionSpecification,
    },
    linePaint: {
      'line-color': [
        'case',
        isVisitedExpr,
        visitedStrokeColor,
        unvisitedStrokeColor,
      ] as ExpressionSpecification,
      'line-width': lineWidth,
      'line-opacity': lineOpacity,
    },
  };
}
