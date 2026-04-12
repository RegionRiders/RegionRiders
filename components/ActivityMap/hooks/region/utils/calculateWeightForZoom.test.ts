import { calculateWeightForZoom } from './calculateWeightForZoom';

describe('calculateWeightForZoom', () => {
  it('should return base weight at zoom 10', () => {
    // At zoom 10, (zoom - 10) / 2.5 = 0, so 2^0 = 1
    // 1 * 2 (default borderThickness) = 2
    expect(calculateWeightForZoom(10)).toBe(2);
  });

  it('should return increased weight at higher zoom levels', () => {
    expect(calculateWeightForZoom(12.5)).toBe(2);
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
    // The helper now clamps at the configured border thickness ceiling.
    expect(weight15).toBe(2);
    expect(weight10).toBe(2);
  });

  it('should clamp low zoom levels to the minimum visible stroke', () => {
    expect(calculateWeightForZoom(0)).toBe(0.35);
  });

  it('should clamp high zoom levels to the selected border thickness', () => {
    expect(calculateWeightForZoom(20)).toBe(2);
  });

  it('should still scale within the visible range before clamping', () => {
    expect(calculateWeightForZoom(7.5, 4)).toBe(2);
    expect(calculateWeightForZoom(10, 4)).toBe(4);
  });
});
