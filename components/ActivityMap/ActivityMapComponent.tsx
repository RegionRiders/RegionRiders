'use client';

import { useEffect, useRef, memo, useMemo } from 'react';
import { useGPXData } from '@/hooks/useGPXData';
import MapContainer from './MapContainer';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const MapContainerMemo = memo(MapContainer);

export default function ActivityMapComponent() {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<L.Map | null>(null);
    const { tracks } = useGPXData();
    const initializedRef = useRef(false);

    useEffect(() => {
        if (initializedRef.current || !mapContainerRef.current) {
            return;
        }

        initializedRef.current = true;
        console.log('🗺️ [ActivityMapComponent] Initializing map...');

        try {
            mapRef.current = L.map(mapContainerRef.current, {
                center: [54.352375, 18.656686],
                zoom: 11,
            });

            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
                attribution:
                    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
                maxZoom: 19,
            }).addTo(mapRef.current);

            console.log('✅ [ActivityMapComponent] Map initialized');
        } catch (error) {
            console.error('❌ [ActivityMapComponent] Error:', error);
            initializedRef.current = false;
        }
    }, []);

    const memoizedTracks = useMemo(() => tracks, [tracks]);

    return (
        <div style={{ display: 'flex', height: '100%', width: '100%' }}>
            <div
                ref={mapContainerRef}
                style={{
                    flex: 1,
                    height: '100%',
                    width: '100%',
                    backgroundColor: '#1a1a1a',
                }}
            />
            {mapRef.current && (
                <MapContainerMemo
                    map={mapRef.current}
                    tracks={memoizedTracks}
                    showHeatmap={true}
                    showBorders={true}
                />
            )}
        </div>
    );
}
