'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * initializes leaflet map on specified dom container
 * handles map creation and cleanup on unmount
 *
 * @param containerId - html element id for map container
 * @returns map instance, ready state, and error if initialization failed
 */
export function useLeafletMap(containerId: string) {
    const mapRef = useRef<any>(null);
    const [isReady, setIsReady] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // only run in browser
        if (typeof window === 'undefined') {return;}

        const initMap = async () => {
            try {
                const L = (await import('leaflet')).default;

                const container = document.getElementById(containerId);
                if (!container) {
                    setError(`Container with id '${containerId}' not found`);
                    return;
                }

                mapRef.current = L.map(containerId).setView([55, 10], 4);

                L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap contributors © CARTO',
                    maxZoom: 19
                }).addTo(mapRef.current);

                setIsReady(true);
            } catch (err) {
                setError(`Failed to initialize map: ${err}`);
            }
        };

        void initMap();

        // cleanup: remove map on unmount
        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, [containerId]);

    return { map: mapRef.current, isReady, error };
}
