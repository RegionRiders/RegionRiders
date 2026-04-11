import { getHeatmapColorForCount } from '@/components/ActivityMap/hooks/activity/activitiesHeatmap/utils/getHeatmapColorForCount';
import { renderHeatmapPixelsFromAccumulator } from '@/components/ActivityMap/hooks/activity/activitiesHeatmap/utils/renderHeatmapPixelsFromAccumulator';
import { smoothHeatmapEdges } from '@/components/ActivityMap/hooks/activity/activitiesHeatmap/utils/smoothHeatmapEdges';

jest.mock(
  '@/components/ActivityMap/hooks/activity/activitiesHeatmap/utils/getHeatmapColorForCount',
  () => ({
    getHeatmapColorForCount: jest.fn(() => [10, 20, 30, 0.5]),
  })
);

jest.mock(
  '@/components/ActivityMap/hooks/activity/activitiesHeatmap/utils/smoothHeatmapEdges',
  () => ({
    smoothHeatmapEdges: jest.fn(),
  })
);

describe('renderHeatmapPixelsFromAccumulator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a zeroed pixel buffer when no touched bounds are provided', () => {
    const data = renderHeatmapPixelsFromAccumulator(
      new Float32Array([0, 1, 0, 2]),
      2,
      2,
      12,
      2,
      1,
      undefined,
      null
    );

    expect(data).toHaveLength(16);
    expect(Array.from(data)).toEqual(new Array(16).fill(0));
    expect(getHeatmapColorForCount).not.toHaveBeenCalled();
    expect(smoothHeatmapEdges).not.toHaveBeenCalled();
  });

  it('caches colors by count so repeated counts do not reallocate per pixel', () => {
    const accumulator = new Float32Array([
      1,
      1, //
      2,
      2,
    ]);

    const data = renderHeatmapPixelsFromAccumulator(accumulator, 2, 2, 12, 3, 1, undefined, {
      minX: 0,
      minY: 0,
      maxX: 1,
      maxY: 1,
    });

    expect(data[0]).toBe(10);
    expect(data[1]).toBe(20);
    expect(data[2]).toBe(30);
    expect(data[3]).toBe(128);
    expect(getHeatmapColorForCount).toHaveBeenCalledTimes(2);
  });

  it('passes bounds through to edge smoothing when smoothing is enabled', () => {
    renderHeatmapPixelsFromAccumulator(
      new Float32Array([
        0,
        0,
        0, //
        0,
        1,
        0,
        0,
        0,
        0,
      ]),
      3,
      3,
      10,
      2,
      0.8,
      undefined,
      { minX: 1, minY: 1, maxX: 1, maxY: 1 }
    );

    expect(smoothHeatmapEdges).toHaveBeenCalledWith(
      expect.any(Uint8ClampedArray),
      expect.any(Float32Array),
      3,
      3,
      { minX: 1, minY: 1, maxX: 1, maxY: 1 }
    );
  });
});
