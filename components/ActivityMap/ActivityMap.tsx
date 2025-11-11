'use client';

import { useRef, memo, useMemo } from 'react';
import { useGPXData } from '@/hooks/useGPXData';
import { useLeafletMap } from '@/hooks/useLeafletMap';
import MapContainer from './MapContainer';
import 'leaflet/dist/leaflet.css';

const MapContainerMemo = memo(MapContainer);

export default function ActivityMap() {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const { tracks } = useGPXData();

    const { map, isReady, error } = useLeafletMap(mapContainerRef, {
        center: [54.352375, 18.656686],
        zoom: 11,
    });

    const memoizedTracks = useMemo(() => tracks, [tracks]);

    if (error) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#111827' }}>
                <div style={{ color: '#ef4444' }}>
                    <p>Failed to load map</p>
                    <p style={{ fontSize: '0.875rem', color: '#9ca3af' }}>{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh'
        }}>
            <div
                ref={mapContainerRef}
                style={{ width: '100%', height: '100%' }}
            />

            {isReady && map && (
                <MapContainerMemo
                    map={map}
                    tracks={memoizedTracks}
                />
            )}
        </div>
    );
}
