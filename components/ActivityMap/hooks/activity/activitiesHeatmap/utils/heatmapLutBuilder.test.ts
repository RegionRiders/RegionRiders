import {
  buildHeatmapColorLut,
  computeUniqueActivitiesFromDensity,
  getHeatmapZoomScale,
  HEATMAP_LUT_SIZE,
} from '@/components/ActivityMap/hooks/activity/activitiesHeatmap/utils/heatmapLutBuilder';

describe('heatmapLutBuilder', () => {
  it('anchors a single ride (rawDensity = 1.0) to uniqueActivities = 1.0 across all zoom levels (country, region, street)', () => {
    for (const zoom of [4, 5.5, 7, 8.5, 10, 12, 14, 17]) {
      expect(computeUniqueActivitiesFromDensity(1.0, zoom)).toBeCloseTo(1.0, 6);
    }
  });

  it('preserves full color contrast from 1 to 150+ rides on Pomerania regional view (z≈8) and Poland country view (z≈5.5)', () => {
    // Pomerania regional zoom (MapLibre z = 8)
    const pomeraniaSingle = computeUniqueActivitiesFromDensity(1, 8);
    const pomeraniaMedium = computeUniqueActivitiesFromDensity(35, 8);
    const pomeraniaCore = computeUniqueActivitiesFromDensity(500, 8);

    expect(pomeraniaSingle).toBe(1);
    expect(pomeraniaMedium).toBeGreaterThan(8);
    expect(pomeraniaMedium).toBeLessThan(25);
    expect(pomeraniaCore).toBeGreaterThan(120);

    // Poland country zoom (MapLibre z = 5.5) — never collapses or flips high-density cores to threshold 1
    const polandSingle = computeUniqueActivitiesFromDensity(1, 5.5);
    const polandRegionalCluster = computeUniqueActivitiesFromDensity(100, 5.5);
    const polandHomeCore = computeUniqueActivitiesFromDensity(746, 5.5);

    expect(polandSingle).toBe(1);
    expect(polandRegionalCluster).toBeGreaterThan(10);
    expect(polandHomeCore).toBeGreaterThan(100);
  });

  it('scales excess overlap monotonically with zoom level', () => {
    expect(getHeatmapZoomScale(5)).toBeGreaterThanOrEqual(0.14);
    expect(getHeatmapZoomScale(8)).toBeGreaterThan(getHeatmapZoomScale(5));
    expect(getHeatmapZoomScale(11)).toBeGreaterThan(getHeatmapZoomScale(8));
    expect(getHeatmapZoomScale(13)).toBeCloseTo(1.0, 5);
    expect(getHeatmapZoomScale(15)).toBe(1.5);
  });

  it('builds a 512x1 RGBA8 LUT with transparent index 0 and high-intensity endpoint', () => {
    const lut = buildHeatmapColorLut([
      { threshold: 1, color: [139, 0, 0, 1] },
      { threshold: 150, color: [255, 255, 255, 1] },
    ]);

    expect(lut.width).toBe(HEATMAP_LUT_SIZE);
    expect(lut.data).toHaveLength(HEATMAP_LUT_SIZE * 4);
    expect(lut.maxThreshold).toBe(150);

    // Index 0 is fully transparent
    expect(lut.data[3]).toBe(0);

    // Last texel reaches white [255, 255, 255, 255]
    const lastOffset = (HEATMAP_LUT_SIZE - 1) * 4;
    expect(lut.data[lastOffset]).toBe(255);
    expect(lut.data[lastOffset + 1]).toBe(255);
    expect(lut.data[lastOffset + 2]).toBe(255);
    expect(lut.data[lastOffset + 3]).toBe(255);
  });
});
