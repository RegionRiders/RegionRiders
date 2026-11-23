import { GPXTrack } from '@/lib/types';

/**
 * Each packed segment consists of 9 float32 values (36 bytes):
 * - [0..3] a_segmentHi: [x0Hi, y0Hi, x1Hi, y1Hi] (Double-Single hi Mercator coords)
 * - [4..7] a_segmentLo: [x0Lo, y0Lo, x1Lo, y1Lo] (Double-Single lo Mercator coords)
 * - [8]    a_channel:   MRT channel index [0 .. channelsPerBatch - 1] for per-track MAX blending
 *
 * Future metric overlays (speed, temperature, heart rate) can attach a parallel 1-float-per-segment
 * VBO to the same VAO without altering this geometry layout or batching structure.
 */
export const FLOATS_PER_PACKED_SEGMENT = 9;

/** Default channels per MRT batch (4 RGBA8 attachments = 16 channels, guaranteed on all WebGL2 GPUs). */
export const DEFAULT_CHANNELS_PER_BATCH = 16;

export interface PackedHeatmapBatch {
  /** Starting segment (instance) index inside the LOD Float32Array */
  segmentOffset: number;
  /** Number of segments (instances) in this batch */
  segmentCount: number;
  /** Exact Mercator bounding box [minX, minY, maxX, maxY] of all segments in this batch */
  bbox: [number, number, number, number];
}

export interface PackedHeatmapGeometry {
  /** Number of independent MRT channels per batch (16 on 4-MRT mobile, 32 on 8-MRT desktop) */
  channelsPerBatch: number;
  /** High-detail segments (~10m step) for close/city zoom (z >= 10.5) */
  fullSegments: Float32Array;
  fullSegmentCount: number;
  fullBatches: PackedHeatmapBatch[];
  /** Regional-detail segments (~150m step) for regional zoom (7.5 <= z < 10.5) */
  mediumZoomSegments: Float32Array;
  mediumZoomSegmentCount: number;
  mediumZoomBatches: PackedHeatmapBatch[];
  /** Country/continent-detail segments (~900m step) for low zoom (z < 7.5) */
  lowZoomSegments: Float32Array;
  lowZoomSegmentCount: number;
  lowZoomBatches: PackedHeatmapBatch[];
}

const MAX_MERCATOR_LAT = 85.05112877980659;

// Squared Mercator distance thresholds for LOD decimation (1 Mercator unit ≈ 40,075 km at equator)
const HIGH_DETAIL_MIN_MERCATOR_DIST_SQ = 6e-14; // ~10m
const MEDIUM_ZOOM_MIN_MERCATOR_DIST_SQ = 1.4e-11; // ~150m
const LOW_ZOOM_MIN_MERCATOR_DIST_SQ = 5e-10; // ~900m

/**
 * Mercator AABB padding (~60km at equator, ~35km at mid-latitudes) used during spatial
 * channel packing so two tracks within brush radius at low zoom never share the same MAX channel,
 * while geographically distant tracks safely share channels to minimize MRT batch count.
 */
const CHANNEL_PACKING_PADDING_MERCATOR = 0.0015;

interface TrackMercatorData {
  vx: number[];
  vy: number[];
  bbox: [number, number, number, number];
  paddedBbox: [number, number, number, number];
}

interface ChannelSlot {
  activeBboxes: [number, number, number, number][];
}

interface BatchAssignment {
  track: TrackMercatorData;
  batchIndex: number;
  channelIndex: number;
}

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

function bboxesOverlap(
  a: [number, number, number, number],
  b: [number, number, number, number]
): boolean {
  return a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];
}

