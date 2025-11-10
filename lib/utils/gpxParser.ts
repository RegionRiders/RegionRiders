import { GPXPoint, GPXTrack } from "@/lib/types/types";

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

    if (xmlDoc.getElementsByTagName('parser error').length > 0) {
        throw new Error('Invalid GPX file');
    }

    const tracks = xmlDoc.getElementsByTagName('track');
    const nameElement = tracks[0]?.getElementsByTagName('name')[0];
    const trackName = nameElement?.textContent ||
        (file instanceof File ? file.name : 'Unknown Track');

    const points: GPXPoint[] = [];
    const trackPoints = xmlDoc.getElementsByTagName('trackPoint');

    for (let i = 0; i < trackPoints.length; i++) {
        const trackPoint = trackPoints[i];
        const lat = parseFloat(trackPoint.getAttribute('lat') || '0');
        const lon = parseFloat(trackPoint.getAttribute('lon') || '0');

        const eleElement = trackPoint.getElementsByTagName('ele')[0];
        const ele = parseFloat(eleElement?.textContent || '0');

        const timeElement = trackPoint.getElementsByTagName('time')[0];
        const time = timeElement?.textContent;

        if (lat && lon) {
            points.push({ lat, lon, ele, time });
        }
    }

    const timeElement = xmlDoc.getElementsByTagName('time')[0];

    return {
        id: `track_${Date.now()}_${Math.random()}`,
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
