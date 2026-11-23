import {
  computeJoinNormals,
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

    expect(Math.abs(xHi + xLo - x)).toBeLessThan(1e-12);
    expect(Math.abs(yHi + yLo - y)).toBeLessThan(1e-12);
  });

  it('computes bit-identical bisector normals for straight and bent joins, and open-tip overlap for 180° U-turns', () => {
    // Straight line East -> East
    const straight = computeJoinNormals(1, 0, 1, 0);
    expect(straight).toEqual({ endNx: 1, endNy: 0, startNx: 1, startNy: 0 });

    // 90° bend East -> South: exact 45° diagonal bisector shared identically
    const corner = computeJoinNormals(1, 0, 0, 1);
    expect(corner.endNx).toBeCloseTo(Math.SQRT1_2, 6);
    expect(corner.endNy).toBeCloseTo(Math.SQRT1_2, 6);
    expect(corner.startNx).toBe(corner.endNx);
    expect(corner.startNy).toBe(corner.endNy);

    // 180° U-turn East -> West: incoming keeps round tip (0,0), outgoing clips cap and overlaps return leg
    const uturn = computeJoinNormals(1, 0, -1, 0);
    expect(uturn).toEqual({ endNx: 0, endNy: 0, startNx: -1, startNy: 0 });
  });

  it('packs multi-point tracks into 12-float segments with shared join normals across 3 LOD tiers', () => {
    const tracks = new Map<string, GPXTrack>([
      [
        'track-1',
        {
          id: 'track-1',
          name: 'Ride 1',
          points: [
            { lat: 54.35, lon: 18.65 },
            { lat: 54.3502, lon: 18.6502 }, // included in fullSegments, skipped in medium/low
            { lat: 54.3525, lon: 18.6525 }, // included in mediumZoomSegments, skipped in low
            { lat: 54.38, lon: 18.68 }, // included in all tiers
          ],
        },
      ],
    ]);

    const packed = packTracksForHeatmap(tracks);
    expect(packed.fullSegmentCount).toBe(3);
    expect(packed.fullSegments).toHaveLength(3 * FLOATS_PER_PACKED_SEGMENT);
    expect(packed.mediumZoomSegmentCount).toBe(2);
    expect(packed.lowZoomSegmentCount).toBe(1);

    // First segment has open start cap (0, 0) and non-zero end join normal matching second segment's start join normal
    expect(packed.fullSegments[8]).toBe(0);
    expect(packed.fullSegments[9]).toBe(0);
    expect(packed.fullSegments[10]).toBe(packed.fullSegments[FLOATS_PER_PACKED_SEGMENT + 8]);
    expect(packed.fullSegments[11]).toBe(packed.fullSegments[FLOATS_PER_PACKED_SEGMENT + 9]);

    // Last segment has open end cap (0, 0)
    const lastBase = 2 * FLOATS_PER_PACKED_SEGMENT;
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
