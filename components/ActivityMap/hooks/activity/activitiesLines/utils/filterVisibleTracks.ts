import L from 'leaflet';
import { GPXPoint, GPXTrack } from '@/lib/types';

/**
 * Filters tracks to only include those visible in the current map bounds
 *
 * @param tracks - Map of all tracks
 * @param bounds - Current map bounds
 * @returns Array of [trackId, track] tuples for visible tracks
 */
export function filterVisibleTracks(
  tracks: Map<string, GPXTrack>,
  bounds: L.LatLngBounds
): Array<[string, GPXTrack]> {
  const tracksArray = Array.from(tracks.entries());

  return tracksArray.filter(([_, track]) => {
    if (!track.points || track.points.length === 0) {
      return false;
    }
    return track.points.some((p: GPXPoint) => bounds.contains([p.lat, p.lon]));
  });
}
