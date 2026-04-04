import { ColorThreshold, RGBA } from '@/components/ActivityMap/mapTypes';
import { getHeatmapColorForCount } from './getHeatmapColorForCount';

const TEST_THRESHOLDS: ColorThreshold[] = [
  { threshold: 1, color: [139, 0, 0, 40] as RGBA }, // dark red, 15% opacity
  { threshold: 2, color: [220, 20, 20, 80] as RGBA }, // red, 31% opacity
  { threshold: 10, color: [255, 100, 0, 120] as RGBA }, // orange-red, 47% opacity
  { threshold: 25, color: [255, 165, 0, 160] as RGBA }, // orange, 63% opacity
  { threshold: 50, color: [255, 255, 0, 200] as RGBA }, // yellow, 78% opacity
  { threshold: 150, color: [255, 255, 255, 255] as RGBA }, // white, 100% opacity
];

describe('getHeatmapColorForCount', () => {
  describe('basic color mapping', () => {
    it('should return a valid RGBA array', () => {
      const result = getHeatmapColorForCount(5, 10, 1, TEST_THRESHOLDS);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(4); // ← Changed from 3 to 4
      result.forEach((channel) => {
        expect(channel).toBeGreaterThanOrEqual(0);
        expect(channel).toBeLessThanOrEqual(255);
      });
    });

    it('should return darker colors for low counts', () => {
      const lowCount = getHeatmapColorForCount(1, 10, 1, TEST_THRESHOLDS);
      const highCount = getHeatmapColorForCount(100, 10, 1, TEST_THRESHOLDS);

      // High count should have higher total RGB value (brighter)
      const lowTotal = lowCount[0] + lowCount[1] + lowCount[2];
      const highTotal = highCount[0] + highCount[1] + highCount[2];

      expect(highTotal).toBeGreaterThan(lowTotal);
    });

    it('should return higher opacity for high counts', () => {
      const lowCount = getHeatmapColorForCount(1, 10, 1, TEST_THRESHOLDS);
      const highCount = getHeatmapColorForCount(100, 10, 1, TEST_THRESHOLDS);

      // High count should have higher alpha (more opaque)
      expect(highCount[3]).toBeGreaterThan(lowCount[3]);
    });

    it('should return consistent results for same input', () => {
      const result1 = getHeatmapColorForCount(15, 10, 2, TEST_THRESHOLDS);
      const result2 = getHeatmapColorForCount(15, 10, 2, TEST_THRESHOLDS);

      expect(result1).toEqual(result2);
    });
  });

  describe('line thickness normalization', () => {
    it('should normalize by line thickness', () => {
      // With thickness=1, count=15 and thickness=4, count=45 represent the same normalized density:
      // 15 / (2*1+1) = 45 / (2*4+1) = 5
      const thin = getHeatmapColorForCount(15, 10, 1, TEST_THRESHOLDS);

      const thick = getHeatmapColorForCount(45, 10, 4, TEST_THRESHOLDS);

      expect(thin).toEqual(thick);
    });

    it('should handle thickness of 1', () => {
      const result = getHeatmapColorForCount(5, 10, 1, TEST_THRESHOLDS);

      expect(result).toBeDefined();
      expect(result[0]).toBeGreaterThanOrEqual(0);
      expect(result[3]).toBeGreaterThanOrEqual(0); // ← Added alpha check
    });

    it('should handle large thickness values', () => {
      const result = getHeatmapColorForCount(100, 10, 10, TEST_THRESHOLDS);

      expect(result).toBeDefined();
      result.forEach((channel) => {
        expect(channel).toBeGreaterThanOrEqual(0);
        expect(channel).toBeLessThanOrEqual(255);
      });
    });
  });

  describe('zoom level adjustment', () => {
    it('should keep same result for reference zoom and above for the same raw pixel count (no extra boost)', () => {
      // referenceZoom = 13; zoomScale is clamped to 1 for zoom >= referenceZoom
      const atReferenceZoom = getHeatmapColorForCount(10, 13, 1, TEST_THRESHOLDS);
      const aboveReferenceZoom = getHeatmapColorForCount(10, 15, 1, TEST_THRESHOLDS);

      expect(atReferenceZoom).toEqual(aboveReferenceZoom);
    });

    it('should keep same result across lower zoom levels when count is inversely scaled for zoom', () => {
      const lowZoom = getHeatmapColorForCount(10, 5, 1, TEST_THRESHOLDS);
      const midZoomEquivalent = getHeatmapColorForCount(10 / 2 ** (10 - 5), 10, 1, TEST_THRESHOLDS);

      expect(lowZoom).toEqual(midZoomEquivalent);
    });

    it('should reduce intensity at lower zoom for the same raw pixel count', () => {
      const lowZoom = getHeatmapColorForCount(10, 5, 1, TEST_THRESHOLDS);
      const referenceZoom = getHeatmapColorForCount(10, 10, 1, TEST_THRESHOLDS);

      expect(referenceZoom[3]).toBeGreaterThanOrEqual(lowZoom[3]);
    });

    it('should use default zoom when not provided', () => {
      const withDefault = getHeatmapColorForCount(5, undefined, undefined, TEST_THRESHOLDS);
      const withExplicit = getHeatmapColorForCount(5, 10, 1, TEST_THRESHOLDS);

      expect(withDefault).toEqual(withExplicit);
    });

    it('should handle extreme lower zoom values with inversely scaled equivalent counts', () => {
      const veryLowZoom = getHeatmapColorForCount(10, 1, 1, TEST_THRESHOLDS);
      const referenceZoomEquivalent = getHeatmapColorForCount(10 / 2 ** (10 - 1), 10, 1, TEST_THRESHOLDS);

      expect(veryLowZoom).toEqual(referenceZoomEquivalent);
    });
  });

  describe('custom thresholds', () => {
    it('should use provided custom thresholds with RGBA', () => {
      const customThresholds: ColorThreshold[] = [
        { threshold: 0, color: [0, 0, 0, 100] as RGBA },
        { threshold: 50, color: [255, 255, 255, 200] as RGBA },
      ];

      const result = getHeatmapColorForCount(5, 10, 1, customThresholds);

      expect(result).toBeDefined();
      expect(result).toHaveLength(4);
    });

    it('should respect custom threshold values', () => {
      const customThresholds: ColorThreshold[] = [
        { threshold: 1, color: [100, 100, 100, 150] as RGBA },
        { threshold: 10, color: [200, 200, 200, 250] as RGBA },
      ];

      const atFirst = getHeatmapColorForCount(1, 10, 1, customThresholds);

      expect(atFirst).toEqual([100, 100, 100, 150]);
    });
  });

  describe('edge cases', () => {
    it('should handle count of 0', () => {
      const result = getHeatmapColorForCount(0, 10, 1, TEST_THRESHOLDS);

      expect(result).toBeDefined();
      expect(result).toHaveLength(4);
    });

    it('should handle very high counts', () => {
      const result = getHeatmapColorForCount(10000, 10, 1, TEST_THRESHOLDS);

      expect(result).toBeDefined();
      result.forEach((channel) => {
        expect(channel).toBeLessThanOrEqual(255);
      });
    });

    it('should handle fractional counts', () => {
      const result = getHeatmapColorForCount(2.5, 10, 1, TEST_THRESHOLDS);

      expect(result).toBeDefined();
      expect(result).toHaveLength(4);
    });

    it('should handle negative counts as minimum', () => {
      const negative = getHeatmapColorForCount(-5, 10, 1, TEST_THRESHOLDS);
      const zero = getHeatmapColorForCount(0, 10, 1, TEST_THRESHOLDS);

      expect(negative).toEqual(zero);
    });
  });

  describe('color progression', () => {
    it('should show gradual color change across counts', () => {
      const colors = [
        getHeatmapColorForCount(30, 10, 1, TEST_THRESHOLDS),
        getHeatmapColorForCount(60, 10, 1, TEST_THRESHOLDS),
        getHeatmapColorForCount(150, 10, 1, TEST_THRESHOLDS),
        getHeatmapColorForCount(300, 10, 1, TEST_THRESHOLDS),
        getHeatmapColorForCount(1200, 10, 1, TEST_THRESHOLDS),
      ];

      // Each step should produce a different color
      for (let i = 0; i < colors.length - 1; i++) {
        expect(colors[i]).not.toEqual(colors[i + 1]);
      }
    });

    it('should maintain RGBA validity throughout progression', () => {
      for (let count = 0; count <= 200; count += 10) {
        const result = getHeatmapColorForCount(count, 10, 1, TEST_THRESHOLDS);

        result.forEach((channel) => {
          expect(channel).toBeGreaterThanOrEqual(0);
          expect(channel).toBeLessThanOrEqual(255);
        });
      }
    });

    it('should show increasing opacity with activity density', () => {
      const low = getHeatmapColorForCount(30, 10, 1, TEST_THRESHOLDS);
      const medium = getHeatmapColorForCount(300, 10, 1, TEST_THRESHOLDS);
      const high = getHeatmapColorForCount(1200, 10, 1, TEST_THRESHOLDS);

      // Alpha channel should increase
      expect(medium[3]).toBeGreaterThan(low[3]);
      expect(high[3]).toBeGreaterThan(medium[3]);
    });
  });

  describe('parameter combinations', () => {
    it('should handle various parameter combinations', () => {
      const combinations: Array<[number, number, number]> = [
        [1, 5, 1],
        [10, 10, 2],
        [50, 15, 5],
        [100, 8, 3],
        [200, 12, 10],
      ];

      combinations.forEach(([count, zoom, thickness]) => {
        const result = getHeatmapColorForCount(count, zoom, thickness, TEST_THRESHOLDS);

        expect(result).toBeDefined();
        expect(result).toHaveLength(4);
      });
    });
  });
});
