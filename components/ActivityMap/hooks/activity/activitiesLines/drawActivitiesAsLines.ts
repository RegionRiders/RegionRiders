'use client';

import L from 'leaflet';
import {
  attachActivityClickHandler,
  attachActivityHoverEvents,
} from '@/components/ActivityMap/hooks/activity/activitiesLines/utils/activityLineEvents';
import { filterVisibleTracks } from '@/components/ActivityMap/hooks/activity/activitiesLines/utils/filterVisibleTracks';
import { LinesRefs } from '@/components/ActivityMap/hooks/activity/activityTypes';
import { createComponentLogger } from '@/lib/logger/client';
import type { GPXPoint, GPXTrack } from '@/lib/types';
import { ensureMapPane } from '../utils/ensureMapPane';

const logger = createComponentLogger('drawActivitiesAsLines');

/**
 * Draws tracks as individual polylines on the map
 * @param map - Leaflet map instance
 * @param tracks - Map of GPX tracks to render
 * @param refs - Refs for aborting renders and debouncing
 * @returns cleanup function
 */
export function drawActivitiesAsLines(
  map: L.Map | null,
  tracks: Map<string, GPXTrack>,
  refs: LinesRefs
): () => void {
  let activityGroup: L.FeatureGroup | null = null;

  if (!map) {
    return () => {
      // No-op cleanup for null map
    };
  }

  // Ensure pane exists
  ensureMapPane(map, 'linesPane', '440');
  const canvasRenderer = L.canvas({ pane: 'linesPane' });

  const renderLines = () => {
    refs.renderAbortRef.current = false;

    if (refs.renderTimeoutRef.current) {
      clearTimeout(refs.renderTimeoutRef.current);
      refs.renderTimeoutRef.current = null;
    }

    if (refs.renderAbortRef.current || !map) {
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

      logger.info(`Rendering ${visibleTracks.length}/${tracksArray.length} visible tracks`);

      visibleTracks.forEach(([trackId, track]) => {
        const latlngs = track.points.map((p: GPXPoint) => [p.lat, p.lon] as [number, number]);

        const polyline = L.polyline(latlngs, {
          color: '#FF6B6B',
          weight: refs.lineThickness || 2,
          opacity: 0.6,
          renderer: canvasRenderer,
          interactive: true,
          smoothFactor: 1.5,
        });

        // Use utility functions for event handling
        attachActivityHoverEvents(polyline, refs.lineThickness);
        attachActivityClickHandler(polyline, map, trackId, track);

        activityGroup!.addLayer(polyline);
      });

      activityGroup.addTo(map);

      logger.info(`Drew ${visibleTracks.length} interactive lines`);
    } catch (error) {
      logger.error('Error rendering lines:', error, { timeout: 150 });
    }
  };

  // Debounce pan/zoom
  const handleMapChange = () => {
    // if you want a real debounce, you can use refs.renderTimeoutRef here
    renderLines();
  };

  if (map) {
    map.on('zoomend', handleMapChange);
    map.on('moveend', handleMapChange);
  }

  // Initial render
  renderLines();

  return () => {
    logger.info('Cleanup');

    refs.renderAbortRef.current = true;

    if (refs.renderTimeoutRef.current) {
      clearTimeout(refs.renderTimeoutRef.current);
      refs.renderTimeoutRef.current = null;
    }

    if (map) {
      map.off('zoomend', handleMapChange);
      map.off('moveend', handleMapChange);

      if (activityGroup && map.hasLayer(activityGroup)) {
        map.removeLayer(activityGroup);
      }
    }
  };
}
