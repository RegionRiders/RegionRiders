import { GPXTrack } from '@/lib/types';

/**
 * Each packed ribbon segment consists of 12 float32 values (48 bytes):
 * - [0..3]  a_segmentHi: [x0Hi, y0Hi, x1Hi, y1Hi] (Double-Single hi Mercator coords)
 * - [4..7]  a_segmentLo: [x0Lo, y0Lo, x1Lo, y1Lo] (Double-Single lo Mercator coords)
 * - [8..11] a_adjDirs:   [prevDx, prevDy, nextDx, nextDy]
 *           Unit Mercator directions of the incoming segment at p0 and outgoing segment at p1,
 *           used by the vertex shader to extrude a continuous miter/bevel polyline ribbon with
 *           zero circular end-cap overlap at intermediate vertices.
 *           (0, 0) indicates an open round cap (track start/end, U-turn tip, or single-point dot).
 *
 * Future metric overlays (speed, temperature, heart rate) can attach a parallel 1-float-per-segment
 * VBO to the same VAO without altering this geometry layout.
 */
export const FLOATS_PER_PACKED_SEGMENT = 12;

export interface PackedHeatmapGeometry {
  /** High-detail RDP-simplified ribbon segments (~6m tolerance) for close/city zoom (z >= 10.5) */
  fullSegments: Float32Array;
  fullSegmentCount: number;
  /** Regional-detail RDP-simplified ribbon segments (~80m tolerance) for regional zoom (7.5 <= z < 10.5) */
  mediumZoomSegments: Float32Array;
  mediumZoomSegmentCount: number;
  /** Country/continent-detail RDP-simplified ribbon segments (~500m tolerance) for low zoom (z < 7.5) */
  lowZoomSegments: Float32Array;
  lowZoomSegmentCount: number;
}

const MAX_MERCATOR_LAT = 85.05112877980659;

// Squared Mercator RDP simplification tolerances (1 Mercator unit ≈ 40,075 km at equator)
const HIGH_DETAIL_RDP_TOLERANCE_SQ = 2.2e-14; // ~6m
const MEDIUM_ZOOM_RDP_TOLERANCE_SQ = 4.0e-12; // ~80m
const LOW_ZOOM_RDP_TOLERANCE_SQ = 1.6e-10; // ~500m

/** Dot product below which two consecutive segments form a near-180° U-turn reversal (~148°). */
const UTURN_DOT_THRESHOLD = -0.85;

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
 * Iterative Ramer-Douglas-Peucker simplification in Mercator coordinates.
 * Removes 1-second GPS micro-jitter and collinear vertices while preserving true corners
 * and hairpins for clean polyline ribbon extrusion.
 */
