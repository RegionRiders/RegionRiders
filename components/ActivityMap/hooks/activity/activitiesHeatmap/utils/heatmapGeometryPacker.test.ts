import {
  FLOATS_PER_PACKED_SEGMENT,
  lngLatToMercator,
  packTracksForHeatmap,
  splitFloat64,
} from '@/components/ActivityMap/hooks/activity/activitiesHeatmap/utils/heatmapGeometryPacker';
import { GPXTrack } from '@/lib/types';

describe('heatmapGeometryPacker', () => {
  it('converts lng/lat to normalized Web Mercator [0..1] coordinates', () => {
    const [x0, y0] = lngLatToMercator(0, 0);
    expect(x0).toBeCloseTo(0.5, 6);
    expect(y0).toBeCloseTo(0.5, 6);

    const [xGdansk, yGdansk] = lngLatToMercator(18.656686, 54.352375);
    expect(xGdansk).toBeGreaterThan(0.5);
    expect(xGdansk).toBeLessThan(0.6);
    expect(yGdansk).toBeGreaterThan(0.25);
    expect(yGdansk).toBeLessThan(0.35);
  });

  it('splits 64-bit Mercator coordinates into Double-Single (hi + lo) float32 pairs with sub-millimeter precision', () => {
    const [x, y] = lngLatToMercator(18.656686123, 54.352375987);
    const [xHi, xLo] = splitFloat64(x);
    const [yHi, yLo] = splitFloat64(y);

    // Reconstructed hi + lo must match 64-bit value to better than 1e-12 (~0.04mm on Earth)
    expect(Math.abs(xHi + xLo - x)).toBeLessThan(1e-12);
    expect(Math.abs(yHi + yLo - y)).toBeLessThan(1e-12);
  });

  it('packs multi-point tracks into 8-float Double-Single segments across 3 LOD tiers', () => {
    const tracks = new Map<string, GPXTrack>([
      [
        'track-1',
        {
          id: 'track-1',
          name: 'Ride 1',
          points: [
            { lat: 54.35, lon: 18.65 },
            { lat: 54.3502, lon: 18.6502 }, // included in fullSegments, skipped in medium/low
            { lat: 54.3518, lon: 18.6518 }, // included in mediumZoomSegments, skipped in low
            { lat: 54.37, lon: 18.67 }, // included in all tiers
          ],
        },
      ],
    ]);

    const packed = packTracksForHeatmap(tracks);
    expect(packed.fullSegmentCount).toBe(3);
    expect(packed.fullSegments).toHaveLength(3 * FLOATS_PER_PACKED_SEGMENT);
    expect(packed.mediumZoomSegmentCount).toBe(2);
    expect(packed.lowZoomSegmentCount).toBe(1);
  });

  it('preserves single-point tracks as zero-length segments for visible capsule rendering (#165)', () => {
    const tracks = new Map<string, GPXTrack>([
      [
        'dot-track',
        {
          id: 'dot-track',
          name: 'Dot',
          points: [{ lat: 54.35, lon: 18.65 }],
        },
      ],
    ]);

    const packed = packTracksForHeatmap(tracks);
    expect(packed.fullSegmentCount).toBe(1);
    // Hi x0 == Hi x1 and Lo x0 == Lo x1
    expect(packed.fullSegments[0]).toBe(packed.fullSegments[2]);
    expect(packed.fullSegments[1]).toBe(packed.fullSegments[3]);
    expect(packed.fullSegments[4]).toBe(packed.fullSegments[6]);
    expect(packed.fullSegments[5]).toBe(packed.fullSegments[7]);
  });
});
