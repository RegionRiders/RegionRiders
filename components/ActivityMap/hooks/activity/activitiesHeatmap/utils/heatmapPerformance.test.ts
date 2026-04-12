import {
  buildHeatmapColorLut,
  getAdaptiveHeatmapQuality,
} from '@/components/ActivityMap/hooks/activity/activitiesHeatmap/utils/heatmapPerformance';

describe('heatmapPerformance', () => {
  describe('getAdaptiveHeatmapQuality', () => {
    it('returns base settings for fast renders', () => {
      const quality = getAdaptiveHeatmapQuality(1, 14, 80);
      expect(quality.effectiveDensity).toBe(1);
      expect(quality.smoothingAllowed).toBe(true);
      expect(quality.simplificationTolerancePx).toBe(0);
    });

    it('reduces quality for high-cost renders', () => {
      const quality = getAdaptiveHeatmapQuality(1, 10, 220);
      expect(quality.effectiveDensity).toBeLessThan(1);
      expect(quality.smoothingAllowed).toBe(false);
      expect(quality.simplificationTolerancePx).toBeGreaterThan(0);
    });
  });

  describe('buildHeatmapColorLut', () => {
    it('builds a LUT with zero entry reserved', () => {
      const lut = buildHeatmapColorLut(12, 12, 2, 0.5);
      expect(lut.length).toBe((12 + 1) * 4);
      expect(Array.from(lut.slice(0, 4))).toEqual([0, 0, 0, 0]);
    });

    it('applies layer transparency to alpha values', () => {
      const fullAlphaLut = buildHeatmapColorLut(2, 12, 2, 1);
      const halfAlphaLut = buildHeatmapColorLut(2, 12, 2, 0.5);
      const fullAlpha = fullAlphaLut[2 * 4 + 3];
      const halfAlpha = halfAlphaLut[2 * 4 + 3];
      expect(halfAlpha).toBeLessThan(fullAlpha);
      expect(halfAlpha).toBeGreaterThan(0);
    });
  });
});
