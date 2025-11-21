import { getColorFromThresholds, interpolateRgb } from './colorInterpolation';

describe('colorInterpolation', () => {
  describe('interpolateRgb', () => {
    it('should return first color when t is 0', () => {
      const c1 = [255, 0, 0];
      const c2 = [0, 255, 0];
      const result = interpolateRgb(c1, c2, 0);
      expect(result).toEqual([255, 0, 0]);
    });

    it('should return second color when t is 1', () => {
      const c1 = [255, 0, 0];
      const c2 = [0, 255, 0];
      const result = interpolateRgb(c1, c2, 1);
      expect(result).toEqual([0, 255, 0]);
    });

    it('should interpolate correctly at midpoint', () => {
      const c1 = [0, 0, 0];
      const c2 = [100, 200, 50];
      const result = interpolateRgb(c1, c2, 0.5);
      expect(result).toEqual([50, 100, 25]);
    });

    it('should handle fractional interpolation', () => {
      const c1 = [0, 0, 0];
      const c2 = [255, 255, 255];
      const result = interpolateRgb(c1, c2, 0.25);
      expect(result).toEqual([64, 64, 64]);
    });
  });

  describe('getColorFromThresholds', () => {
    const thresholds = [
      { threshold: 0, color: [0, 0, 255] }, // Blue
      { threshold: 10, color: [0, 255, 0] }, // Green
      { threshold: 20, color: [255, 255, 0] }, // Yellow
      { threshold: 30, color: [255, 0, 0] }, // Red
    ];

    it('should return first color for values below first threshold', () => {
      const result = getColorFromThresholds(-5, thresholds);
      expect(result).toEqual([0, 0, 255]);
    });

    it('should return exact color at threshold', () => {
      const result = getColorFromThresholds(10, thresholds);
      expect(result).toEqual([0, 255, 0]);
    });

    it('should return last color for values above last threshold', () => {
      const result = getColorFromThresholds(50, thresholds);
      expect(result).toEqual([255, 0, 0]);
    });

    it('should interpolate between thresholds', () => {
      const result = getColorFromThresholds(15, thresholds);
      // Midpoint between green [0, 255, 0] and yellow [255, 255, 0]
      expect(result).toEqual([128, 255, 0]);
    });

    it('should handle single threshold', () => {
      const singleThreshold = [{ threshold: 0, color: [100, 100, 100] }];
      const result = getColorFromThresholds(100, singleThreshold);
      expect(result).toEqual([100, 100, 100]);
    });

    it('should handle exact threshold values', () => {
      const result = getColorFromThresholds(0, thresholds);
      expect(result).toEqual([0, 0, 255]);
    });

    it('should handle zero range (identical thresholds)', () => {
      const zeroRangeThresholds = [
        { threshold: 10, color: [0, 0, 255] },
        { threshold: 10, color: [255, 0, 0] }, // Same threshold
      ];

      const result = getColorFromThresholds(10, zeroRangeThresholds);
      // Should use the lower color when range is 0
      expect(result).toEqual([0, 0, 255]);
    });
  });
});
