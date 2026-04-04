'use client';

/**
 * ActivityMap - Main map component for displaying GPX tracks and regions
 * Integrates Leaflet map with activity heatmap/lines rendering and region analysis
 */
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { getPersistedMapSettingsUserId } from '@/components/ActivityMap/auth/getPersistedMapSettingsUserId';
import { DEFAULT_MAP_SETTINGS } from '@/components/ActivityMap/config/mapConfig';
import { useLeafletMap } from '@/components/ActivityMap/hooks/map/useLeafletMap';
import {
  loadMapSettingsFromStorage,
  saveMapSettingsToStorage,
} from '@/components/ActivityMap/storage/mapSettingsPersistence';
import { useGPXData } from '@/hooks/useGPXData';
import MapContainer from './MapContainer';
import MapOrchestrator from './MapOrchestrator';
import styles from './ActivityMap.module.css';

import 'leaflet/dist/leaflet.css';

import LayersPanel from '@/components/ActivityMap/controls/LayersPanel/LayersPanel';
import { MapSettings } from '@/components/ActivityMap/controls/LayersPanel/types';

const MapContainerMemo = memo(MapContainer);

/**
 * ActivityMap component renders an interactive map with GPX tracks and region overlays
 * Supports heatmap and line rendering modes for activities
 * @returns Map component with controls panel
 */
export default function ActivityMap() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { tracks } = useGPXData();
  const [persistedUserId] = useState<string | null>(() => getPersistedMapSettingsUserId());

  const [settings, setSettings] = useState<MapSettings>(() => {
    const persistedSettings = loadMapSettingsFromStorage(persistedUserId);

    if (persistedSettings) {
      return { ...DEFAULT_MAP_SETTINGS, ...persistedSettings };
    }

    return DEFAULT_MAP_SETTINGS;
  });

  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveMapSettingsToStorage(settings, persistedUserId);
    }, 250);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [persistedUserId, settings]);

  const updateSetting = <K extends keyof MapSettings>(key: K, value: MapSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const selectedMapTintColor = settings.mapTintSwatches?.[
    settings.selectedMapTintSwatchIndex ?? 0
  ] ?? [0, 0, 0, 0];

  const { map, isReady, error } = useLeafletMap(mapContainerRef, {
    tileLayerUrl: settings.tileLayerUrl,
    attribution: settings.attribution,
    overlayTileLayerUrl: settings.overlayTileLayerUrl,
    overlayAttribution: settings.overlayAttribution,
    mapSourceMonochrome: settings.mapSourceMonochrome,
    mapOverlayMonochrome: settings.mapOverlayMonochrome,
    mapTintColor: selectedMapTintColor,
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
          <LayersPanel settings={settings} onSettingChange={updateSetting} map={map} />
        </div>
      </div>

      <MapContainerMemo ref={mapContainerRef} />

      {isReady && map && <MapOrchestrator map={map} tracks={memoizedTracks} settings={settings} />}
    </div>
  );
}
