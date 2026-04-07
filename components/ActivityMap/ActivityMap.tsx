'use client';

/**
 * ActivityMap - Main map component for displaying GPX tracks and regions
 * Integrates Leaflet map with activity heatmap/lines rendering and region analysis
 */
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_MAP_SETTINGS } from '@/components/ActivityMap/config/mapConfig';
import { useLeafletMap } from '@/components/ActivityMap/hooks/map/useLeafletMap';
import {
  loadMapSettingsFromApi,
  saveMapSettingsToApi,
} from '@/components/ActivityMap/storage/mapSettingsApi';
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
const SAVE_ERROR_TOAST_DURATION_MS = 6000;
const ACTIVITY_MAP_DEBUG_FLAG = '__RR_ACTIVITY_MAP_DEBUG__';

/**
 * ActivityMap component renders an interactive map with GPX tracks and region overlays
 * Supports heatmap and line rendering modes for activities
 * @returns Map component with controls panel
 */
export default function ActivityMap() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveErrorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { tracks } = useGPXData();
  const [persistedUserId, setPersistedUserId] = useState<string | null>(null);
  const [settings, setSettings] = useState<MapSettings>(DEFAULT_MAP_SETTINGS);
  const [isSettingsHydrated, setIsSettingsHydrated] = useState(false);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const isDebugEnabled =
    typeof window !== 'undefined' &&
    (
      window as Window & {
        __RR_ACTIVITY_MAP_DEBUG__?: boolean;
      }
    )[ACTIVITY_MAP_DEBUG_FLAG] === true;
  const debugLog = (message: string, payload?: unknown) => {
    if (!isDebugEnabled) {
      return;
    }

    if (payload === undefined) {
      console.info(`[ActivityMap] ${message}`);
      return;
    }

    console.info(`[ActivityMap] ${message}`, payload);
  };

  const showSaveErrorToast = () => {
    debugLog('Showing save-failure toast');
    setSaveErrorMessage('Could not save settings to your account. Saved locally instead.');

    if (saveErrorTimeoutRef.current) {
      clearTimeout(saveErrorTimeoutRef.current);
    }

    saveErrorTimeoutRef.current = setTimeout(() => {
      setSaveErrorMessage(null);
    }, SAVE_ERROR_TOAST_DURATION_MS);
  };

  useEffect(() => {
    let isMounted = true;
    const hydrateSettings = async () => {
      const anonymousLocalSettings = loadMapSettingsFromStorage();
      debugLog('Hydration started', { anonymousLocalSettings });

      if (isMounted && anonymousLocalSettings) {
        setSettings({ ...DEFAULT_MAP_SETTINGS, ...anonymousLocalSettings });
      }

      const userSettingsFromApi = await loadMapSettingsFromApi();
      debugLog('Hydration API response', userSettingsFromApi);
      if (!isMounted) {
        return;
      }

      setPersistedUserId(userSettingsFromApi?.userId ?? null);

      if (!userSettingsFromApi?.userId) {
        setIsSettingsHydrated(true);
        debugLog('Hydration completed', {
          persistedUserId: null,
          usedApiSettings: false,
          usedUserScopedStorageSettings: false,
        });
        return;
      }

      const userScopedLocalSettings = loadMapSettingsFromStorage(userSettingsFromApi.userId);

      if (userSettingsFromApi.settings) {
        setSettings({ ...DEFAULT_MAP_SETTINGS, ...userSettingsFromApi.settings });
      } else if (userScopedLocalSettings) {
        setSettings({ ...DEFAULT_MAP_SETTINGS, ...userScopedLocalSettings });
      } else {
        setSettings(DEFAULT_MAP_SETTINGS);
      }

      setIsSettingsHydrated(true);
      debugLog('Hydration completed', {
        persistedUserId: userSettingsFromApi.userId,
        usedApiSettings: Boolean(userSettingsFromApi.settings),
        usedUserScopedStorageSettings: Boolean(
          !userSettingsFromApi.settings && userScopedLocalSettings
        ),
      });
    };

    void hydrateSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isSettingsHydrated) {
      return;
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    const persistSettings = async () => {
      if (persistedUserId) {
        debugLog('Attempting API save', { persistedUserId, settings });
        const persisted = await saveMapSettingsToApi(settings);
        debugLog('API save completed', { persisted });
        if (!persisted) {
          saveMapSettingsToStorage(settings, persistedUserId);
          debugLog('API save failed, wrote settings to local storage fallback');
          showSaveErrorToast();
        }
        return;
      }

      debugLog('Persisting anonymous settings to local storage');
      saveMapSettingsToStorage(settings);
    };

    saveTimeoutRef.current = setTimeout(() => {
      void persistSettings();
    }, 250);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [isSettingsHydrated, persistedUserId, settings]);

  useEffect(() => {
    return () => {
      if (saveErrorTimeoutRef.current) {
        clearTimeout(saveErrorTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!saveErrorMessage) {
      return;
    }

    debugLog('Toast rendered with message', { saveErrorMessage });
  }, [saveErrorMessage]);

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
      {saveErrorMessage && (
        <div
          role="alert"
          aria-live="assertive"
          aria-label="Settings save failed"
          className={styles.saveErrorToast}
        >
          <button
            type="button"
            aria-label="Dismiss settings save error"
            className={styles.saveErrorToastClose}
            onClick={() => {
              debugLog('Toast dismissed by user');
              setSaveErrorMessage(null);
            }}
          >
            ×
          </button>
          {saveErrorMessage}
        </div>
      )}
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
