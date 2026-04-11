import { calculateWeightForZoom } from './calculateWeightForZoom';

describe('calculateWeightForZoom', () => {
  it('should return base weight at zoom 10', () => {
    // At zoom 10, (zoom - 10) / 2.5 = 0, so 2^0 = 1
    // 1 * 2 (default borderThickness) = 2
    expect(calculateWeightForZoom(10)).toBe(2);
  });

  it('should return increased weight at higher zoom levels', () => {
    // At zoom 12.5, (12.5 - 10) / 2.5 = 1, so 2^1 = 2
    // 2 * 2 = 4
    expect(calculateWeightForZoom(12.5)).toBe(4);
  });

  it('should return decreased weight at lower zoom levels', () => {
    // At zoom 7.5, (7.5 - 10) / 2.5 = -1, so 2^-1 = 0.5
    // 0.5 * 2 = 1
    expect(calculateWeightForZoom(7.5)).toBe(1);
  });

  it('should use custom border thickness', () => {
    // At zoom 10, 2^0 = 1, 1 * 4 = 4
    expect(calculateWeightForZoom(10, 4)).toBe(4);
  });

  it('should scale exponentially', () => {
    const weight10 = calculateWeightForZoom(10);
    const weight15 = calculateWeightForZoom(15);
    // At zoom 15, (15 - 10) / 2.5 = 2, so 2^2 = 4
    // 4 * 2 = 8
    expect(weight15).toBe(8);
    expect(weight15 / weight10).toBe(4);
  });

  it('should handle zoom level 0', () => {
    // At zoom 0, (0 - 10) / 2.5 = -4, so 2^-4 = 0.0625
    // 0.0625 * 2 = 0.125
    expect(calculateWeightForZoom(0)).toBeCloseTo(0.125);
  });

  it('should handle very high zoom levels', () => {
    // At zoom 20, (20 - 10) / 2.5 = 4, so 2^4 = 16
    // 16 * 2 = 32
    expect(calculateWeightForZoom(20)).toBe(32);
  });
});
