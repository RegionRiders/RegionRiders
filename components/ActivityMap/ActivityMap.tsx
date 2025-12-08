'use client';

import { memo, useMemo, useRef, useState } from 'react';
import { useLeafletMap } from '@/components/ActivityMap/hooks/useLeafletMap';
import { useGPXData } from '@/hooks/useGPXData';
import LayersPanel from './controls/LayersPanel/LayersPanel';
import type { ActivityRenderMode } from './drawActivities/drawActivities';
import MapContainer from './MapContainer';
import MapOrchestrator from './MapOrchestrator';
import styles from './ActivityMap.module.css';

import 'leaflet/dist/leaflet.css';

const MapContainerMemo = memo(MapContainer);

export default function ActivityMap() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  const { tracks } = useGPXData();
  const { map, isReady, error } = useLeafletMap(mapContainerRef);

  const [activityMode, setActivityMode] = useState<ActivityRenderMode>('heatmap');
  const [showHeatmap, setShowHeatmap] = useState<boolean>(true);
  const [showBorders, setShowBorders] = useState<boolean>(true);

  const memoizedTracks = useMemo(() => tracks, [tracks]);

  if (error) {
    return (
      <div className={styles.error}>
        Failed to load map
        <pre>{String(error)}</pre>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <div className={styles.controls}>
          <LayersPanel
            activityMode={activityMode}
            showHeatmap={showHeatmap}
            showBorders={showBorders}
            onActivityModeChange={setActivityMode}
            onShowHeatmapChange={setShowHeatmap}
            onShowBordersChange={setShowBorders}
          />
        </div>

        <MapContainerMemo ref={mapContainerRef} />

        {isReady && map && (
          <MapOrchestrator
            map={map}
            tracks={memoizedTracks}
            showHeatmap={showHeatmap}
            showBorders={showBorders}
            activityMode={activityMode}
          />
        )}
      </div>
    </div>
  );
}
