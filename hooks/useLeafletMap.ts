'use client';

import { useEffect, useRef, useState } from 'react';

export function useLeafletMap(containerId: string) {
  const mapRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const L = require('leaflet');

      const container = document.getElementById(containerId);
      if (!container) {
        setError(`Container with id '${containerId}' not found`);
        return;
      }

      mapRef.current = L.map(containerId).setView([55, 10], 4);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 19
      }).addTo(mapRef.current);


      setIsReady(true);
    } catch (err) {
      setError(`Failed to initialize map: ${err}`);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [containerId]);

  return { map: mapRef.current, isReady, error };
}
