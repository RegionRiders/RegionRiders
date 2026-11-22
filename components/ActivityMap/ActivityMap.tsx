'use client';

/**
 * ActivityMap - Main map component for displaying GPX tracks and regions
 * Integrates Leaflet map with activity heatmap/lines rendering and region analysis
 */
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_MAP_SETTINGS } from '@/components/ActivityMap/config/mapConfig';
import { useLeafletMap } from '@/components/ActivityMap/hooks/map/useLeafletMap';
import {
  isUnauthenticatedMapSettingsResult,
  loadAuthenticatedUserIdFromApi,
  loadMapSettingsFromApi,
  saveMapSettingsToApi,
} from '@/components/ActivityMap/storage/mapSettingsApi';
import {
  loadMapSettingsFromStorage,
  loadPersistedMapSettingsFromStorage,
  resolveMapSettingsStorageKey,
  saveMapSettingsToStorage,
} from '@/components/ActivityMap/storage/mapSettingsPersistence';
import { useGPXData } from '@/hooks/useGPXData';
import { createComponentLogger } from '@/lib/logger/client';
import MapContainer from './MapContainer';
import MapOrchestrator from './MapOrchestrator';
import styles from './ActivityMap.module.css';

import 'leaflet/dist/leaflet.css';

import LayersPanel from '@/components/ActivityMap/controls/LayersPanel/LayersPanel';
import { MapSettings } from '@/components/ActivityMap/controls/LayersPanel/types';

const MapContainerMemo = memo(MapContainer);
const SAVE_ERROR_TOAST_DURATION_MS = 6000;
export const SETTINGS_PERSIST_DEBOUNCE_MS = 250;
const ACTIVITY_MAP_DEBUG_FLAG = '__RR_ACTIVITY_MAP_DEBUG__';
const logger = createComponentLogger('ActivityMap');

