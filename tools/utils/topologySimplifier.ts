/**
 * Simple geometry simplification using Douglas-Peucker algorithm
 */

interface Point {
  lon: number;
  lat: number;
}

export class TopologySimplifier {
  private tolerance: number;

  constructor(tolerance: number = 0.001) {
    this.tolerance = tolerance;
  }

  simplifyFeatureCollection(features: GeoJSON.Feature[]): GeoJSON.Feature[] {
    return features.map((feature) => ({
      ...feature,
      geometry: this.simplifyGeometry(feature.geometry as GeoJSON.Geometry),
    }));
  }

  private simplifyGeometry(geometry: GeoJSON.Geometry): GeoJSON.Geometry {
    if (geometry.type === 'Polygon') {
      return {
        type: 'Polygon',
        coordinates: geometry.coordinates.map((ring) =>
          this.simplifyRing(ring.map(([lon, lat]) => ({ lon, lat }))).map((p) => [p.lon, p.lat])
        ),
      };
    } else if (geometry.type === 'MultiPolygon') {
      return {
        type: 'MultiPolygon',
        coordinates: geometry.coordinates.map((polygon) =>
          polygon.map((ring) =>
            this.simplifyRing(ring.map(([lon, lat]) => ({ lon, lat }))).map((p) => [p.lon, p.lat])
          )
        ),
      };
    }
    return geometry;
  }

  private simplifyRing(ring: Point[]): Point[] {
    if (ring.length <= 3) {
      return ring;
    }

    const simplified = this.douglasPeucker(ring, this.tolerance);

    // Ensure ring is closed
    if (
      simplified.length > 0 &&
      (simplified[0].lon !== simplified[simplified.length - 1].lon ||
        simplified[0].lat !== simplified[simplified.length - 1].lat)
    ) {
      simplified.push(simplified[0]);
    }

    return simplified;
  }

  /**
   * Douglas-Peucker line simplification algorithm
   */
  private douglasPeucker(points: Point[], tolerance: number): Point[] {
    if (points.length <= 2) {
      return points;
    }

    let maxDistance = 0;
    let maxIndex = 0;

    const first = points[0];
    const last = points[points.length - 1];

    for (let i = 1; i < points.length - 1; i++) {
      const distance = this.perpendicularDistance(points[i], first, last);
      if (distance > maxDistance) {
        maxDistance = distance;
        maxIndex = i;
      }
    }

    if (maxDistance > tolerance) {
      const left = this.douglasPeucker(points.slice(0, maxIndex + 1), tolerance);
      const right = this.douglasPeucker(points.slice(maxIndex), tolerance);
      return [...left.slice(0, -1), ...right];
    }
    return [first, last];
  }

  /**
   * Calculate perpendicular distance from point to line
   */
  private perpendicularDistance(point: Point, lineStart: Point, lineEnd: Point): number {
    const dx = lineEnd.lon - lineStart.lon;
    const dy = lineEnd.lat - lineStart.lat;

    if (dx === 0 && dy === 0) {
      return Math.sqrt((point.lon - lineStart.lon) ** 2 + (point.lat - lineStart.lat) ** 2);
    }

    const t = Math.max(
      0,
      Math.min(
        1,
        ((point.lon - lineStart.lon) * dx + (point.lat - lineStart.lat) * dy) / (dx * dx + dy * dy)
      )
    );

    const projectionX = lineStart.lon + t * dx;
    const projectionY = lineStart.lat + t * dy;

    return Math.sqrt((point.lon - projectionX) ** 2 + (point.lat - projectionY) ** 2);
  }
}
