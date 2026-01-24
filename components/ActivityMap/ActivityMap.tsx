'use client';

import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { useLeafletMap } from '@/components/ActivityMap/hooks/useLeafletMap';
import { useGPXData } from '@/hooks/useGPXData';
import type { ActivityRenderMode } from './drawActivities/drawActivities';
import MapContainer from './MapContainer';
import MapOrchestrator from './MapOrchestrator';
import styles from './ActivityMap.module.css';

import 'leaflet/dist/leaflet.css';

const MapContainerMemo = memo(MapContainer);

export default function ActivityMap() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const { tracks } = useGPXData();
  const { map, isReady, error } = useLeafletMap(mapContainerRef);

  const [activityMode, setActivityMode] = useState<ActivityRenderMode>('heatmap');
  const memoizedTracks = useMemo(() => tracks, [tracks]);

  const handleModeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setActivityMode(e.target.value as ActivityRenderMode);
  }, []);

  if (error) {
    return (
      <div className={styles.error}>
        <h3 className={styles.errorTitle}>Failed to load map</h3>
        <p className={styles.errorMessage}>{error}</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Mode Selector */}
      <div className={styles.modeSelector}>
        <div className={styles.radioGroup}>
          <div className={styles.radioOption}>
            <input
              type="radio"
              id="heatmap"
              value="heatmap"
              checked={activityMode === 'heatmap'}
              onChange={handleModeChange}
            />
            <label htmlFor="heatmap">Heatmap</label>
          </div>
          <div className={styles.radioOption}>
            <input
              type="radio"
              id="lines"
              value="lines"
              checked={activityMode === 'lines'}
              onChange={handleModeChange}
            />
            <label htmlFor="lines">Lines</label>
          </div>
        </div>
      </div>

      <MapContainerMemo ref={mapContainerRef} />

      {isReady && map ? (
        <MapOrchestrator map={map} tracks={memoizedTracks} activityMode={activityMode} />
      ) : null}
    </div>
  );
}
