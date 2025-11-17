'use client';

import L from 'leaflet';
import { logger } from '@/lib/logger/client';
import { GPXTrack } from '@/lib/types/types';
import { attachActivityClickHandler, attachActivityHoverEvents } from './utils/activityLineEvents';
import { ensureMapPane } from '../utils/ensureMapPane';
import { filterVisibleTracks } from './utils/filterVisibleTracks';

/**
 * draws tracks as individual polylines on the map
 *
 * @param map - leaflet map instance
 * @param tracks - map of gpx tracks to render
 * @param renderAbortRef - ref to abort flag for canceling renders
 * @param renderTimeoutRef - ref to timeout for debouncing
 * @returns cleanup function
 */
export function drawActivitiesAsLines(
  map: any,
  tracks: Map<string, GPXTrack>,
  renderAbortRef: any,
  renderTimeoutRef: any
) {
  let activityGroup: L.FeatureGroup | null = null;

  // Ensure pane exists
  ensureMapPane(map, 'linesPane', '440');

  const canvasRenderer = L.canvas({ pane: 'linesPane' });

  const renderLines = () => {
    renderAbortRef.current = false;

    if (renderTimeoutRef.current) {
      clearTimeout(renderTimeoutRef.current);
    }

    renderTimeoutRef.current = setTimeout(() => {
      if (renderAbortRef.current) {
        return;
      }

      try {
        // Clear existing group
        if (activityGroup && map.hasLayer(activityGroup)) {
          map.removeLayer(activityGroup);
        }

        activityGroup = L.featureGroup();
        const bounds = map.getBounds();
        const tracksArray = Array.from(tracks.entries());

        // Use utility to filter visible tracks
        const visibleTracks = filterVisibleTracks(tracks, bounds);

        logger.info(
          `[Lines] Rendering ${visibleTracks.length}/${tracksArray.length} visible tracks`
        );

        visibleTracks.forEach(([trackId, track]) => {
          const latlngs = track.points.map((p: any) => [p.lat, p.lon]);

          const polyline = L.polyline(latlngs, {
            color: '#FF6B6B',
            weight: 2,
            opacity: 0.6,
            renderer: canvasRenderer,
            interactive: true,
            smoothFactor: 1.5,
          });

          // Store track data
          (polyline as any).trackId = trackId;
          (polyline as any).trackData = track;

          // Use utility functions for event handling
          attachActivityHoverEvents(polyline);
          attachActivityClickHandler(polyline, map, trackId, track);

          if (activityGroup) {
            activityGroup.addLayer(polyline);
          }
        });

        if (activityGroup) {
          activityGroup.addTo(map);
        }

        logger.info(`[drawActivities] Drew ${visibleTracks.length} interactive lines`);
      } catch (error) {
        logger.error('[Lines] Error rendering lines:', error);
      }
    }, 150); // Debounce pan/zoom
  };

  renderLines();

  const handleMapChange = () => {
    renderLines();
  };

  if (map) {
    map.on('zoomend', handleMapChange);
    map.on('moveend', handleMapChange);
  }

  return () => {
    logger.info('[drawActivities Lines] Cleanup');
    renderAbortRef.current = true;

    if (renderTimeoutRef.current) {
      clearTimeout(renderTimeoutRef.current);
    }

    if (map) {
      map.off('zoomend', handleMapChange);
      map.off('moveend', handleMapChange);
    }

    if (activityGroup && map.hasLayer(activityGroup)) {
      map.removeLayer(activityGroup);
    }
  };
}
