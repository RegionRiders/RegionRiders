import { GPXTrack } from '@/lib/types';

export interface PackedHeatmapGeometry {
  /** Flat [x0, y0, x1, y1, ...] segments in MapLibre Mercator [0..1] space */
  fullSegments: Float32Array;
  fullSegmentCount: number;
  /** Decimated segments for low-zoom overviews (z < 8) */
  lowZoomSegments: Float32Array;
  lowZoomSegmentCount: number;
}

const MAX_MERCATOR_LAT = 85.05112877980659;
const LOW_ZOOM_MIN_MERCATOR_DIST_SQ = 1e-10; // ~1e-5 Mercator units (~400m at equator)

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

function packTrackSegments(tracks: Map<string, GPXTrack>, minDistSq: number): Float32Array {
  const values: number[] = [];

  tracks.forEach((track) => {
    const points = track.points;
    if (!points || points.length === 0) {
      return;
    }

    let prevX = NaN;
    let prevY = NaN;
    let emittedForTrack = false;
    let lastValidX = NaN;
    let lastValidY = NaN;

    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (!Number.isFinite(p.lat) || !Number.isFinite(p.lon)) {
        continue;
      }

      const [x, y] = lngLatToMercator(p.lon, p.lat);
      lastValidX = x;
      lastValidY = y;

      if (Number.isNaN(prevX)) {
        prevX = x;
        prevY = y;
        continue;
      }

      const dx = x - prevX;
      const dy = y - prevY;
      const distSq = dx * dx + dy * dy;

      if (minDistSq > 0 && distSq < minDistSq && i < points.length - 1) {
        continue;
      }

      values.push(prevX, prevY, x, y);
      emittedForTrack = true;
      prevX = x;
      prevY = y;
    }

    // Preserve single-point or zero-length tracks as a visible capsule dot (#165)
    if (!emittedForTrack && !Number.isNaN(lastValidX) && !Number.isNaN(lastValidY)) {
      values.push(lastValidX, lastValidY, lastValidX, lastValidY);
    }
  });

  return new Float32Array(values);
}

/**
 * Packs GPX tracks into flat GPU-ready Mercator segment buffers (full detail + low-zoom LOD).
 */
export function packTracksForHeatmap(tracks: Map<string, GPXTrack>): PackedHeatmapGeometry {
  const fullSegments = packTrackSegments(tracks, 0);
  const lowZoomSegments = packTrackSegments(tracks, LOW_ZOOM_MIN_MERCATOR_DIST_SQ);

  return {
    fullSegments,
    fullSegmentCount: fullSegments.length / 4,
    lowZoomSegments,
    lowZoomSegmentCount: lowZoomSegments.length / 4,
  };
}
