import {
  buildHeatmapColorLut,
  getHeatmapBrushRadiusCssPx,
  HEATMAP_LUT_SIZE,
} from '@/components/ActivityMap/hooks/activity/activitiesHeatmap/utils/heatmapLutBuilder';

describe('heatmapLutBuilder', () => {
  it('computes CSS brush radius from activity thickness control including fractional values', () => {
    expect(getHeatmapBrushRadiusCssPx(1)).toBeCloseTo(0.85, 5);
    expect(getHeatmapBrushRadiusCssPx(2)).toBeCloseTo(1.75, 5);
    expect(getHeatmapBrushRadiusCssPx(2.5)).toBeCloseTo(2.25, 5);
  });

  it('builds a 512x1 RGBA8 LUT with transparent index 0 and high-intensity endpoint', () => {
    const lut = buildHeatmapColorLut([
      { threshold: 1, color: [139, 0, 0, 1] },
      { threshold: 150, color: [255, 255, 255, 1] },
    ]);

    expect(lut.width).toBe(HEATMAP_LUT_SIZE);
    expect(lut.data).toHaveLength(HEATMAP_LUT_SIZE * 4);
    expect(lut.maxThreshold).toBe(150);

    // Index 0 must always be transparent
    expect(lut.data[0]).toBe(0);
    expect(lut.data[3]).toBe(0);

    // Final index must reach the max threshold endpoint color
    const lastOffset = (HEATMAP_LUT_SIZE - 1) * 4;
    expect(lut.data[lastOffset]).toBe(255);
    expect(lut.data[lastOffset + 1]).toBe(255);
    expect(lut.data[lastOffset + 2]).toBe(255);
    expect(lut.data[lastOffset + 3]).toBe(255);
  });
});
