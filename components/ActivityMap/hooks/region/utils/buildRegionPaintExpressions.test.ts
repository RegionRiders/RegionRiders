import {
  REGION_VISIT_HEATMAP_COLOR_THRESHOLDS,
  REGION_VISIT_STATIC_COLOR_THRESHOLDS,
} from '@/components/ActivityMap/config/mapConfig';
import { getRegionTileProfileConfig } from '@/components/ActivityMap/config/regionTileProfiles';
import { buildRegionPaintExpressions } from '@/components/ActivityMap/hooks/region/utils/buildRegionPaintExpressions';

describe('buildRegionPaintExpressions', () => {
  const desktopConfig = getRegionTileProfileConfig('desktop');

  it('builds static mode feature-state fill and line expressions', () => {
    const result = buildRegionPaintExpressions({
      config: desktopConfig,
      mode: 'static',
      regionBorderThickness: 2,
      regionLayerTransparency: 0.8,
      regionStaticColor: REGION_VISIT_STATIC_COLOR_THRESHOLDS,
      regionHeatmapColor: REGION_VISIT_HEATMAP_COLOR_THRESHOLDS,
    });

    expect(Array.isArray(result.fillPaint['fill-color'])).toBe(true);
    expect(Array.isArray(result.fillPaint['fill-opacity'])).toBe(true);
    expect(Array.isArray(result.linePaint['line-width'])).toBe(true);
    expect(Array.isArray(result.linePaint['line-opacity'])).toBe(true);
  });

  it('places ["zoom"] at the top level of ["step", ["zoom"], ...] when unvisited alpha is 0 (legacy persisted settings)', () => {
    const result = buildRegionPaintExpressions({
      config: desktopConfig,
      mode: 'static',
      regionBorderThickness: 2,
      regionLayerTransparency: 0.8,
      regionStaticColor: [
        { threshold: 0, color: [60, 60, 60, 0] },
        { threshold: 1, color: [76, 107, 34, 0.2] },
      ],
      regionHeatmapColor: REGION_VISIT_HEATMAP_COLOR_THRESHOLDS,
    });

    const fillOpacity = result.fillPaint['fill-opacity'] as unknown[];
    expect(fillOpacity[0]).toBe('step');
    expect(fillOpacity[1]).toEqual(['zoom']);
    expect((fillOpacity[2] as unknown[])[0]).toBe('case');
  });

  it('uses explicit unvisited alpha scaled by transparency when unvisited swatch has alpha > 0', () => {
    const result = buildRegionPaintExpressions({
      config: desktopConfig,
      mode: 'static',
      regionBorderThickness: 2,
      regionLayerTransparency: 0.5,
      regionStaticColor: [
        { threshold: 0, color: [100, 120, 140, 1] },
        { threshold: 1, color: [76, 107, 34, 0.4] },
      ],
      regionHeatmapColor: REGION_VISIT_HEATMAP_COLOR_THRESHOLDS,
    });

    // ['case', isVisitedExpr, visitedOpacity (0.2), unvisitedOpacity (0.5)]
    const fillOpacityExpr = result.fillPaint['fill-opacity'] as unknown[];
    expect(fillOpacityExpr[2]).toBeCloseTo(0.2);
    expect(fillOpacityExpr[3]).toBeCloseTo(0.5);
  });

  it('builds heatmap mode visitCount interpolation expressions with valid top-level step when unvisited alpha is 0', () => {
    const result = buildRegionPaintExpressions({
      config: desktopConfig,
      mode: 'heatmap',
      regionBorderThickness: 3,
      regionLayerTransparency: 1,
      regionStaticColor: REGION_VISIT_STATIC_COLOR_THRESHOLDS,
      regionHeatmapColor: [
        { threshold: 0, color: [60, 60, 60, 0] },
        { threshold: 1, color: [220, 20, 20, 0.1] },
        { threshold: 10, color: [255, 255, 0, 0.1] },
      ],
    });

    const fillColorExpr = result.fillPaint['fill-color'] as unknown[];
    expect(fillColorExpr[0]).toBe('case');
    expect((fillColorExpr[2] as unknown[])[0]).toBe('interpolate');

    const fillOpacityExpr = result.fillPaint['fill-opacity'] as unknown[];
    expect(fillOpacityExpr[0]).toBe('step');
    expect(fillOpacityExpr[1]).toEqual(['zoom']);
  });
});
