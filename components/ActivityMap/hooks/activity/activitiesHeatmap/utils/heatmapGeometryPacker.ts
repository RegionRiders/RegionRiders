import { GPXTrack } from '@/lib/types';

/**
 * Each packed hairline segment consists of 10 float32 values (40 bytes):
 * - [0..3] a_segmentHi: [x0Hi, y0Hi, x1Hi, y1Hi] (Double-Single hi Mercator coords)
 * - [4..7] a_segmentLo: [x0Lo, y0Lo, x1Lo, y1Lo] (Double-Single lo Mercator coords)
 * - [8..9] a_segmentMeta: [segArcMerc, trackExtentMerc]
 *
 * Approach A renders 1px analytic Gaussian hairlines via exact erf/erfc integration along each
 * segment (telescoping seamlessly across shared vertices without miter/join geometry) followed by
 * conditional separable Gaussian blur. `segArcMerc` preserves true clean polyline arc length across
 * LOD simplification, and `trackExtentMerc = min(totalArcMerc, bboxPerimeterMerc)` lets the vertex
 * shader compensate sub-kernel 2D Gaussian dilution when zoomed far out so small-area activities
 * remain visible as crisp dots.
 */
export const FLOATS_PER_PACKED_SEGMENT = 10;

export interface PackedHeatmapGeometry {
  /** High-detail RDP-simplified segments (~6m tolerance) for close/city zoom (z >= 9.0) */
  fullSegments: Float32Array;
  fullSegmentCount: number;
  /** Regional-detail RDP-simplified segments (~80m tolerance) for regional zoom (6.0 <= z < 9.0) */
  mediumZoomSegments: Float32Array;
  mediumZoomSegmentCount: number;
  /** Country/continent-detail RDP-simplified segments (~500m tolerance) for low zoom (z < 6.0) */
  lowZoomSegments: Float32Array;
  lowZoomSegmentCount: number;
}

const MAX_MERCATOR_LAT = 85.05112877980659;

// Squared Mercator RDP simplification tolerances (1 Mercator unit ≈ 40,075 km at equator)
const HIGH_DETAIL_RDP_TOLERANCE_SQ = 2.2e-14; // ~6m
const MEDIUM_ZOOM_RDP_TOLERANCE_SQ = 4.0e-12; // ~80m
const LOW_ZOOM_RDP_TOLERANCE_SQ = 1.6e-10; // ~500m

/**
 * Splits a 64-bit IEEE 754 float into two 32-bit floats [hi, lo] such that hi + lo ≈ value
 * with ~48 bits of mantissa precision (~0.14mm precision on Earth).
 */
export function splitFloat64(value: number): [number, number] {
  const hi = Math.fround(value);
  const lo = Math.fround(value - hi);
  return [hi, lo];
}

/**
 * Converts WGS84 latitude/longitude to MapLibre normalized Web Mercator [0..1] coordinates.
 */
export function lngLatToMercator(lon: number, lat: number): [number, number] {
  const clampedLat = Math.max(-MAX_MERCATOR_LAT, Math.min(MAX_MERCATOR_LAT, lat));
  const x = (lon + 180) / 360;
  const sinLat = Math.sin((clampedLat * Math.PI) / 180);
  const y = 0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI);
  return [x, y];
}

function sqPointToSegmentDist(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  let x = x1;
  let y = y1;
  let dx = x2 - x1;
  let dy = y2 - y1;

  if (dx !== 0 || dy !== 0) {
    const t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy);
    if (t > 1) {
      x = x2;
      y = y2;
    } else if (t > 0) {
      x += dx * t;
      y += dy * t;
    }
  }

  dx = px - x;
  dy = py - y;
  return dx * dx + dy * dy;
}

/**
 * Iterative Ramer-Douglas-Peucker simplification returning kept indices into (vx, vy).
 */
