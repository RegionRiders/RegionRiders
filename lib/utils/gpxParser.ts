import { GPXPoint, GPXTrack } from '@/lib/types';

/**
 * Generates a RFC 4122 compliant UUID v4
 * Uses Web Crypto API for browser compatibility
 */
function generateUUID(): string {
  // Browser environment - use Web Crypto API
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback for older browsers (rare, but safe)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * parses gpx (gps exchange format) files into track objects,
 * accepts both file objects and url paths, extracts coordinates and metadata
 *
 * @param file - either a File object or url path to gpx file
 * @returns parsed gpx track with points, name, and calculated distance
 * @throws {Error} if XML parsing fails or gpx format is invalid
 */
export async function parseGPXFile(file: File | string): Promise<GPXTrack> {
  let xmlString: string;

  if (typeof file === 'string') {
    const response = await fetch(file);
    xmlString = await response.text();
  } else {
    xmlString = await file.text();
  }

  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, 'application/xml');

  if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
    throw new Error('Invalid GPX file');
  }

  const tracks = xmlDoc.getElementsByTagName('trk');
  const nameElement = tracks[0]?.getElementsByTagName('name')[0];
  const trackName =
    nameElement?.textContent || (file instanceof File ? file.name : 'Unknown Track');

  const points: GPXPoint[] = [];
  const trackPoints = xmlDoc.getElementsByTagName('trkpt');

  for (let i = 0; i < trackPoints.length; i++) {
    const trackPoint = trackPoints[i];
    const latStr = trackPoint.getAttribute('lat');
    const lonStr = trackPoint.getAttribute('lon');

    if (!latStr || !lonStr) {
      continue;
    }

    const lat = parseFloat(latStr);
    const lon = parseFloat(lonStr);

    if (isNaN(lat) || isNaN(lon)) {
      continue;
    }

    const eleElement = trackPoint.getElementsByTagName('ele')[0];
    const ele = parseFloat(eleElement?.textContent || '0');

    const timeElement = trackPoint.getElementsByTagName('time')[0];
    const time = timeElement?.textContent;

    points.push({ lat, lon, ele, time });
  }

  const timeElement = xmlDoc.getElementsByTagName('time')[0];

  return {
    id: `track_${generateUUID()}`,
    name: trackName,
    points,
    metadata: {
      date: timeElement?.textContent,
      distance: calculateDistance(points),
    },
  };
}

/**
 * calculates total distance along a track using haversine formula
 */
function calculateDistance(points: GPXPoint[]): number {
  let distance = 0;

  for (let i = 0; i < points.length - 1; i++) {
    distance += haversineDistance(points[i], points[i + 1]);
  }

  return distance;
}

/**
 * calculates great-circle distance between two gps points
 */
function haversineDistance(p1: GPXPoint, p2: GPXPoint): number {
  const R = 6371; // earth radius in km

  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLon = ((p2.lon - p1.lon) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1.lat * Math.PI) / 180) *
      Math.cos((p2.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.asin(Math.sqrt(a));

  return R * c;
}
