import { GPXPoint, IntersectionPoint, HeatmapSegment } from '../types';

interface LineSegment {
  p1: GPXPoint;
  p2: GPXPoint;
  trackId: string;
}

export function detectIntersections(
  tracks: Map<string, { points: GPXPoint[] }>
): IntersectionPoint[] {
  const segments: LineSegment[] = [];
  const intersectionMap = new Map<string, IntersectionPoint>();

  tracks.forEach((track, trackId) => {
    for (let i = 0; i < track.points.length - 1; i++) {
      segments.push({
        p1: track.points[i],
        p2: track.points[i + 1],
        trackId,
      });
    }
  });

  const cellSize = 0.01;
  const grid = new Map<string, LineSegment[]>();

  segments.forEach((seg) => {
    const cell = getGridCell(seg.p1, cellSize);
    if (!grid.has(cell)) grid.set(cell, []);
    grid.get(cell)!.push(seg);
  });

  grid.forEach((cellSegments, cellKey) => {
    const neighbors = getNeighboringCells(cellKey, cellSize);

    cellSegments.forEach((seg1) => {
      neighbors.forEach((neighborKey) => {
        const neighborSegs = grid.get(neighborKey) || [];

        neighborSegs.forEach((seg2) => {
          if (seg1.trackId !== seg2.trackId) {
            const intersection = getSegmentProximity(seg1, seg2);
            if (intersection) {
              const key = `${intersection.lat.toFixed(4)}_${intersection.lon.toFixed(4)}`;

              if (!intersectionMap.has(key)) {
                intersectionMap.set(key, {
                  lat: intersection.lat,
                  lon: intersection.lon,
                  trackIds: [],
                  intensity: 0,
                });
              }

              const point = intersectionMap.get(key)!;
              if (!point.trackIds.includes(seg1.trackId)) {
                point.trackIds.push(seg1.trackId);
              }
              if (!point.trackIds.includes(seg2.trackId)) {
                point.trackIds.push(seg2.trackId);
              }
              point.intensity = Math.min(1, point.trackIds.length / tracks.size);
            }
          }
        });
      });
    });
  });

  return Array.from(intersectionMap.values());
}

function getGridCell(point: GPXPoint, cellSize: number): string {
  const x = Math.floor(point.lon / cellSize);
  const y = Math.floor(point.lat / cellSize);
  return `${x}_${y}`;
}

function getNeighboringCells(cell: string, cellSize: number): string[] {
  const [x, y] = cell.split('_').map(Number);
  const neighbors = [];

  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      neighbors.push(`${x + dx}_${y + dy}`);
    }
  }

  return neighbors;
}

function getSegmentProximity(
  seg1: LineSegment,
  seg2: LineSegment,
  threshold: number = 0.001
): GPXPoint | null {
  const closest1 = closestPointOnSegment(seg1.p1, seg1.p2, seg2.p1);
  const closest2 = closestPointOnSegment(seg1.p1, seg1.p2, seg2.p2);
  const closest3 = closestPointOnSegment(seg2.p1, seg2.p2, seg1.p1);
  const closest4 = closestPointOnSegment(seg2.p1, seg2.p2, seg1.p2);

  const distances = [
    { point: closest1, dist: distance(closest1, seg2.p1) },
    { point: closest2, dist: distance(closest2, seg2.p2) },
    { point: closest3, dist: distance(closest3, seg1.p1) },
    { point: closest4, dist: distance(closest4, seg1.p2) },
  ];

  const closest = distances.reduce((min, curr) =>
    curr.dist < min.dist ? curr : min
  );

  return closest.dist < threshold ? closest.point : null;
}

function closestPointOnSegment(
  p1: GPXPoint,
  p2: GPXPoint,
  p: GPXPoint
): GPXPoint {
  const A = p.lon - p1.lon;
  const B = p.lat - p1.lat;
  const C = p2.lon - p1.lon;
  const D = p2.lat - p1.lat;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;

  if (lenSq !== 0) param = dot / lenSq;

  let xx, yy;

  if (param < 0) {
    xx = p1.lon;
    yy = p1.lat;
  } else if (param > 1) {
    xx = p2.lon;
    yy = p2.lat;
  } else {
    xx = p1.lon + param * C;
    yy = p1.lat + param * D;
  }

  return { lat: yy, lon: xx };
}

function distance(p1: GPXPoint, p2: GPXPoint): number {
  const dx = p1.lon - p2.lon;
  const dy = p1.lat - p2.lat;
  return Math.sqrt(dx * dx + dy * dy);
}

export function createHeatmapSegments(
  track: GPXPoint[],
  trackId: string,
  intersections: IntersectionPoint[]
): HeatmapSegment[] {
  const segments: HeatmapSegment[] = [];

  for (let i = 0; i < track.length - 1; i++) {
    const start = track[i];
    const end = track[i + 1];

    const segmentIntersections = intersections.filter((inter) =>
      pointInSegment(inter, start, end) && inter.trackIds.includes(trackId)
    );

    const intensity =
      segmentIntersections.length > 0
        ? Math.max(...segmentIntersections.map((i) => i.intensity))
        : 0;

    segments.push({ start, end, intensity, trackId });
  }

  return segments;
}

function pointInSegment(p: GPXPoint, p1: GPXPoint, p2: GPXPoint): boolean {
  const threshold = 0.001;
  const closest = closestPointOnSegment(p1, p2, p);
  return distance(p, closest) < threshold;
}