export function simplifyMercatorRdpIndices(
  vx: number[],
  vy: number[],
  toleranceSq: number
): number[] {
  const len = vx.length;
  if (len === 0) {
    return [];
  }
  if (len <= 2 || toleranceSq <= 0) {
    return Array.from({ length: len }, (_, i) => i);
  }

  const keep = new Uint8Array(len);
  keep[0] = 1;
  keep[len - 1] = 1;

  const stack: number[] = [0, len - 1];

  while (stack.length > 0) {
    const end = stack.pop()!;
    const start = stack.pop()!;

    let maxSqDist = 0;
    let index = -1;
    const x1 = vx[start];
    const y1 = vy[start];
    const x2 = vx[end];
    const y2 = vy[end];

    for (let i = start + 1; i < end; i++) {
      const sqDist = sqPointToSegmentDist(vx[i], vy[i], x1, y1, x2, y2);
      if (sqDist > maxSqDist) {
        index = i;
        maxSqDist = sqDist;
      }
    }

    if (maxSqDist > toleranceSq && index !== -1) {
      keep[index] = 1;
      stack.push(start, index, index, end);
    }
  }

  const keptIndices: number[] = [];
  for (let i = 0; i < len; i++) {
    if (keep[i]) {
      keptIndices.push(i);
    }
  }
  return keptIndices;
}

/**
 * Iterative Ramer-Douglas-Peucker simplification in Mercator coordinates.
 * Removes 1-second GPS micro-jitter and collinear vertices while preserving true corners
 * and hairpins across all 3 LOD levels.
 */
export function simplifyMercatorRdp(
  vx: number[],
  vy: number[],
  toleranceSq: number
): { vx: number[]; vy: number[] } {
  const keptIndices = simplifyMercatorRdpIndices(vx, vy, toleranceSq);
  return {
    vx: keptIndices.map((i) => vx[i]),
    vy: keptIndices.map((i) => vy[i]),
  };
}

function pushPackedSegment(
  values: number[],
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  segArcMerc: number,
  trackExtentMerc: number
): void {
  const [x0Hi, x0Lo] = splitFloat64(x0);
  const [y0Hi, y0Lo] = splitFloat64(y0);
  const [x1Hi, x1Lo] = splitFloat64(x1);
  const [y1Hi, y1Lo] = splitFloat64(y1);
  values.push(x0Hi, y0Hi, x1Hi, y1Hi, x0Lo, y0Lo, x1Lo, y1Lo, segArcMerc, trackExtentMerc);
}

interface CleanTrackData {
  vx: number[];
  vy: number[];
  cumArc: number[];
  totalArcMerc: number;
  trackExtentMerc: number;
}

function buildCleanTrackData(track: GPXTrack): CleanTrackData | null {
  const points = track.points;
  if (!points || points.length === 0) {
    return null;
  }

  const rawX: number[] = [];
  const rawY: number[] = [];

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (!Number.isFinite(p.lat) || !Number.isFinite(p.lon)) {
      continue;
    }

    const [x, y] = lngLatToMercator(p.lon, p.lat);
    const count = rawX.length;

    if (count > 0 && x === rawX[count - 1] && y === rawY[count - 1]) {
      continue;
    }

    rawX.push(x);
    rawY.push(y);
  }

  if (rawX.length === 0) {
    return null;
  }

  if (rawX.length === 1) {
    return {
      vx: rawX,
      vy: rawY,
      cumArc: [0],
      totalArcMerc: 0,
      trackExtentMerc: 0,
    };
  }

  // Clean GPS micro-jitter once at ~6m tolerance so jitter does not inflate arc length
  const { vx, vy } = simplifyMercatorRdp(rawX, rawY, HIGH_DETAIL_RDP_TOLERANCE_SQ);
  const vertCount = vx.length;

  if (vertCount === 0) {
    return null;
  }

  const cumArc: number[] = new Array(vertCount);
  cumArc[0] = 0;

  let minX = vx[0];
  let maxX = vx[0];
  let minY = vy[0];
  let maxY = vy[0];

  for (let i = 1; i < vertCount; i++) {
    const x = vx[i];
    const y = vy[i];
    if (x < minX) {
      minX = x;
    } else if (x > maxX) {
      maxX = x;
    }
    if (y < minY) {
      minY = y;
    } else if (y > maxY) {
      maxY = y;
    }
    cumArc[i] = cumArc[i - 1] + Math.hypot(x - vx[i - 1], y - vy[i - 1]);
  }

  const totalArcMerc = cumArc[vertCount - 1];
  const bboxPerimeterMerc = 2 * (maxX - minX + (maxY - minY));
  const trackExtentMerc = Math.min(totalArcMerc, bboxPerimeterMerc);

  return {
    vx,
    vy,
    cumArc,
    totalArcMerc,
    trackExtentMerc,
  };
}

