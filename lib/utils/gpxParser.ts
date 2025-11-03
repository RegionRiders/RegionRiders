import { GPXTrack, GPXPoint } from '../types';

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

  const trackName =
    xmlDoc.querySelector('trk > name')?.textContent ||
    (file instanceof File ? file.name : 'Unknown Track');

  const points: GPXPoint[] = [];
  const trackPoints = xmlDoc.querySelectorAll('trkpt');

  trackPoints.forEach((trkpt) => {
    const lat = parseFloat(trkpt.getAttribute('lat') || '0');
    const lon = parseFloat(trkpt.getAttribute('lon') || '0');
    const ele = parseFloat(trkpt.querySelector('ele')?.textContent || '0');
    const time = trkpt.querySelector('time')?.textContent;

    if (lat && lon) {
      points.push({ lat, lon, ele, time });
    }
  });

  return {
    id: `track_${Date.now()}_${Math.random()}`,
    name: trackName,
    points,
    metadata: {
      date: xmlDoc.querySelector('time')?.textContent,
      distance: calculateDistance(points),
    },
  };
}

function calculateDistance(points: GPXPoint[]): number {
  let distance = 0;
  for (let i = 0; i < points.length - 1; i++) {
    distance += haversineDistance(points[i], points[i + 1]);
  }
  return distance;
}

function haversineDistance(p1: GPXPoint, p2: GPXPoint): number {
  const R = 6371;
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

export async function loadGPXFiles(dirPath: string): Promise<GPXTrack[]> {
  const response = await fetch(dirPath);
  const files = await response.json();

  const tracks = await Promise.all(
    files.map((file: string) => parseGPXFile(file))
  );

  return tracks;
}
