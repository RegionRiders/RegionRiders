import { smoothHeatmapEdges } from './smoothHeatmapEdges';

describe('smoothHeatmapEdges', () => {
  it('reduces alpha on corner pixels but keeps rgb unchanged', () => {
    const width = 3;
    const height = 3;
    const accumulator = new Float32Array(width * height);
    // L shape around center
    accumulator[1 * width + 1] = 2;
    accumulator[1 * width + 2] = 2;
    accumulator[2 * width + 1] = 2;

    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < width * height; i++) {
      data[i * 4] = 10;
      data[i * 4 + 1] = 20;
      data[i * 4 + 2] = 30;
      data[i * 4 + 3] = accumulator[i] > 0 ? 200 : 0;
    }

    smoothHeatmapEdges(data, accumulator, width, height);

    const cornerAlpha = data[(1 * width + 1) * 4 + 3];
    expect(cornerAlpha).toBeLessThan(200);
    expect(data[(1 * width + 1) * 4]).toBe(10);
    expect(data[(1 * width + 1) * 4 + 1]).toBe(20);
    expect(data[(1 * width + 1) * 4 + 2]).toBe(30);
  });

  it('does not create alpha on empty pixels', () => {
    const width = 2;
    const height = 2;
    const accumulator = new Float32Array(width * height);
    accumulator[0] = 1;

    const data = new Uint8ClampedArray(width * height * 4);
    data[3] = 255;

    smoothHeatmapEdges(data, accumulator, width, height);

    expect(data[7]).toBe(0);
    expect(data[11]).toBe(0);
    expect(data[15]).toBe(0);
  });
});
