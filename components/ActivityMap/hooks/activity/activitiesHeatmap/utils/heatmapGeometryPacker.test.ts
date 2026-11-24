import {
  FLOATS_PER_PACKED_SEGMENT,
  lngLatToMercator,
  packTracksForHeatmap,
  simplifyMercatorRdp,
  splitFloat64,
} from '@/components/ActivityMap/hooks/activity/activitiesHeatmap/utils/heatmapGeometryPacker';
import { GPXTrack } from '@/lib/types';

function isZeroLengthPackedSegment(segments: Float32Array, segIndex: number): boolean {
  const base = segIndex * FLOATS_PER_PACKED_SEGMENT;
  return (
    segments[base] === segments[base + 2] &&
    segments[base + 1] === segments[base + 3] &&
    segments[base + 4] === segments[base + 6] &&
    segments[base + 5] === segments[base + 7]
  );
}

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

  it('packs RDP-simplified multi-point tracks into 10-float segments across 3 LOD tiers', () => {
    expect(FLOATS_PER_PACKED_SEGMENT).toBe(10);

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
    expect(packed.mediumZoomSegments).toHaveLength(2 * FLOATS_PER_PACKED_SEGMENT);
    expect(packed.lowZoomSegmentCount).toBe(1);
    expect(packed.lowZoomSegments).toHaveLength(FLOATS_PER_PACKED_SEGMENT);

    // Verify Double-Single Hi+Lo reconstruction at track start, joins, and track end
    const [startX, startY] = lngLatToMercator(18.65, 54.35);
    const [endX, endY] = lngLatToMercator(18.68, 54.38);

    expect(packed.fullSegments[0] + packed.fullSegments[4]).toBeCloseTo(startX, 11);
    expect(packed.fullSegments[1] + packed.fullSegments[5]).toBeCloseTo(startY, 11);

    const lastBase = (packed.fullSegmentCount - 1) * FLOATS_PER_PACKED_SEGMENT;
    expect(packed.fullSegments[lastBase + 2] + packed.fullSegments[lastBase + 6]).toBeCloseTo(
      endX,
      11
    );
    expect(packed.fullSegments[lastBase + 3] + packed.fullSegments[lastBase + 7]).toBeCloseTo(
      endY,
      11
    );

    // Consecutive segments share bitwise-identical Double-Single endpoints
    expect(packed.fullSegments[2]).toBe(packed.fullSegments[10]);
    expect(packed.fullSegments[3]).toBe(packed.fullSegments[11]);
    expect(packed.fullSegments[6]).toBe(packed.fullSegments[14]);
    expect(packed.fullSegments[7]).toBe(packed.fullSegments[15]);

    for (let i = 0; i < packed.fullSegmentCount; i++) {
      expect(isZeroLengthPackedSegment(packed.fullSegments, i)).toBe(false);
    }
  });

  it('preserves single-point and duplicate-point tracks as a single zero-length segment (#165)', () => {
    const singlePoint = new Map<string, GPXTrack>([
      [
        'dot-track',
        {
          id: 'dot-track',
          name: 'Dot',
          points: [{ lat: 54.35, lon: 18.65 }],
        },
      ],
    ]);

    const packedSingle = packTracksForHeatmap(singlePoint);
    expect(packedSingle.fullSegmentCount).toBe(1);
    expect(packedSingle.mediumZoomSegmentCount).toBe(1);
    expect(packedSingle.lowZoomSegmentCount).toBe(1);
    expect(packedSingle.fullSegments).toHaveLength(FLOATS_PER_PACKED_SEGMENT);
    expect(isZeroLengthPackedSegment(packedSingle.fullSegments, 0)).toBe(true);
    expect(isZeroLengthPackedSegment(packedSingle.mediumZoomSegments, 0)).toBe(true);
    expect(isZeroLengthPackedSegment(packedSingle.lowZoomSegments, 0)).toBe(true);

    const duplicatePoints = new Map<string, GPXTrack>([
      [
        'dup-track',
        {
          id: 'dup-track',
          name: 'Dup Dot',
          points: [
            { lat: 54.35, lon: 18.65 },
            { lat: Number.NaN, lon: 18.65 },
            { lat: 54.35, lon: 18.65 },
            { lat: 54.35, lon: 18.65 },
          ],
        },
      ],
    ]);

    const packedDup = packTracksForHeatmap(duplicatePoints);
    expect(packedDup.fullSegmentCount).toBe(1);
    expect(packedDup.mediumZoomSegmentCount).toBe(1);
    expect(packedDup.lowZoomSegmentCount).toBe(1);
    expect(isZeroLengthPackedSegment(packedDup.fullSegments, 0)).toBe(true);
  });

  it('collapses tiny closed loops [A, B, A] below toleranceSq to a single #165 dot without stray interior zero-length segments', () => {
    // ~1m out-and-back loop: smaller than all 3 RDP tolerances
    const tinyLoop = new Map<string, GPXTrack>([
      [
        'tiny-loop',
        {
          id: 'tiny-loop',
          name: 'Tiny Loop',
          points: [
            { lat: 54.35, lon: 18.65 },
            { lat: 54.350008, lon: 18.650008 },
            { lat: 54.35, lon: 18.65 },
          ],
        },
      ],
    ]);

    const packedTiny = packTracksForHeatmap(tinyLoop);
    expect(packedTiny.fullSegmentCount).toBe(1);
    expect(packedTiny.mediumZoomSegmentCount).toBe(1);
    expect(packedTiny.lowZoomSegmentCount).toBe(1);
    expect(isZeroLengthPackedSegment(packedTiny.fullSegments, 0)).toBe(true);
    expect(isZeroLengthPackedSegment(packedTiny.mediumZoomSegments, 0)).toBe(true);
    expect(isZeroLengthPackedSegment(packedTiny.lowZoomSegments, 0)).toBe(true);

    // ~250m out-and-back loop: resolved in full & medium tiers (2 segments), collapsed to 1 #165 dot in low-zoom
    const mediumLoop = new Map<string, GPXTrack>([
      [
        'medium-loop',
        {
          id: 'medium-loop',
          name: 'Medium Loop',
          points: [
            { lat: 54.35, lon: 18.65 },
            { lat: 54.3518, lon: 18.6518 },
            { lat: 54.35, lon: 18.65 },
          ],
        },
      ],
    ]);

    const packedMedium = packTracksForHeatmap(mediumLoop);
    expect(packedMedium.fullSegmentCount).toBe(2);
    expect(packedMedium.mediumZoomSegmentCount).toBe(2);
    expect(packedMedium.lowZoomSegmentCount).toBe(1);
    expect(isZeroLengthPackedSegment(packedMedium.fullSegments, 0)).toBe(false);
    expect(isZeroLengthPackedSegment(packedMedium.fullSegments, 1)).toBe(false);
    expect(isZeroLengthPackedSegment(packedMedium.lowZoomSegments, 0)).toBe(true);
  });

  it('skips quantized zero-length interior segments while preserving collapsed 2-point sub-millimeter tracks', () => {
    const interiorQuantized = new Map<string, GPXTrack>([
      [
        'quantized-interior',
        {
          id: 'quantized-interior',
          name: 'Quantized Interior',
          points: [
            { lat: 54.35, lon: 18.65 },
            { lat: 54.355, lon: 18.655 },
            // Differs by 1e-13 deg (~1e-8 m), so Mercator float64 differs slightly yet splitFloat64 matches B
            { lat: 54.355 + 1e-13, lon: 18.655 + 1e-13 },
            { lat: 54.365, lon: 18.66 },
          ],
        },
      ],
    ]);

    const packedInterior = packTracksForHeatmap(interiorQuantized);
    expect(packedInterior.fullSegmentCount).toBe(2);
    expect(isZeroLengthPackedSegment(packedInterior.fullSegments, 0)).toBe(false);
    expect(isZeroLengthPackedSegment(packedInterior.fullSegments, 1)).toBe(false);

    const collapsedTwoPoint = new Map<string, GPXTrack>([
      [
        'quantized-dot',
        {
          id: 'quantized-dot',
          name: 'Quantized Dot',
          points: [
            { lat: 54.35, lon: 18.65 },
            // 1.5e-14 deg differs in float64 Mercator yet quantizes identically in splitFloat64
            { lat: 54.35 + 1.5e-14, lon: 18.65 + 1.5e-14 },
          ],
        },
      ],
    ]);

    const [m0x, m0y] = lngLatToMercator(18.65, 54.35);
    const [m1x, m1y] = lngLatToMercator(18.65 + 1.5e-14, 54.35 + 1.5e-14);
    expect(m0x !== m1x || m0y !== m1y).toBe(true);

    const packedDot = packTracksForHeatmap(collapsedTwoPoint);
    expect(packedDot.fullSegmentCount).toBe(1);
    expect(isZeroLengthPackedSegment(packedDot.fullSegments, 0)).toBe(true);
  });

  it('returns empty segment buffers for empty or non-finite tracks', () => {
    const emptyTracks = new Map<string, GPXTrack>([
      ['empty', { id: 'empty', name: 'Empty', points: [] }],
      [
        'nan-track',
        {
          id: 'nan-track',
          name: 'NaN',
          points: [{ lat: Number.NaN, lon: 18.65 }],
        },
      ],
    ]);

    const packed = packTracksForHeatmap(emptyTracks);
    expect(packed.fullSegmentCount).toBe(0);
    expect(packed.mediumZoomSegmentCount).toBe(0);
    expect(packed.lowZoomSegmentCount).toBe(0);
  });

  it('conserves exact clean arc length across all 3 LOD tiers and computes trackExtentMerc = min(totalArc, bboxPerimeter)', () => {
    const sumSegArc = (buf: Float32Array, count: number): number => {
      let total = 0;
      for (let i = 0; i < count; i++) {
        total += buf[i * FLOATS_PER_PACKED_SEGMENT + 8];
      }
      return total;
    };

    // Dense multi-loop walk in a ~400m x 400m Vienna square:
    // totalArcMerc >> bboxPerimeterMerc, and lowZoom collapses intermediate zig-zags.
    const zigZagPoints = [];
    for (let i = 0; i < 20; i++) {
      const lat = 48.2082 + (i % 2 === 0 ? 0 : 0.003);
      const lon = 16.3738 + (i % 4 < 2 ? 0 : 0.004);
      zigZagPoints.push({ lat, lon });
    }
    const viennaWalk = new Map<string, GPXTrack>([
      ['vienna-walk', { id: 'vienna-walk', name: 'Vienna Old Town', points: zigZagPoints }],
    ]);

    const packedWalk = packTracksForHeatmap(viennaWalk);
    const fullArc = sumSegArc(packedWalk.fullSegments, packedWalk.fullSegmentCount);
    const mediumArc = sumSegArc(packedWalk.mediumZoomSegments, packedWalk.mediumZoomSegmentCount);
    const lowArc = sumSegArc(packedWalk.lowZoomSegments, packedWalk.lowZoomSegmentCount);

    expect(fullArc).toBeGreaterThan(0);
    expect(mediumArc).toBeCloseTo(fullArc, 7);
    expect(lowArc).toBeCloseTo(fullArc, 7);

    // trackExtentMerc must equal bboxPerimeterMerc (< totalArcMerc) for multi-loop city walking
    const extentWalk = packedWalk.lowZoomSegments[9];
    expect(extentWalk).toBeGreaterThan(0);
    expect(fullArc / extentWalk).toBeGreaterThan(2.5);

    // Single straight segment: trackExtentMerc === totalArcMerc
    const straightRide = new Map<string, GPXTrack>([
      [
        'straight',
        {
          id: 'straight',
          name: 'Straight',
          points: [
            { lat: 48.2, lon: 16.3 },
            { lat: 48.25, lon: 16.35 },
          ],
        },
      ],
    ]);
    const packedStraight = packTracksForHeatmap(straightRide);
    expect(packedStraight.fullSegments[8]).toBeCloseTo(packedStraight.fullSegments[9], 8);
  });
});
