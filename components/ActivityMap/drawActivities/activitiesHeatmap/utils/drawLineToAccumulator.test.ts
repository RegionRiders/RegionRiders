import { drawLineToAccumulator } from './drawLineToAccumulator';

describe('drawLineToAccumulator', () => {
  it('should handle zero-length line (same start and end)', () => {
    const accumulator = new Float32Array(100 * 100);
    drawLineToAccumulator(accumulator, 100, 100, 50, 50, 50, 50, 2);

    // Should return early without modifying accumulator
    const sum = accumulator.reduce((a, b) => a + b, 0);
    expect(sum).toBe(0);
  });

  it('should draw horizontal line', () => {
    const width = 100;
    const height = 100;
    const accumulator = new Float32Array(width * height);

    drawLineToAccumulator(accumulator, width, height, 10, 50, 20, 50, 2);

    // Check that some pixels were drawn
    const sum = accumulator.reduce((a, b) => a + b, 0);
    expect(sum).toBeGreaterThan(0);
  });

  it('should draw vertical line', () => {
    const width = 100;
    const height = 100;
    const accumulator = new Float32Array(width * height);

    drawLineToAccumulator(accumulator, width, height, 50, 10, 50, 20, 2);

    const sum = accumulator.reduce((a, b) => a + b, 0);
    expect(sum).toBeGreaterThan(0);
  });

  it('should draw diagonal line', () => {
    const width = 100;
    const height = 100;
    const accumulator = new Float32Array(width * height);

    drawLineToAccumulator(accumulator, width, height, 10, 10, 20, 20, 2);

    const sum = accumulator.reduce((a, b) => a + b, 0);
    expect(sum).toBeGreaterThan(0);
  });

  it('should respect thickness parameter', () => {
    const width = 100;
    const height = 100;
    const accumulatorThin = new Float32Array(width * height);
    const accumulatorThick = new Float32Array(width * height);

    drawLineToAccumulator(accumulatorThin, width, height, 30, 30, 70, 70, 1);
    drawLineToAccumulator(accumulatorThick, width, height, 30, 30, 70, 70, 3);

    const sumThin = accumulatorThin.reduce((a, b) => a + b, 0);
    const sumThick = accumulatorThick.reduce((a, b) => a + b, 0);

    expect(sumThick).toBeGreaterThan(sumThin);
  });

  it('should not draw outside canvas bounds', () => {
    const width = 10;
    const height = 10;
    const accumulator = new Float32Array(width * height);

    // Draw line that would extend outside bounds
    drawLineToAccumulator(accumulator, width, height, 5, 5, 100, 100, 2);

    // Verify no out of bounds errors and accumulator has reasonable values
    const sum = accumulator.reduce((a, b) => a + b, 0);
    expect(sum).toBeGreaterThanOrEqual(0);
    expect(accumulator.every((val) => val >= 0)).toBe(true);
  });

  it('should handle negative coordinates gracefully', () => {
    const width = 100;
    const height = 100;
    const accumulator = new Float32Array(width * height);

    // Partially visible line
    drawLineToAccumulator(accumulator, width, height, -10, 50, 10, 50, 2);

    // Should draw the visible portion
    const sum = accumulator.reduce((a, b) => a + b, 0);
    expect(sum).toBeGreaterThan(0);
    expect(accumulator.every((val) => val >= 0 && !isNaN(val))).toBe(true);
  });

  it('should accumulate values on repeated draws', () => {
    const width = 100;
    const height = 100;
    const accumulator = new Float32Array(width * height);

    drawLineToAccumulator(accumulator, width, height, 40, 40, 60, 60, 2);
    const firstSum = accumulator.reduce((a, b) => a + b, 0);

    drawLineToAccumulator(accumulator, width, height, 40, 40, 60, 60, 2);
    const secondSum = accumulator.reduce((a, b) => a + b, 0);

    expect(secondSum).toBeGreaterThan(firstSum);
    expect(secondSum).toBeCloseTo(firstSum * 2, 1);
  });
});
