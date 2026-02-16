import L from 'leaflet';
import { PerformanceConfig } from '@/lib/config/performanceConfig';
import { GPXTrack, Regions } from '@/lib/types';

/**
 * Utilities for viewport-based filtering of map data
 */

interface Bounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

/**
 * Converts Leaflet bounds to simple bounds object
 */
export function leafletBoundsToSimple(bounds: L.LatLngBounds): Bounds {
  return {
    north: bounds.getNorth(),
    south: bounds.getSouth(),
    east: bounds.getEast(),
    west: bounds.getWest(),
  };
}

/**
 * Adds padding to bounds for smoother panning experience
 */
export function padBounds(
  bounds: Bounds,
  padding: number = PerformanceConfig.RENDERING.VIEWPORT_PADDING
): Bounds {
  const latPadding = (bounds.north - bounds.south) * padding;
  const lonPadding = (bounds.east - bounds.west) * padding;

  return {
    north: bounds.north + latPadding,
    south: bounds.south - latPadding,
    east: bounds.east + lonPadding,
    west: bounds.west - lonPadding,
  };
}

/**
 * Checks if a point is within bounds
 */
export function isPointInBounds(lat: number, lon: number, bounds: Bounds): boolean {
  return lat >= bounds.south && lat <= bounds.north && lon >= bounds.west && lon <= bounds.east;
}

/**
 * Fast check if track has any points in viewport
 * Uses early exit for performance
 */
export function trackIntersectsViewport(track: GPXTrack, bounds: Bounds): boolean {
  // Check at least 1 point is visible
  for (const point of track.points) {
    if (isPointInBounds(point.lat, point.lon, bounds)) {
      return true;
    }
  }
  return false;
}

/**
 * Filters tracks to only those visible in viewport
 * Returns new Map to avoid mutations
 */
export function filterTracksByViewport(
  tracks: Map<string, GPXTrack>,
  leafletBounds: L.LatLngBounds,
  padding: number = PerformanceConfig.RENDERING.VIEWPORT_PADDING
): Map<string, GPXTrack> {
  const bounds = padBounds(leafletBoundsToSimple(leafletBounds), padding);
  const filtered = new Map<string, GPXTrack>();

  for (const [id, track] of tracks) {
    if (trackIntersectsViewport(track, bounds)) {
      filtered.set(id, track);
    }
  }

  return filtered;
}

/**
 * Filters tracks with hard limit for performance
 */
export function filterTracksWithLimit(
  tracks: Map<string, GPXTrack>,
  leafletBounds: L.LatLngBounds,
  maxTracks: number = PerformanceConfig.RENDERING.MAX_VISIBLE_TRACKS
): Map<string, GPXTrack> {
  const visibleTracks = filterTracksByViewport(tracks, leafletBounds);

  // If under limit, return all
  if (visibleTracks.size <= maxTracks) {
    return visibleTracks;
  }

  // Otherwise, take first N tracks
  const limited = new Map<string, GPXTrack>();
  let count = 0;

  for (const [id, track] of visibleTracks) {
    if (count >= maxTracks) {
      break;
    }
    limited.set(id, track);
    count++;
  }

  return limited;
}

/**
 * Calculates signature for bounds to detect changes
 */
export function getBoundsSignature(bounds: L.LatLngBounds, precision: number = 4): string {
  return `${bounds.getNorth().toFixed(precision)}|${bounds.getSouth().toFixed(precision)}|${bounds.getEast().toFixed(precision)}|${bounds.getWest().toFixed(precision)}`;
}

/**
 * Checks if two bounds are significantly different
 */
export function boundsChanged(
  bounds1: L.LatLngBounds,
  bounds2: L.LatLngBounds,
  threshold: number = 0.0001
): boolean {
  return (
    Math.abs(bounds1.getNorth() - bounds2.getNorth()) > threshold ||
    Math.abs(bounds1.getSouth() - bounds2.getSouth()) > threshold ||
    Math.abs(bounds1.getEast() - bounds2.getEast()) > threshold ||
    Math.abs(bounds1.getWest() - bounds2.getWest()) > threshold
  );
}
