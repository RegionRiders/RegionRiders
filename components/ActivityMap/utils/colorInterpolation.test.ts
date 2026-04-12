// colorUtils.test.ts
import type { RGB, RGBA } from '@/components/ActivityMap/mapTypes';
import { getColorFromThresholds, interpolateRgb } from './colorInterpolation';

describe('interpolateRgb', () => {
  test('returns first color when t = 0 (RGB)', () => {
    const c1: RGB = [10, 20, 30];
    const c2: RGB = [200, 210, 220];

    const result = interpolateRgb(c1, c2, 0);

    expect(result).toEqual([10, 20, 30]);
  });

  test('returns second color when t = 1 (RGB)', () => {
    const c1: RGB = [10, 20, 30];
    const c2: RGB = [200, 210, 220];

    const result = interpolateRgb(c1, c2, 1);

    expect(result).toEqual([200, 210, 220]);
  });

  test('interpolates RGB at t = 0.5 with rounding', () => {
    const c1: RGB = [0, 0, 0];
    const c2: RGB = [255, 255, 255];

    const result = interpolateRgb(c1, c2, 0.5);

    // 127.5 rounded to 128
    expect(result).toEqual([128, 128, 128]);
  });

  test('interpolates RGBA including alpha (alpha not rounded)', () => {
    const c1: RGBA = [0, 0, 0, 0];
    const c2: RGBA = [255, 255, 255, 1];

    const result = interpolateRgb(c1, c2, 0.5);

    expect(result).toEqual([128, 128, 128, 0.5]);
  });

  test('does not interpolate alpha when only one color has alpha', () => {
    const c1: RGB = [0, 0, 0];
    const c2: RGBA = [255, 255, 255, 1];

    const result = interpolateRgb(c1 as any, c2 as any, 0.5);

    // Length 3 result (treated as RGB)
    expect(result).toEqual([128, 128, 128]);
  });
});

describe('getColorFromThresholds', () => {
  const thresholdsRgb = [
    { threshold: 0, color: [0, 0, 0] as RGB },
    { threshold: 50, color: [255, 0, 0] as RGB },
    { threshold: 100, color: [255, 255, 255] as RGB },
  ];

  test('returns first color when value is below minimum threshold', () => {
    const result = getColorFromThresholds(-1, thresholdsRgb);

    expect(result).toEqual([0, 0, 0]);
  });

  test('returns last color when value is above maximum threshold', () => {
    const result = getColorFromThresholds(101, thresholdsRgb);

    expect(result).toEqual([255, 255, 255]);
  });

  test('returns exact color when value equals a threshold', () => {
    const result = getColorFromThresholds(50, thresholdsRgb);

    expect(result).toEqual([255, 0, 0]);
  });

  test('interpolates between thresholds inside range', () => {
    // Between 0 and 50 => between [0,0,0] and [255,0,0]
    const result = getColorFromThresholds(25, thresholdsRgb);

    expect(result).toEqual([128, 0, 0]);
  });

  test('handles zero range (upper.threshold === lower.threshold)', () => {
    const thresholdsZeroRange = [
      { threshold: 10, color: [0, 0, 0] as RGB },
      { threshold: 10, color: [255, 255, 255] as RGB },
    ];

    const result = getColorFromThresholds(10, thresholdsZeroRange);

    // range === 0, t forced to 0, so lower color is returned
    expect(result).toEqual([0, 0, 0]);
  });

  test('covers final return after loop by using value not matching any internal range', () => {
    const thresholdsSparse = [
      { threshold: 0, color: [0, 0, 0] as RGB },
      { threshold: 100, color: [255, 255, 255] as RGB },
    ];

    // Because 50 is in [0,100], loop will match and interpolate,
    // so to trigger the final return we need a thresholds array where
    // no condition in the loop passes. Use a malformed thresholds set.
    const malformed = [
      { threshold: 0, color: [0, 0, 0] as RGB },
      { threshold: 0, color: [255, 255, 255] as RGB },
    ];

    const result = getColorFromThresholds(5, malformed);

    // The loop does not enter the if (value>=lower && value<=upper),
    // so function reaches the last return.
    expect(result).toEqual([255, 255, 255]);
    void thresholdsSparse; // just to keep lints happy if unused
  });

  test('works with RGBA thresholds and interpolates alpha', () => {
    const thresholdsRgba = [
      { threshold: 0, color: [0, 0, 0, 0] as RGBA },
      { threshold: 1, color: [0, 0, 0, 1] as RGBA },
    ];

    const result = getColorFromThresholds(0.5, thresholdsRgba);

    expect(result).toEqual([0, 0, 0, 0.5]);
  });

  test('interpolates correctly for custom thresholds', () => {
    const thresholds = [
      { threshold: 0, color: [0, 0, 0] as RGB },
      { threshold: 10, color: [10, 10, 10] as RGB },
      { threshold: 20, color: [20, 20, 20] as RGB },
    ];

    const result = getColorFromThresholds(3, thresholds);

    // 3/10 between 0 and 10 -> 3 in each channel
    expect(result).toEqual([3, 3, 3]);
  });
});
