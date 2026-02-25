'use client';

import { useEffect, useState } from 'react';
import type L from 'leaflet';

export interface MapViewState {
  center: [number, number];
  zoom: number;
}

/**
 * Tracks the current center and zoom of a Leaflet map instance.
 * Updates on the `moveend` event, which fires only after the user
 * finishes panning or zooming — avoiding excessive tile requests.
 */
export function useMapViewState(map: L.Map | null): MapViewState | null {
  const [viewState, setViewState] = useState<MapViewState | null>(null);

  useEffect(() => {
    if (!map || typeof map.getCenter !== 'function') return;

    const update = () => {
      const c = map.getCenter();
      setViewState({
        center: [c.lat, c.lng],
        zoom: Math.round(map.getZoom()),
      });
    };

    update();
    map.on('moveend', update);

    return () => {
      map.off('moveend', update);
    };
  }, [map]);

  return viewState;
}
