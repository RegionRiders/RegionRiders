'use client';

import { memo, useMemo, useRef, useState } from 'react';
import { useLeafletMap } from '@/components/ActivityMap/hooks/map/useLeafletMap';
import { useGPXData } from '@/hooks/useGPXData';
import MapContainer from './MapContainer';
import MapOrchestrator from './MapOrchestrator';
import styles from './ActivityMap.module.css';

import 'leaflet/dist/leaflet.css';

import LayersPanel from '@/components/ActivityMap/controls/LayersPanel/LayersPanel';
import { MapSettings } from '@/components/ActivityMap/controls/LayersPanel/types';

const MapContainerMemo = memo(MapContainer);

export default function ActivityMap() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const { tracks } = useGPXData();

  const [settings, setSettings] = useState<MapSettings>({
    activityMode: 'heatmap',
    showActivities: true,
    activityThickness: 3,
    lineColorSwatches: [
      {
        normal: [255, 0, 0, 0.5],
        hover: [255, 100, 100, 0.7],
      },
      {
        normal: [255, 255, 0, 0.5],
        hover: [255, 255, 100, 0.7],
      },
      {
        normal: [0, 255, 0, 0.5],
        hover: [100, 255, 100, 0.7],
      },
      {
        normal: [0, 255, 255, 0.5],
        hover: [100, 255, 255, 0.7],
      },
      {
        normal: [0, 0, 255, 0.5],
        hover: [100, 100, 255, 0.7],
      },
    ],
    selectedLineSwatchIndex: 0,
    heatmapDensity: 2,
    regionMode: 'heatmap',
    showRegions: true,
    regionBorderThickness: 2,
    regionStaticColorSwatches: [
      [
        { threshold: 0, color: [60, 60, 60, 0] },
        { threshold: 1, color: [76, 107, 34, 0.2] },
      ],
      [
        { threshold: 0, color: [160, 160, 160, 0] },
        { threshold: 1, color: [67, 69, 11, 0.2] },
      ],
      [
        { threshold: 0, color: [160, 160, 160, 0] },
        { threshold: 1, color: [67, 69, 11, 0.2] },
      ],
      [
        { threshold: 0, color: [160, 160, 160, 0] },
        { threshold: 1, color: [67, 69, 11, 0.2] },
      ],
      [
        { threshold: 0, color: [160, 160, 160, 0] },
        { threshold: 1, color: [67, 69, 11, 0.2] },
      ],
    ],
    selectedRegionStaticSwatchIndex: 0,
    tileLayerUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors',
  });

  const updateSetting = <K extends keyof MapSettings>(key: K, value: MapSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const { map, isReady, error } = useLeafletMap(mapContainerRef, {
    tileLayerUrl: settings.tileLayerUrl,
    attribution: settings.attribution,
  });

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
