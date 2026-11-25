import {
  REGION_VISIT_HEATMAP_COLOR_THRESHOLDS,
  REGION_VISIT_STATIC_COLOR_THRESHOLDS,
} from '@/components/ActivityMap/config/mapConfig';
import { getRegionTileProfileConfig } from '@/components/ActivityMap/config/regionTileProfiles';
import { buildRegionPaintExpressions } from '@/components/ActivityMap/hooks/region/utils/buildRegionPaintExpressions';

describe('buildRegionPaintExpressions', () => {
  const desktopConfig = getRegionTileProfileConfig('desktop');

  it('keeps unvisited fill transparent (opacity 0) and uses the selected swatch color when unvisited alpha is 0', () => {
    const result = buildRegionPaintExpressions({
      config: desktopConfig,
      mode: 'static',
      regionBorderThickness: 2,
      regionLayerTransparency: 0.8,
      regionStaticColor: REGION_VISIT_STATIC_COLOR_THRESHOLDS,
      regionHeatmapColor: REGION_VISIT_HEATMAP_COLOR_THRESHOLDS,
    });

    const fillColorExpr = result.fillPaint['fill-color'] as unknown[];
    // Never falls back to green #0A7E43; uses swatch rgb(60, 60, 60) for unvisited and rgb(76, 107, 34) for visited
    expect(fillColorExpr[2]).toBe('rgb(76, 107, 34)');
    expect(fillColorExpr[3]).toBe('rgb(60, 60, 60)');

    const fillOpacityExpr = result.fillPaint['fill-opacity'] as unknown[];
    expect(fillOpacityExpr[0]).toBe('case');
    expect(fillOpacityExpr[2]).toBeCloseTo(0.16); // visited 0.2 * 0.8
    expect(fillOpacityExpr[3]).toBe(0); // unvisited 0 * 0.8
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

    const fillColorExpr = result.fillPaint['fill-color'] as unknown[];
    expect(fillColorExpr[3]).toBe('rgb(100, 120, 140)');

    const fillOpacityExpr = result.fillPaint['fill-opacity'] as unknown[];
    expect(fillOpacityExpr[2]).toBeCloseTo(0.2);
    expect(fillOpacityExpr[3]).toBeCloseTo(0.5);
  });

  it('builds heatmap mode visitCount interpolation expressions with transparent unvisited regions when threshold 0 alpha is 0', () => {
    const result = buildRegionPaintExpressions({
      config: desktopConfig,
      mode: 'heatmap',
      regionBorderThickness: 3,
      regionLayerTransparency: 1,
      regionStaticColor: REGION_VISIT_STATIC_COLOR_THRESHOLDS,
      regionHeatmapColor: REGION_VISIT_HEATMAP_COLOR_THRESHOLDS,
    });

    const fillColorExpr = result.fillPaint['fill-color'] as unknown[];
    expect(fillColorExpr[0]).toBe('case');
    expect((fillColorExpr[2] as unknown[])[0]).toBe('interpolate');
    expect(fillColorExpr[3]).toBe('rgb(60, 60, 60)');

    const fillOpacityExpr = result.fillPaint['fill-opacity'] as unknown[];
    expect(fillOpacityExpr[0]).toBe('case');
    expect(fillOpacityExpr[2]).toBe(1);
    expect(fillOpacityExpr[3]).toBe(0);
  });
});
