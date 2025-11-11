'use client';

import { useRef, memo, useMemo, useState } from 'react';
import { useGPXData } from '@/hooks/useGPXData';
import { useLeafletMap } from '@/hooks/useLeafletMap';
import MapContainer from './MapContainer';
import type { ActivityRenderMode } from './drawActivities/drawActivities';
import 'leaflet/dist/leaflet.css';

const MapContainerMemo = memo(MapContainer);

export default function ActivityMap() {
    const mapContainerRef = useRef(null);
    const { tracks } = useGPXData();
    const { map, isReady, error } = useLeafletMap(mapContainerRef, {
        center: [54.352375, 18.656686],
        zoom: 11,
    });

    const [activityMode, setActivityMode] = useState<ActivityRenderMode>('heatmap');

    const memoizedTracks = useMemo(() => tracks, [tracks]);

    if (error) {
        return (
            <div>
                Failed to load map
                {error}
            </div>
        );
    }

    return (
        <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
            {/* Mode Selector */}
            <div
                style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    zIndex: 1000,
                    background: 'white',
                    padding: '10px',
                    borderRadius: '4px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                }}
            >
                <label style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input
                        type="radio"
                        value="heatmap"
                        checked={activityMode === 'heatmap'}
                        onChange={(e) => setActivityMode(e.target.value as ActivityRenderMode)}
                    />
                    Heatmap
                </label>
                <label style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <input
                        type="radio"
                        value="lines"
                        checked={activityMode === 'lines'}
                        onChange={(e) => setActivityMode(e.target.value as ActivityRenderMode)}
                    />
                    Lines
                </label>
            </div>

            {isReady && map && (
                <MapContainerMemo
                    map={map}
                    tracks={memoizedTracks}
                    activityMode={activityMode}
                />
            )}

            <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
        </div>
    );
}
