import L from 'leaflet';
import { GPXTrack } from "@/lib/types/types";

/**
 * Attaches hover event handlers to a polyline
 * Changes color and weight on mouseover/mouseout
 */
export function attachActivityHoverEvents(polyline: L.Polyline): void {
    polyline.on('mouseover', function(this: L.Polyline) {
        this.setStyle({ color: '#4ADE80', weight: 4, opacity: 1 });
        this.bringToFront();
    });

    polyline.on('mouseout', function(this: L.Polyline) {
        this.setStyle({ color: '#FF6B6B', weight: 2, opacity: 0.6 });
    });
}

/**
 * Attaches click event handler to a polyline
 * Shows popup with track information
 */
export function attachActivityClickHandler(
    polyline: L.Polyline,
    map: any,
    trackId: string,
    track: GPXTrack
): void {
    // eslint-disable-next-line prefer-arrow-callback
    polyline.on('click', function(this: L.Polyline, e: L.LeafletMouseEvent) {
        const displayName = track.name || trackId || 'Unknown Activity';

        const sanitized = displayName
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

        L.popup()
            .setLatLng(e.latlng)
            .setContent(`
        <div style="font-family: sans-serif; min-width: 150px;">
          <b>${sanitized}</b><br>
          <small style="color: #666;">Placeholder</small>
        </div>
      `)
            .openOn(map);
    });
}