function parseTimestamp(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function hasSettingsValues(settings: Partial<MapSettings> | null | undefined): boolean {
  return Boolean(settings && Object.keys(settings).length > 0);
}

/**
 * ActivityMap component renders an interactive map with GPX tracks and region overlays
 * Supports heatmap and line rendering modes for activities
 * @returns Map component with controls panel
 */
export default function ActivityMap() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveErrorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasHandledInitialPersistRef = useRef(false);
  const hasUserInteractedWithSettingsRef = useRef(false);
  const hydrationUsedUserScopedLocalSettingsRef = useRef(false);
  const { tracks } = useGPXData();
  const [persistedUserId, setPersistedUserId] = useState<string | null>(null);
  const [apiPersistUserId, setApiPersistUserId] = useState<string | null>(null);
  const [settings, setSettings] = useState<MapSettings>(DEFAULT_MAP_SETTINGS);
  const [isSettingsHydrated, setIsSettingsHydrated] = useState(false);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const [regionTileError, setRegionTileError] = useState<string | null>(null);
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
      logger.info(message);
      return;
    }

    logger.info(message, payload);
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

  const clearUserScopedLocalSettings = (userId: string) => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const storageKey = resolveMapSettingsStorageKey(userId);
      window.localStorage.removeItem(storageKey);
      debugLog('Cleared user-scoped local fallback settings', { userId });
    } catch {
      // Ignore storage errors
    }
  };

  const handleRegionTileError = useCallback((message: string) => {
    const nextMessage = message || null;
    setRegionTileError((currentMessage) =>
      currentMessage === nextMessage ? currentMessage : nextMessage
    );
  }, []);

  useEffect(() => {
    let isMounted = true;
    const hydrateSettings = async () => {
      const anonymousLocalSettings = loadMapSettingsFromStorage();
      debugLog('Hydration started', { anonymousLocalSettings });

      if (isMounted && anonymousLocalSettings && !hasUserInteractedWithSettingsRef.current) {
        setSettings({ ...DEFAULT_MAP_SETTINGS, ...anonymousLocalSettings });
      }

      const userSettingsFromApi = await loadMapSettingsFromApi();
      const isSettingsApiUnauthenticated = isUnauthenticatedMapSettingsResult(userSettingsFromApi);
      const resolvedUserSettingsFromApi = isSettingsApiUnauthenticated ? null : userSettingsFromApi;
      let authenticatedUserId: string | null = null;
      if (!isSettingsApiUnauthenticated && !resolvedUserSettingsFromApi?.userId) {
        authenticatedUserId = await loadAuthenticatedUserIdFromApi();
      }
      debugLog('Hydration settings API response', userSettingsFromApi);
      debugLog('Hydration auth session response', { authenticatedUserId });
      if (!isMounted) {
        return;
      }

      const persistedUserId = resolvedUserSettingsFromApi?.userId ?? authenticatedUserId ?? null;
      setPersistedUserId(persistedUserId);
      setApiPersistUserId(resolvedUserSettingsFromApi?.userId ?? null);

      if (!persistedUserId) {
        hydrationUsedUserScopedLocalSettingsRef.current = false;
        setIsSettingsHydrated(true);
        debugLog('Hydration completed', {
          persistedUserId: null,
          usedApiSettings: false,
          usedUserScopedStorageSettings: false,
        });
        return;
      }

      const userScopedLocalSettings = loadPersistedMapSettingsFromStorage(persistedUserId);
      const apiTimestamp = parseTimestamp(resolvedUserSettingsFromApi?.updatedAt ?? null);
      const localTimestamp = parseTimestamp(userScopedLocalSettings?.savedAt ?? null);
      const hasUserScopedLocalSettings = hasSettingsValues(userScopedLocalSettings?.settings);
      const hasApiSettings = hasSettingsValues(resolvedUserSettingsFromApi?.settings);
      const isLocalSettingsNewerThanApi =
        localTimestamp != null && apiTimestamp != null && localTimestamp > apiTimestamp;
      const shouldPreferUserScopedLocalSettings =
        hasUserScopedLocalSettings &&
        (!hasApiSettings || apiTimestamp === null || isLocalSettingsNewerThanApi);
      const usedUserScopedStorageSettings = shouldPreferUserScopedLocalSettings;
      const usedApiSettings = hasApiSettings && !shouldPreferUserScopedLocalSettings;
      const hydrationUsedUserScopedLocalSettings =
        shouldPreferUserScopedLocalSettings && Boolean(userScopedLocalSettings);
      hydrationUsedUserScopedLocalSettingsRef.current = hydrationUsedUserScopedLocalSettings;
      const shouldApplyHydrationSettings = !hasUserInteractedWithSettingsRef.current;

      if (shouldPreferUserScopedLocalSettings && shouldApplyHydrationSettings) {
        setSettings({ ...DEFAULT_MAP_SETTINGS, ...(userScopedLocalSettings?.settings ?? {}) });
      } else if (usedApiSettings && shouldApplyHydrationSettings) {
        setSettings({
          ...DEFAULT_MAP_SETTINGS,
          ...(resolvedUserSettingsFromApi?.settings ?? {}),
        });
        // Clear stale local fallback when API settings exist and are preferred
        if (hasUserScopedLocalSettings) {
          clearUserScopedLocalSettings(persistedUserId);
        }
      } else if (shouldApplyHydrationSettings) {
        setSettings(DEFAULT_MAP_SETTINGS);
      }

      setIsSettingsHydrated(true);
      debugLog('Hydration completed', {
        persistedUserId,
        usedApiSettings,
        usedUserScopedStorageSettings,
        shouldPreferUserScopedLocalSettings,
        apiTimestamp,
        localTimestamp,
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

    if (!hasHandledInitialPersistRef.current) {
      hasHandledInitialPersistRef.current = true;
      const shouldAllowHydrationTriggeredPersist =
        hydrationUsedUserScopedLocalSettingsRef.current && Boolean(apiPersistUserId);
      if (!shouldAllowHydrationTriggeredPersist && !hasUserInteractedWithSettingsRef.current) {
        debugLog('Skipping initial persist after hydration', {
          persistedUserId,
          apiPersistUserId,
          hydrationUsedUserScopedLocalSettings: hydrationUsedUserScopedLocalSettingsRef.current,
          shouldAllowHydrationTriggeredPersist,
          hasUserInteractedWithSettings: hasUserInteractedWithSettingsRef.current,
        });
        return;
      }
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    const persistSettings = async () => {
      if (apiPersistUserId) {
        debugLog('Attempting API save', { persistedUserId: apiPersistUserId, settings });
        const persisted = await saveMapSettingsToApi(settings);
        debugLog('API save completed', { persisted });
        if (!persisted) {
          saveMapSettingsToStorage(settings, apiPersistUserId);
          debugLog('API save failed, wrote settings to local storage fallback');
          showSaveErrorToast();
        } else {
          // Clear local fallback after successful API save to prevent stale data preference
          clearUserScopedLocalSettings(apiPersistUserId);
        }
        return;
      }

      if (persistedUserId) {
        debugLog('Persisting authenticated fallback settings to local storage', {
          persistedUserId,
        });
        saveMapSettingsToStorage(settings, persistedUserId);
        return;
      }

      debugLog('Persisting anonymous settings to local storage');
      saveMapSettingsToStorage(settings);
    };

    saveTimeoutRef.current = setTimeout(() => {
      void persistSettings();
    }, SETTINGS_PERSIST_DEBOUNCE_MS);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
    // `apiPersistUserId` gates API PUT eligibility, while `persistedUserId`
    // is still needed for user-scoped local fallback persistence.
  }, [apiPersistUserId, isSettingsHydrated, persistedUserId, settings]);

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
    hasUserInteractedWithSettingsRef.current = true;
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

      {regionTileError ? (
        <div role="status" aria-live="polite" aria-atomic="true" className={styles.errorMessage}>
          {regionTileError}
        </div>
      ) : null}

      {isReady && map && (
        <MapOrchestrator
          map={map}
          tracks={memoizedTracks}
          settings={settings}
          onRegionTileError={handleRegionTileError}
        />
      )}
    </div>
  );
}