function packCleanTracksForLod(cleanTracks: CleanTrackData[], toleranceSq: number): Float32Array {
  const values: number[] = [];

  for (let t = 0; t < cleanTracks.length; t++) {
    const { vx, vy, cumArc, totalArcMerc, trackExtentMerc } = cleanTracks[t];

    if (vx.length === 1) {
      pushPackedSegment(values, vx[0], vy[0], vx[0], vy[0], 0, 0);
      continue;
    }

    const keptIndices =
      toleranceSq <= HIGH_DETAIL_RDP_TOLERANCE_SQ
        ? Array.from({ length: vx.length }, (_, i) => i)
        : simplifyMercatorRdpIndices(vx, vy, toleranceSq);

    if (keptIndices.length === 0) {
      continue;
    }

    if (keptIndices.length === 1) {
      const idx = keptIndices[0];
      pushPackedSegment(values, vx[idx], vy[idx], vx[idx], vy[idx], totalArcMerc, trackExtentMerc);
      continue;
    }

    let emittedForTrack = 0;
    let pendingArc = 0;

    for (let s = 0; s < keptIndices.length - 1; s++) {
      const i0 = keptIndices[s];
      const i1 = keptIndices[s + 1];
      const segArcMerc = cumArc[i1] - cumArc[i0] + pendingArc;

      const [x0Hi, x0Lo] = splitFloat64(vx[i0]);
      const [y0Hi, y0Lo] = splitFloat64(vy[i0]);
      const [x1Hi, x1Lo] = splitFloat64(vx[i1]);
      const [y1Hi, y1Lo] = splitFloat64(vy[i1]);

      if (x0Hi === x1Hi && y0Hi === y1Hi && x0Lo === x1Lo && y0Lo === y1Lo) {
        pendingArc = segArcMerc;
        continue;
      }

      pendingArc = 0;
      values.push(x0Hi, y0Hi, x1Hi, y1Hi, x0Lo, y0Lo, x1Lo, y1Lo, segArcMerc, trackExtentMerc);
      emittedForTrack += 1;
    }

    // Preserve collapsed loops (e.g. [A, B, A] smaller than toleranceSq) as a #165 dot with full track mass
    if (emittedForTrack === 0) {
      const idx = keptIndices[0];
      pushPackedSegment(values, vx[idx], vy[idx], vx[idx], vy[idx], totalArcMerc, trackExtentMerc);
    } else if (pendingArc > 0) {
      // Fold any trailing quantized zero-length arc into the last emitted segment
      values[values.length - 2] += pendingArc;
    }
  }

  return new Float32Array(values);
}

/**
 * Packs GPX tracks into flat GPU-ready 10-float Double-Single Mercator hairline segment buffers
 * with iterative RDP simplification across 3 LOD tiers and exact arc-length conservation.
 */
export function packTracksForHeatmap(tracks: Map<string, GPXTrack>): PackedHeatmapGeometry {
  const cleanTracks: CleanTrackData[] = [];
  tracks.forEach((track) => {
    const clean = buildCleanTrackData(track);
    if (clean) {
      cleanTracks.push(clean);
    }
  });

  const fullSegments = packCleanTracksForLod(cleanTracks, HIGH_DETAIL_RDP_TOLERANCE_SQ);
  const mediumZoomSegments = packCleanTracksForLod(cleanTracks, MEDIUM_ZOOM_RDP_TOLERANCE_SQ);
  const lowZoomSegments = packCleanTracksForLod(cleanTracks, LOW_ZOOM_RDP_TOLERANCE_SQ);

  return {
    fullSegments,
    fullSegmentCount: fullSegments.length / FLOATS_PER_PACKED_SEGMENT,
    mediumZoomSegments,
    mediumZoomSegmentCount: mediumZoomSegments.length / FLOATS_PER_PACKED_SEGMENT,
    lowZoomSegments,
    lowZoomSegmentCount: lowZoomSegments.length / FLOATS_PER_PACKED_SEGMENT,
  };
}
