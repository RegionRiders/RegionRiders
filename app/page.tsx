'use client';
import { useGPXData } from '@/hooks/useGPXData';
import { useLeafletMap } from '@/hooks/useLeafletMap';
import 'leaflet/dist/leaflet.css';
import dynamic from "next/dynamic";
import { useState } from 'react';

const MapContainer = dynamic(() => import("@/components/ActivityMap/MapContainer"), { ssr: false });

export default function MapPage() {
    const { map, isReady, error: mapError } = useLeafletMap('map-container');
    const { tracks, loading: tracksLoading, error: tracksError } = useGPXData();
    const [showHeatmap, setShowHeatmap] = useState(true);
    const [showBorders, setShowBorders] = useState(true);

    return (
        <div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column' }}>
            <header style={{ backgroundColor: '#000000', color: 'white', padding: '1rem', flexShrink: 0 }}>
                <p style={{ fontSize: '0.875rem', margin: '0.5rem 0 0 0' }}>
                    {!isReady && tracksLoading ? 'Loading activities...' :
                        isReady && !tracksLoading ? `Displaying ${tracks.size} activities` :
                            'Initializing map...'}
                </p>
                {isReady && (
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                        <label style={{ fontSize: '0.875rem', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={showHeatmap}
                                onChange={(e) => setShowHeatmap(e.target.checked)}
                                style={{ marginRight: '0.25rem' }}
                            />
                            Show Heatmap
                        </label>
                        <label style={{ fontSize: '0.875rem', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={showBorders}
                                onChange={(e) => setShowBorders(e.target.checked)}
                                style={{ marginRight: '0.25rem' }}
                            />
                            Show Borders
                        </label>
                    </div>
                )}
            </header>

            {mapError && (
                <div style={{ backgroundColor: '#fee', border: '1px solid #f88', color: '#c00', padding: '1rem' }}>
                    Map Error: {mapError}
                </div>
            )}
            {tracksError && (
                <div style={{ backgroundColor: '#ffc', border: '1px solid #cc0', color: '#660', padding: '1rem' }}>
                    Data Loading Warning: {tracksError}
                </div>
            )}

            <div style={{ flex: 1, position: 'relative' }}>
                <div id="map-container" style={{ width: '100%', height: '100%' }}></div>
                {isReady && <MapContainer map={map} tracks={tracks} showHeatmap={showHeatmap} showBorders={showBorders} />}
            </div>
        </div>
    );
}
