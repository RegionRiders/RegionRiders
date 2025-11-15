import { getRegionColorForCount, VISIT_THRESHOLDS } from './getRegionColorForCount';

describe('getRegionColorForCount', () => {
  it('should return green for single visit', () => {
    const result = getRegionColorForCount(1);

    expect(result).toEqual([34, 197, 94]);
  });

  it('should return white for very high visit counts', () => {
    const result = getRegionColorForCount(100);

    expect(result).toEqual([255, 255, 255]);
  });

  it('should interpolate colors for intermediate counts', () => {
    const result = getRegionColorForCount(3);

    // Should be between green and yellow
    expect(result[0]).toBeGreaterThan(34);
    expect(result[1]).toBeGreaterThan(100);
  });

  it('should return yellow for 2 visits', () => {
    const result = getRegionColorForCount(2);

    expect(result).toEqual([234, 179, 8]);
  });

  it('should return orange for 5 visits', () => {
    const result = getRegionColorForCount(5);

    expect(result).toEqual([249, 115, 22]);
  });

  it('should return red for 10 visits', () => {
    const result = getRegionColorForCount(10);

    expect(result).toEqual([220, 38, 38]);
  });

  it('should handle zero visits', () => {
    const result = getRegionColorForCount(0);

    // Should return minimum color (green)
    expect(result).toEqual([34, 197, 94]);
  });

  it('should handle negative counts', () => {
    const result = getRegionColorForCount(-5);

    // Should return minimum color
    expect(result).toEqual([34, 197, 94]);
  });

  it('should return valid RGB tuple', () => {
    const result = getRegionColorForCount(7);

    expect(result).toHaveLength(3);
    expect(typeof result[0]).toBe('number');
    expect(typeof result[1]).toBe('number');
    expect(typeof result[2]).toBe('number');
  });

  it('should return RGB values in valid range', () => {
    for (let count = 0; count <= 25; count++) {
      const result = getRegionColorForCount(count);

      result.forEach((value) => {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(255);
        expect(Number.isInteger(value)).toBe(true);
      });
    }
  });

  it('should interpolate smoothly between thresholds', () => {
    const result1 = getRegionColorForCount(1);
    const result2 = getRegionColorForCount(1.5);
    const result3 = getRegionColorForCount(2);

    // result2 should be between result1 and result3
    expect(result2[0]).toBeGreaterThanOrEqual(Math.min(result1[0], result3[0]));
    expect(result2[0]).toBeLessThanOrEqual(Math.max(result1[0], result3[0]));
  });

  it('should have correct visit thresholds defined', () => {
    expect(VISIT_THRESHOLDS).toBeDefined();
    expect(VISIT_THRESHOLDS.length).toBeGreaterThan(0);

    // Verify thresholds are in ascending order
    for (let i = 1; i < VISIT_THRESHOLDS.length; i++) {
      expect(VISIT_THRESHOLDS[i].threshold).toBeGreaterThanOrEqual(
        VISIT_THRESHOLDS[i - 1].threshold
      );
    }

    // Verify all colors are valid RGB arrays
    VISIT_THRESHOLDS.forEach((t) => {
      expect(t.color).toHaveLength(3);
      t.color.forEach((c) => {
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThanOrEqual(255);
      });
    });
  });

  it('should handle fractional visit counts', () => {
    const result = getRegionColorForCount(3.7);

    expect(result).toHaveLength(3);
    result.forEach((value) => {
      expect(Number.isInteger(value)).toBe(true);
    });
  });
});