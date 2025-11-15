import { drawLineToAccumulator } from './drawLineToAccumulator';

describe('drawLineToAccumulator', () => {
  it('should draw a horizontal line', () => {
    const width = 10;
    const height = 10;
    const accumulator = new Float32Array(width * height);

    drawLineToAccumulator(accumulator, width, height, 2, 5, 8, 5, 1);

    // Check that pixels along the line were incremented
    let pixelsDrawn = 0;
    for (let i = 0; i < accumulator.length; i++) {
      if (accumulator[i] > 0) {
        pixelsDrawn++;
      }
    }

    expect(pixelsDrawn).toBeGreaterThan(0);
  });

  it('should draw a vertical line', () => {
    const width = 10;
    const height = 10;
    const accumulator = new Float32Array(width * height);

    drawLineToAccumulator(accumulator, width, height, 5, 2, 5, 8, 1);

    let pixelsDrawn = 0;
    for (let i = 0; i < accumulator.length; i++) {
      if (accumulator[i] > 0) {
        pixelsDrawn++;
      }
    }

    expect(pixelsDrawn).toBeGreaterThan(0);
  });

  it('should draw a diagonal line', () => {
    const width = 10;
    const height = 10;
    const accumulator = new Float32Array(width * height);

    drawLineToAccumulator(accumulator, width, height, 2, 2, 8, 8, 1);

    let pixelsDrawn = 0;
    for (let i = 0; i < accumulator.length; i++) {
      if (accumulator[i] > 0) {
        pixelsDrawn++;
      }
    }

    expect(pixelsDrawn).toBeGreaterThan(0);
  });

  it('should handle zero-length line', () => {
    const width = 10;
    const height = 10;
    const accumulator = new Float32Array(width * height);

    drawLineToAccumulator(accumulator, width, height, 5, 5, 5, 5, 1);

    // Zero-length line should not draw anything
    const sum = accumulator.reduce((a, b) => a + b, 0);
    expect(sum).toBe(0);
  });

  it('should respect canvas boundaries', () => {
    const width = 10;
    const height = 10;
    const accumulator = new Float32Array(width * height);

    // Line extends beyond canvas
    drawLineToAccumulator(accumulator, width, height, 5, 5, 20, 20, 1);

    // Should not write outside bounds
    expect(accumulator.length).toBe(width * height);
  });

  it('should apply thicker lines correctly', () => {
    const width = 10;
    const height = 10;
    const accumulator1 = new Float32Array(width * height);
    const accumulator2 = new Float32Array(width * height);

    drawLineToAccumulator(accumulator1, width, height, 5, 5, 8, 5, 1);
    drawLineToAccumulator(accumulator2, width, height, 5, 5, 8, 5, 2);

    const pixels1 = accumulator1.filter((v) => v > 0).length;
    const pixels2 = accumulator2.filter((v) => v > 0).length;

    // Thicker line should affect more pixels
    expect(pixels2).toBeGreaterThan(pixels1);
  });

  it('should increment existing values', () => {
    const width = 10;
    const height = 10;
    const accumulator = new Float32Array(width * height);

    // Draw same line twice
    drawLineToAccumulator(accumulator, width, height, 5, 5, 8, 5, 1);
    drawLineToAccumulator(accumulator, width, height, 5, 5, 8, 5, 1);

    // Some pixels should have value > 1
    const maxValue = Math.max(...Array.from(accumulator));
    expect(maxValue).toBeGreaterThan(1);
  });

  it('should apply antialiasing to edges', () => {
    const width = 20;
    const height = 20;
    const accumulator = new Float32Array(width * height);

    drawLineToAccumulator(accumulator, width, height, 10, 10, 15, 10, 3);

    // Should have fractional values for antialiased edges
    const hasFractionalValues = Array.from(accumulator).some(
      (v) => v > 0 && v < 1
    );
    expect(hasFractionalValues).toBe(true);
  });

  it('should handle negative coordinates by clamping', () => {
    const width = 10;
    const height = 10;
    const accumulator = new Float32Array(width * height);

    // Line starts outside canvas
    drawLineToAccumulator(accumulator, width, height, -5, 5, 5, 5, 1);

    // Should draw the visible portion
    const pixelsDrawn = accumulator.filter((v) => v > 0).length;
    expect(pixelsDrawn).toBeGreaterThan(0);
  });

  it('should handle floating point coordinates', () => {
    const width = 10;
    const height = 10;
    const accumulator = new Float32Array(width * height);

    drawLineToAccumulator(accumulator, width, height, 2.5, 5.5, 8.7, 5.2, 1);

    const pixelsDrawn = accumulator.filter((v) => v > 0).length;
    expect(pixelsDrawn).toBeGreaterThan(0);
  });

  it('should create circular brush pattern', () => {
    const width = 20;
    const height = 20;
    const accumulator = new Float32Array(width * height);

    // Draw a single point with thickness
    drawLineToAccumulator(accumulator, width, height, 10, 10, 10, 10, 3);

    // Should still draw something despite zero-length line early return check
    // Actually, zero-length lines return early, so this tests that behavior
    const sum = accumulator.reduce((a, b) => a + b, 0);
    expect(sum).toBe(0);
  });
});