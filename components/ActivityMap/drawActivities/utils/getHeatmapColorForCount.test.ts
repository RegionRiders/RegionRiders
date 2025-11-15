import { getHeatmapColorForCount, COLOR_THRESHOLDS } from './getHeatmapColorForCount';

describe('getHeatmapColorForCount', () => {
  it('should return dark red for count of 1', () => {
    const result = getHeatmapColorForCount(1, 10, 1);

    expect(result).toEqual([139, 0, 0]);
  });

  it('should return white for very high counts', () => {
    const result = getHeatmapColorForCount(1000, 10, 1);

    expect(result).toEqual([255, 255, 255]);
  });

  it('should interpolate colors for intermediate counts', () => {
    const result = getHeatmapColorForCount(10, 10, 1);

    // Should be between red and orange
    expect(result[0]).toBeGreaterThan(200);
    expect(result[1]).toBeGreaterThan(0);
    expect(result[2]).toBe(0);
  });

  it('should normalize for line thickness', () => {
    // Same count but different line thickness should yield different colors
    const result1 = getHeatmapColorForCount(10, 10, 1);
    const result2 = getHeatmapColorForCount(10, 10, 2);

    // With thicker line, normalized count is lower, so color should be different
    expect(result1).not.toEqual(result2);
  });

  it('should account for zoom level', () => {
    // Same count but different zoom should yield different colors
    const result1 = getHeatmapColorForCount(10, 10, 1);
    const result2 = getHeatmapColorForCount(10, 5, 1);

    expect(result1).not.toEqual(result2);
  });

  it('should handle zero count', () => {
    const result = getHeatmapColorForCount(0, 10, 1);

    expect(result).toEqual([139, 0, 0]); // Minimum color
  });

  it('should handle default zoom level', () => {
    const result = getHeatmapColorForCount(10);

    expect(result).toBeDefined();
    expect(result).toHaveLength(3);
  });

  it('should handle default line thickness', () => {
    const result = getHeatmapColorForCount(10, 10);

    expect(result).toBeDefined();
    expect(result).toHaveLength(3);
  });

  it('should return valid RGB values', () => {
    const result = getHeatmapColorForCount(50, 10, 2);

    result.forEach((value) => {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(255);
      expect(Number.isInteger(value)).toBe(true);
    });
  });

  it('should handle fractional counts', () => {
    const result = getHeatmapColorForCount(5.5, 10, 1);

    expect(result).toHaveLength(3);
    result.forEach((value) => {
      expect(Number.isInteger(value)).toBe(true);
    });
  });

  it('should have correct color thresholds defined', () => {
    expect(COLOR_THRESHOLDS).toBeDefined();
    expect(COLOR_THRESHOLDS.length).toBeGreaterThan(0);
    
    // Verify thresholds are in ascending order
    for (let i = 1; i < COLOR_THRESHOLDS.length; i++) {
      expect(COLOR_THRESHOLDS[i].threshold).toBeGreaterThanOrEqual(
        COLOR_THRESHOLDS[i - 1].threshold
      );
    }

    // Verify all colors are valid RGB arrays
    COLOR_THRESHOLDS.forEach((t) => {
      expect(t.color).toHaveLength(3);
      t.color.forEach((c) => {
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThanOrEqual(255);
      });
    });
  });
});