export function simplifyMercatorRdp(
  vx: number[],
  vy: number[],
  toleranceSq: number
): { vx: number[]; vy: number[] } {
  const len = vx.length;
  if (len <= 2 || toleranceSq <= 0) {
    return { vx, vy };
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

  const outX: number[] = [];
  const outY: number[] = [];
  for (let i = 0; i < len; i++) {
    if (keep[i]) {
      outX.push(vx[i]);
      outY.push(vy[i]);
    }
  }
  return { vx: outX, vy: outY };
}

/**
 * Computes the adjacent unit directions stored at the shared vertex between `dPrev` and `dNext`:
 * - Normal bend (`dot >= -0.85`): both segments share exact `(dPrev, dNext)` so their ribbon
 *   miter/bevel edges meet seamlessly with zero overlap and zero circular cap.
 * - Near-180° U-turn (`dot < -0.85`): incoming segment gets a clean round cap (`next = [0, 0]`)
 *   while outgoing segment starts flush (`prev = dNext`, no backward protrusion past the tip)
 *   so the return leg cleanly sums additively to 2.0.
 */
export function computeAdjacentJoinDirs(
  prevDx: number,
  prevDy: number,
  nextDx: number,
  nextDy: number
): { endNextDx: number; endNextDy: number; startPrevDx: number; startPrevDy: number } {
  const dot = prevDx * nextDx + prevDy * nextDy;

  if (dot < UTURN_DOT_THRESHOLD) {
    return {
      endNextDx: 0,
      endNextDy: 0,
      startPrevDx: nextDx,
      startPrevDy: nextDy,
    };
  }

  return {
    endNextDx: nextDx,
    endNextDy: nextDy,
    startPrevDx: prevDx,
    startPrevDy: prevDy,
  };
}

function pushPackedSegment(
  values: number[],
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  prevDx: number,
  prevDy: number,
  nextDx: number,
  nextDy: number
): void {
  const [x0Hi, x0Lo] = splitFloat64(x0);
  const [y0Hi, y0Lo] = splitFloat64(y0);
  const [x1Hi, x1Lo] = splitFloat64(x1);
  const [y1Hi, y1Lo] = splitFloat64(y1);
  values.push(x0Hi, y0Hi, x1Hi, y1Hi, x0Lo, y0Lo, x1Lo, y1Lo, prevDx, prevDy, nextDx, nextDy);
}

function packTrackSegments(tracks: Map<string, GPXTrack>, toleranceSq: number): Float32Array {
  const values: number[] = [];

  tracks.forEach((track) => {
    const points = track.points;
    if (!points || points.length === 0) {
      return;
    }

    // 1. Collect deduplicated Mercator vertices for this track
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
      return;
    }

    // Preserve single-point or zero-length tracks as a visible round dot (#165)
    if (rawX.length === 1) {
      pushPackedSegment(values, rawX[0], rawY[0], rawX[0], rawY[0], 0, 0, 0, 0);
      return;
    }

    // 2. Simplify via iterative RDP to remove GPS micro-jitter while preserving corners
    const { vx, vy } = simplifyMercatorRdp(rawX, rawY, toleranceSq);
    const vertCount = vx.length;

    if (vertCount === 1) {
      pushPackedSegment(values, vx[0], vy[0], vx[0], vy[0], 0, 0, 0, 0);
      return;
    }

    const segCount = vertCount - 1;
    const dirX = new Float64Array(segCount);
    const dirY = new Float64Array(segCount);

    for (let s = 0; s < segCount; s++) {
      const dx = vx[s + 1] - vx[s];
      const dy = vy[s + 1] - vy[s];
      const len = Math.hypot(dx, dy);
      if (len > 0) {
        dirX[s] = dx / len;
        dirY[s] = dy / len;
      }
    }

    // 3. Compute adjacent directions for seamless ribbon miter/bevel joins
    const prevDxArr = new Float64Array(segCount);
    const prevDyArr = new Float64Array(segCount);
    const nextDxArr = new Float64Array(segCount);
    const nextDyArr = new Float64Array(segCount);

    for (let s = 0; s < segCount - 1; s++) {
      const join = computeAdjacentJoinDirs(dirX[s], dirY[s], dirX[s + 1], dirY[s + 1]);
      nextDxArr[s] = join.endNextDx;
      nextDyArr[s] = join.endNextDy;
      prevDxArr[s + 1] = join.startPrevDx;
      prevDyArr[s + 1] = join.startPrevDy;
    }

    // 4. Emit packed ribbon segments
    for (let s = 0; s < segCount; s++) {
      pushPackedSegment(
        values,
        vx[s],
        vy[s],
        vx[s + 1],
        vy[s + 1],
        prevDxArr[s],
        prevDyArr[s],
        nextDxArr[s],
        nextDyArr[s]
      );
    }
  });

  return new Float32Array(values);
}

/**
 * Packs GPX tracks into flat GPU-ready Double-Single Mercator polyline ribbon buffers
 * with RDP simplification and adjacent join directions across 3 LOD tiers.
 */
export function packTracksForHeatmap(tracks: Map<string, GPXTrack>): PackedHeatmapGeometry {
  const fullSegments = packTrackSegments(tracks, HIGH_DETAIL_RDP_TOLERANCE_SQ);
  const mediumZoomSegments = packTrackSegments(tracks, MEDIUM_ZOOM_RDP_TOLERANCE_SQ);
  const lowZoomSegments = packTrackSegments(tracks, LOW_ZOOM_RDP_TOLERANCE_SQ);

  return {
    fullSegments,
    fullSegmentCount: fullSegments.length / FLOATS_PER_PACKED_SEGMENT,
    mediumZoomSegments,
    mediumZoomSegmentCount: mediumZoomSegments.length / FLOATS_PER_PACKED_SEGMENT,
    lowZoomSegments,
    lowZoomSegmentCount: lowZoomSegments.length / FLOATS_PER_PACKED_SEGMENT,
  };
}