function extractTrackMercator(track: GPXTrack): TrackMercatorData | null {
  const points = track.points;
  if (!points || points.length === 0) {
    return null;
  }

  const vx: number[] = [];
  const vy: number[] = [];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (!Number.isFinite(p.lat) || !Number.isFinite(p.lon)) {
      continue;
    }

    const [x, y] = lngLatToMercator(p.lon, p.lat);
    const count = vx.length;

    if (count > 0 && x === vx[count - 1] && y === vy[count - 1]) {
      continue;
    }

    vx.push(x);
    vy.push(y);
    if (x < minX) {
      minX = x;
    }
    if (y < minY) {
      minY = y;
    }
    if (x > maxX) {
      maxX = x;
    }
    if (y > maxY) {
      maxY = y;
    }
  }

  if (vx.length === 0) {
    return null;
  }

  return {
    vx,
    vy,
    bbox: [minX, minY, maxX, maxY],
    paddedBbox: [
      minX - CHANNEL_PACKING_PADDING_MERCATOR,
      minY - CHANNEL_PACKING_PADDING_MERCATOR,
      maxX + CHANNEL_PACKING_PADDING_MERCATOR,
      maxY + CHANNEL_PACKING_PADDING_MERCATOR,
    ],
  };
}

/**
 * Assigns tracks to `(batchIndex, channelIndex)` slots using sweep-line spatial AABB coloring.
 * Non-overlapping tracks (separated by at least `CHANNEL_PACKING_PADDING_MERCATOR`) safely share
 * the exact same `(batchIndex, channelIndex)`, dramatically reducing MRT batch count.
 */
function assignTracksToBatches(
  trackList: TrackMercatorData[],
  channelsPerBatch: number
): { assignments: BatchAssignment[]; batchCount: number } {
  if (trackList.length === 0) {
    return { assignments: [], batchCount: 0 };
  }

  const safeChannels = Math.max(1, Math.floor(channelsPerBatch));
  const sorted = [...trackList].sort((a, b) => a.paddedBbox[0] - b.paddedBbox[0]);
  const batches: ChannelSlot[][] = [];
  const assignments: BatchAssignment[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const track = sorted[i];
    const currentMinX = track.paddedBbox[0];
    let assignedBatch = -1;
    let assignedChannel = -1;

    for (let b = 0; b < batches.length && assignedBatch === -1; b++) {
      const slots = batches[b];
      for (let c = 0; c < slots.length; c++) {
        const active = slots[c].activeBboxes;
        // Sweep-line pruning: drop bboxes whose maxX is strictly left of currentMinX
        let writeIdx = 0;
        let hasCollision = false;
        for (let k = 0; k < active.length; k++) {
          const existing = active[k];
          if (existing[2] < currentMinX) {
            continue;
          }
          active[writeIdx++] = existing;
          if (!hasCollision && bboxesOverlap(existing, track.paddedBbox)) {
            hasCollision = true;
          }
        }
        active.length = writeIdx;

        if (!hasCollision) {
          active.push(track.paddedBbox);
          assignedBatch = b;
          assignedChannel = c;
          break;
        }
      }

      if (assignedBatch === -1 && slots.length < safeChannels) {
        assignedBatch = b;
        assignedChannel = slots.length;
        slots.push({ activeBboxes: [track.paddedBbox] });
      }
    }

    if (assignedBatch === -1) {
      assignedBatch = batches.length;
      assignedChannel = 0;
      batches.push([{ activeBboxes: [track.paddedBbox] }]);
    }

    assignments.push({
      track,
      batchIndex: assignedBatch,
      channelIndex: assignedChannel,
    });
  }

  return { assignments, batchCount: batches.length };
}

function pushPackedSegment(
  values: number[],
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  channelIndex: number
): void {
  const [x0Hi, x0Lo] = splitFloat64(x0);
  const [y0Hi, y0Lo] = splitFloat64(y0);
  const [x1Hi, x1Lo] = splitFloat64(x1);
  const [y1Hi, y1Lo] = splitFloat64(y1);
  values.push(x0Hi, y0Hi, x1Hi, y1Hi, x0Lo, y0Lo, x1Lo, y1Lo, channelIndex);
}

