import {
  computeAdjacentJoinDirs,
  FLOATS_PER_PACKED_SEGMENT,
  lngLatToMercator,
  packTracksForHeatmap,
  simplifyMercatorRdp,
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

    expect(Math.abs(xHi + xLo - x)).toBeLessThan(1e-12);
    expect(Math.abs(yHi + yLo - y)).toBeLessThan(1e-12);
  });

  it('simplifies collinear GPS micro-jitter via iterative RDP while preserving true corners', () => {
    const simplified = simplifyMercatorRdp(
      [0.5, 0.5005, 0.501, 0.502],
      [0.3, 0.30050001, 0.301, 0.3],
      1e-10
    );

    expect(simplified.vx).toEqual([0.5, 0.501, 0.502]);
    expect(simplified.vy).toEqual([0.3, 0.301, 0.3]);
  });

  it('computes symmetric adjacent join directions for bends and flush-start U-turns', () => {
    // 90° bend East -> South: both segments receive exact adjacent directions for seamless miter
    const corner = computeAdjacentJoinDirs(1, 0, 0, 1);
    expect(corner).toEqual({
      endNextDx: 0,
      endNextDy: 1,
      startPrevDx: 1,
      startPrevDy: 0,
    });

    // 180° U-turn East -> West: incoming gets open round cap (0, 0), outgoing starts flush (prev = next)
    const uturn = computeAdjacentJoinDirs(1, 0, -1, 0);
    expect(uturn).toEqual({
      endNextDx: 0,
      endNextDy: 0,
      startPrevDx: -1,
      startPrevDy: 0,
    });
  });

  it('packs RDP-simplified multi-point tracks into 12-float ribbon segments across 3 LOD tiers', () => {
    const tracks = new Map<string, GPXTrack>([
      [
        'track-1',
        {
          id: 'track-1',
          name: 'Ride 1',
          points: [
            { lat: 54.35, lon: 18.65 },
            { lat: 54.35001, lon: 18.65001 }, // collinear micro-jitter -> removed by RDP
            { lat: 54.3515, lon: 18.6505 }, // ~50m corner -> kept in full, dropped in medium/low
            { lat: 54.365, lon: 18.662 }, // ~200m corner -> kept in full & medium, dropped in low
            { lat: 54.38, lon: 18.68 }, // endpoint -> kept in all tiers
          ],
        },
      ],
    ]);

    const packed = packTracksForHeatmap(tracks);
    expect(packed.fullSegmentCount).toBe(3);
    expect(packed.fullSegments).toHaveLength(3 * FLOATS_PER_PACKED_SEGMENT);
    expect(packed.mediumZoomSegmentCount).toBe(2);
    expect(packed.lowZoomSegmentCount).toBe(1);

    // First segment has open start cap (0, 0) and non-zero outgoing direction at its end
    expect(packed.fullSegments[8]).toBe(0);
    expect(packed.fullSegments[9]).toBe(0);
    expect(Math.hypot(packed.fullSegments[10], packed.fullSegments[11])).toBeCloseTo(1, 5);

    // Last segment has open end cap (0, 0)
    const lastBase = (packed.fullSegmentCount - 1) * FLOATS_PER_PACKED_SEGMENT;
    expect(packed.fullSegments[lastBase + 10]).toBe(0);
    expect(packed.fullSegments[lastBase + 11]).toBe(0);
  });

  it('preserves single-point tracks as zero-length segments with open caps (#165)', () => {
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
    expect(packed.fullSegments[0]).toBe(packed.fullSegments[2]);
    expect(packed.fullSegments[1]).toBe(packed.fullSegments[3]);
    expect(packed.fullSegments[8]).toBe(0);
    expect(packed.fullSegments[9]).toBe(0);
    expect(packed.fullSegments[10]).toBe(0);
    expect(packed.fullSegments[11]).toBe(0);
  });
});
