import {
  buildHeatmapColorLut,
  computeUniqueActivitiesFromDensity,
  DEFAULT_HEATMAP_INTENSITY,
  DEFAULT_HEATMAP_ZOOM_ATTENUATION,
  getEffectiveGroundScaleDelta,
  getHeatmapGamma,
  HEATMAP_LUT_SIZE,
} from '@/components/ActivityMap/hooks/activity/activitiesHeatmap/utils/heatmapLutBuilder';

describe('heatmapLutBuilder', () => {
  it('returns exact physical ride count (gamma = 1.0) at street zoom levels (z >= 13) with no artificial brightening', () => {
    for (const zoom of [13, 14, 15, 16, 17, 18]) {
      expect(getHeatmapGamma(zoom, 2)).toBe(1.0);
      expect(computeUniqueActivitiesFromDensity(1, zoom, 2)).toBe(1);
      expect(computeUniqueActivitiesFromDensity(10, zoom, 2)).toBe(10);
      expect(computeUniqueActivitiesFromDensity(50, zoom, 2)).toBe(50);
    }
  });

  it('anchors a single ride (rawDensity = 1.0) to 1.0 at default intensity across all zoom levels', () => {
    for (const zoom of [4, 5.5, 7, 8.5, 10, 12, 14, 17]) {
      expect(computeUniqueActivitiesFromDensity(1.0, zoom, 2)).toBeCloseTo(1.0, 6);
    }
  });

  it('maintains vivid multi-scale dynamic range on Pomerania (z≈8) and Poland (z≈5.5) without crushing rural corridors', () => {
    // Pomerania regional zoom (MapLibre z = 8)
    const pomerania1 = computeUniqueActivitiesFromDensity(1, 8, 2);
    const pomerania10 = computeUniqueActivitiesFromDensity(10, 8, 2);
    const pomerania100 = computeUniqueActivitiesFromDensity(100, 8, 2);
    const pomerania500 = computeUniqueActivitiesFromDensity(500, 8, 2);

    expect(pomerania1).toBe(1);
    expect(pomerania10).toBeGreaterThan(4.5);
    expect(pomerania100).toBeGreaterThan(22);
    expect(pomerania500).toBeGreaterThan(75);

    // Poland country zoom (MapLibre z = 5.5) — 10-ride rural routes stay clearly brighter than 1-ride routes
    const poland1 = computeUniqueActivitiesFromDensity(1, 5.5, 2);
    const poland10 = computeUniqueActivitiesFromDensity(10, 5.5, 2);
    const poland746 = computeUniqueActivitiesFromDensity(746, 5.5, 2);

    expect(poland1).toBe(1);
    expect(poland10).toBeGreaterThan(3.5);
    expect(poland746).toBeGreaterThan(50);
    expect(poland746).toBeLessThan(150);
  });

  it('treats doubling line thickness identically to zooming out 1 level in effective ground scale', () => {
    const deltaBase = getEffectiveGroundScaleDelta(10, 2); // radius 1.75
    const deltaThicker = getEffectiveGroundScaleDelta(10, 4); // radius 3.75 (~2.14x wider)
    expect(deltaThicker - deltaBase).toBeCloseTo(Math.log2(3.75 / 1.75), 5);
  });

  it('honors user-configurable intensity and zoomAttenuation settings', () => {
    // Zero zoom attenuation -> pure raw count even on country zoom
    expect(getHeatmapGamma(5, 2, 0)).toBe(1.0);
    expect(computeUniqueActivitiesFromDensity(25, 5, 2, 1.0, 0)).toBe(25);

    // Custom intensity scales density directly
    expect(
      computeUniqueActivitiesFromDensity(10, 14, 2, 2.0, DEFAULT_HEATMAP_ZOOM_ATTENUATION)
    ).toBe(20);
    expect(
      computeUniqueActivitiesFromDensity(10, 14, 2, 0.5, DEFAULT_HEATMAP_ZOOM_ATTENUATION)
    ).toBe(5);
    expect(DEFAULT_HEATMAP_INTENSITY).toBe(1.0);
  });

  it('builds a 512x1 RGBA8 LUT with transparent index 0 and high-intensity endpoint', () => {
    const lut = buildHeatmapColorLut([
      { threshold: 1, color: [139, 0, 0, 1] },
      { threshold: 150, color: [255, 255, 255, 1] },
    ]);

    expect(lut.width).toBe(HEATMAP_LUT_SIZE);
    expect(lut.data).toHaveLength(HEATMAP_LUT_SIZE * 4);
    expect(lut.maxThreshold).toBe(150);

    expect(lut.data[3]).toBe(0);

    const lastOffset = (HEATMAP_LUT_SIZE - 1) * 4;
    expect(lut.data[lastOffset]).toBe(255);
    expect(lut.data[lastOffset + 1]).toBe(255);
    expect(lut.data[lastOffset + 2]).toBe(255);
    expect(lut.data[lastOffset + 3]).toBe(255);
  });
});
