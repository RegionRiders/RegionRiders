'use client';

import { memo, useMemo, useRef, useState } from 'react';
import { useLeafletMap } from '@/components/ActivityMap/hooks/useLeafletMap';
import { useGPXData } from '@/hooks/useGPXData';
import MapContainer from './MapContainer';
import MapOrchestrator from './MapOrchestrator';
import styles from './ActivityMap.module.css';

import 'leaflet/dist/leaflet.css';

import LayersPanel from '@/components/ActivityMap/controls/LayersPanel/LayersPanel';
import {
  ActivityRenderMode,
  MapSettings,
  RegionRenderMode,
} from '@/components/ActivityMap/controls/LayersPanel/types';

const MapContainerMemo = memo(MapContainer);

export default function ActivityMap() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const { tracks } = useGPXData();
  const { map, isReady, error } = useLeafletMap(mapContainerRef);

  const [settings, setSettings] = useState<MapSettings>({
    activityMode: 'heatmap',
    showHeatmap: true,
    activityThickness: 3,
    heatmapDensity: 2,
    regionMode: 'heatmap',
    showBorders: true,
    regionBorderThickness: 2,
  });

  const updateSetting = <K extends keyof MapSettings>(key: K, value: MapSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const memoizedTracks = useMemo(() => tracks, [tracks]);

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
      <div className={styles.wrapper}>
        <div className={styles.controls}>
          <LayersPanel settings={settings} onSettingChange={updateSetting} />
        </div>
      </div>

      <MapContainerMemo ref={mapContainerRef} />

      {isReady && map && <MapOrchestrator map={map} tracks={memoizedTracks} settings={settings} />}
    </div>
  );
}
