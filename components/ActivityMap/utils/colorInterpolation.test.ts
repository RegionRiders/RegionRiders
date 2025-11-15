import { interpolateRgb, getColorFromThresholds } from './colorInterpolation';

describe('colorInterpolation', () => {
  describe('interpolateRgb', () => {
    it('should return first color when t=0', () => {
      const c1 = [255, 0, 0];
      const c2 = [0, 0, 255];

      const result = interpolateRgb(c1, c2, 0);

      expect(result).toEqual([255, 0, 0]);
    });

    it('should return second color when t=1', () => {
      const c1 = [255, 0, 0];
      const c2 = [0, 0, 255];

      const result = interpolateRgb(c1, c2, 1);

      expect(result).toEqual([0, 0, 255]);
    });

    it('should interpolate colors at t=0.5', () => {
      const c1 = [0, 0, 0];
      const c2 = [100, 100, 100];

      const result = interpolateRgb(c1, c2, 0.5);

      expect(result).toEqual([50, 50, 50]);
    });

    it('should handle different color channels', () => {
      const c1 = [255, 0, 0];
      const c2 = [0, 255, 0];

      const result = interpolateRgb(c1, c2, 0.5);

      expect(result[0]).toBe(128); // Red channel
      expect(result[1]).toBe(128); // Green channel
      expect(result[2]).toBe(0); // Blue channel
    });

    it('should round to nearest integer', () => {
      const c1 = [0, 0, 0];
      const c2 = [10, 10, 10];

      const result = interpolateRgb(c1, c2, 0.33);

      result.forEach((value) => {
        expect(Number.isInteger(value)).toBe(true);
      });
    });

    it('should handle grayscale interpolation', () => {
      const c1 = [0, 0, 0];
      const c2 = [255, 255, 255];

      const result = interpolateRgb(c1, c2, 0.25);

      expect(result).toEqual([64, 64, 64]);
    });
  });

  describe('getColorFromThresholds', () => {
    const thresholds = [
      { threshold: 0, color: [0, 0, 0] },
      { threshold: 50, color: [128, 128, 128] },
      { threshold: 100, color: [255, 255, 255] },
    ];

    it('should return first color for value below minimum threshold', () => {
      const result = getColorFromThresholds(-10, thresholds);

      expect(result).toEqual([0, 0, 0]);
    });

    it('should return last color for value above maximum threshold', () => {
      const result = getColorFromThresholds(150, thresholds);

      expect(result).toEqual([255, 255, 255]);
    });

    it('should return exact threshold color when value matches', () => {
      const result = getColorFromThresholds(50, thresholds);

      expect(result).toEqual([128, 128, 128]);
    });

    it('should interpolate between thresholds', () => {
      const result = getColorFromThresholds(25, thresholds);

      // Halfway between [0,0,0] and [128,128,128]
      expect(result).toEqual([64, 64, 64]);
    });

    it('should handle value at exact minimum threshold', () => {
      const result = getColorFromThresholds(0, thresholds);

      expect(result).toEqual([0, 0, 0]);
    });

    it('should handle value at exact maximum threshold', () => {
      const result = getColorFromThresholds(100, thresholds);

      expect(result).toEqual([255, 255, 255]);
    });

    it('should handle single threshold', () => {
      const singleThreshold = [{ threshold: 10, color: [100, 100, 100] }];

      const result1 = getColorFromThresholds(5, singleThreshold);
      const result2 = getColorFromThresholds(15, singleThreshold);

      expect(result1).toEqual([100, 100, 100]);
      expect(result2).toEqual([100, 100, 100]);
    });

    it('should handle two thresholds', () => {
      const twoThresholds = [
        { threshold: 0, color: [0, 0, 0] },
        { threshold: 100, color: [255, 255, 255] },
      ];

      const result = getColorFromThresholds(50, twoThresholds);

      expect(result).toEqual([128, 128, 128]);
    });

    it('should handle multiple threshold ranges correctly', () => {
      const multiThresholds = [
        { threshold: 0, color: [255, 0, 0] },
        { threshold: 25, color: [255, 255, 0] },
        { threshold: 50, color: [0, 255, 0] },
        { threshold: 75, color: [0, 0, 255] },
        { threshold: 100, color: [255, 0, 255] },
      ];

      const result = getColorFromThresholds(37.5, multiThresholds);

      // Halfway between yellow and green
      expect(result[0]).toBe(128); // Red diminishing
      expect(result[1]).toBe(255); // Green constant
      expect(result[2]).toBe(0); // Blue starting
    });

    it('should return tuple of exactly 3 numbers', () => {
      const result = getColorFromThresholds(50, thresholds);

      expect(result).toHaveLength(3);
      expect(typeof result[0]).toBe('number');
      expect(typeof result[1]).toBe('number');
      expect(typeof result[2]).toBe('number');
    });

    it('should handle zero range threshold', () => {
      const zeroRange = [
        { threshold: 10, color: [100, 100, 100] },
        { threshold: 10, color: [200, 200, 200] },
      ];

      const result = getColorFromThresholds(10, zeroRange);

      expect(result).toEqual([100, 100, 100]);
    });
  });
});