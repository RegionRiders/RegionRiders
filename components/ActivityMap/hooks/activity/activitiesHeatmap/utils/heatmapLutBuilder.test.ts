import {
  buildHeatmapColorLut,
  getHeatmapZoomScale,
  HEATMAP_LUT_SIZE,
} from '@/components/ActivityMap/hooks/activity/activitiesHeatmap/utils/heatmapLutBuilder';

describe('heatmapLutBuilder', () => {
  it('aligns MapLibre zoom scaling with bugfix/heatmap-stability referenceZoom=15', () => {
    // MapLibre z14 == legacy 256px z15 (referenceZoom) -> scale = 1
    expect(getHeatmapZoomScale(14)).toBe(1);
    // Lower zoom attenuates overlapping geographic paths
    expect(getHeatmapZoomScale(13)).toBe(0.5);
    expect(getHeatmapZoomScale(12)).toBe(0.25);
    // Above reference zoom applies configured 2x boost
    expect(getHeatmapZoomScale(15)).toBe(2);
    expect(getHeatmapZoomScale(17)).toBe(2);
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