function packLodBatches(
  assignmentsByBatch: BatchAssignment[][],
  minDistSq: number
): { segments: Float32Array; segmentCount: number; batches: PackedHeatmapBatch[] } {
  const values: number[] = [];
  const batches: PackedHeatmapBatch[] = [];

  for (let b = 0; b < assignmentsByBatch.length; b++) {
    const batchItems = assignmentsByBatch[b];
    const segmentOffset = values.length / FLOATS_PER_PACKED_SEGMENT;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (let i = 0; i < batchItems.length; i++) {
      const { track, channelIndex } = batchItems[i];
      const { vx, vy, bbox } = track;

      if (bbox[0] < minX) {
        minX = bbox[0];
      }
      if (bbox[1] < minY) {
        minY = bbox[1];
      }
      if (bbox[2] > maxX) {
        maxX = bbox[2];
      }
      if (bbox[3] > maxY) {
        maxY = bbox[3];
      }

      // Preserve single-point or zero-length tracks as a visible round dot (#165)
      if (vx.length === 1) {
        pushPackedSegment(values, vx[0], vy[0], vx[0], vy[0], channelIndex);
        continue;
      }

      let prevX = vx[0];
      let prevY = vy[0];

      for (let p = 1; p < vx.length; p++) {
        const x = vx[p];
        const y = vy[p];
        const dx = x - prevX;
        const dy = y - prevY;
        const distSq = dx * dx + dy * dy;

        if (distSq === 0) {
          continue;
        }
        if (minDistSq > 0 && distSq < minDistSq && p < vx.length - 1) {
          continue;
        }

        pushPackedSegment(values, prevX, prevY, x, y, channelIndex);
        prevX = x;
        prevY = y;
      }
    }

    const segmentCount = values.length / FLOATS_PER_PACKED_SEGMENT - segmentOffset;
    if (segmentCount > 0) {
      batches.push({
        segmentOffset,
        segmentCount,
        bbox: [minX, minY, maxX, maxY],
      });
    }
  }

  return {
    segments: new Float32Array(values),
    segmentCount: values.length / FLOATS_PER_PACKED_SEGMENT,
    batches,
  };
}

/**
 * Packs GPX tracks into flat GPU-ready Double-Single Mercator segment buffers organized into
 * spatially packed MRT batches across 3 LOD tiers for per-track `gl.MAX` accumulation.
 */
export function packTracksForHeatmap(
  tracks: Map<string, GPXTrack>,
  channelsPerBatch: number = DEFAULT_CHANNELS_PER_BATCH
): PackedHeatmapGeometry {
  const safeChannels = Math.max(1, Math.floor(channelsPerBatch));
  const trackList: TrackMercatorData[] = [];

  tracks.forEach((track) => {
    const extracted = extractTrackMercator(track);
    if (extracted) {
      trackList.push(extracted);
    }
  });

  const { assignments, batchCount } = assignTracksToBatches(trackList, safeChannels);
  const assignmentsByBatch: BatchAssignment[][] = Array.from({ length: batchCount }, () => []);

  for (let i = 0; i < assignments.length; i++) {
    assignmentsByBatch[assignments[i].batchIndex].push(assignments[i]);
  }

  const full = packLodBatches(assignmentsByBatch, HIGH_DETAIL_MIN_MERCATOR_DIST_SQ);
  const medium = packLodBatches(assignmentsByBatch, MEDIUM_ZOOM_MIN_MERCATOR_DIST_SQ);
  const low = packLodBatches(assignmentsByBatch, LOW_ZOOM_MIN_MERCATOR_DIST_SQ);

  return {
    channelsPerBatch: safeChannels,
    fullSegments: full.segments,
    fullSegmentCount: full.segmentCount,
    fullBatches: full.batches,
    mediumZoomSegments: medium.segments,
    mediumZoomSegmentCount: medium.segmentCount,
    mediumZoomBatches: medium.batches,
    lowZoomSegments: low.segments,
    lowZoomSegmentCount: low.segmentCount,
    lowZoomBatches: low.batches,
  };
}
