import { MapSettings } from '@/components/ActivityMap/controls/LayersPanel/types';

export const MAP_SETTINGS_STORAGE_KEY_PREFIX = 'rr:map-settings';
export const MAP_SETTINGS_ANON_STORAGE_KEY = `${MAP_SETTINGS_STORAGE_KEY_PREFIX}:anon`;
export const MAP_SETTINGS_STORAGE_VERSION = 1;

interface PersistedMapSettingsV1 {
  version: number;
  savedAt: string;
  settings: MapSettings;
}

export function resolveMapSettingsStorageKey(userId?: string | null): string {
  if (!userId?.trim()) {
    return MAP_SETTINGS_ANON_STORAGE_KEY;
  }

  return `${MAP_SETTINGS_STORAGE_KEY_PREFIX}:user:${userId}`;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function loadMapSettingsFromStorage(userId?: string | null): Partial<MapSettings> | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(resolveMapSettingsStorageKey(userId));

    if (!raw) {
      return null;
    }

    const parsed: unknown = JSON.parse(raw);

    if (!isObject(parsed)) {
      return null;
    }

    if ('version' in parsed && 'settings' in parsed && parsed.version === MAP_SETTINGS_STORAGE_VERSION) {
      return isObject(parsed.settings) ? (parsed.settings as Partial<MapSettings>) : null;
    }

    // Backward-compatible fallback for raw settings payloads.
    return parsed as Partial<MapSettings>;
  } catch {
    return null;
  }
}

export function saveMapSettingsToStorage(settings: MapSettings, userId?: string | null): void {
  if (typeof window === 'undefined') {
    return;
  }

  const payload: PersistedMapSettingsV1 = {
    version: MAP_SETTINGS_STORAGE_VERSION,
    savedAt: new Date().toISOString(),
    settings,
  };

  try {
    window.localStorage.setItem(resolveMapSettingsStorageKey(userId), JSON.stringify(payload));
  } catch {
    // Ignore storage write failures (e.g. quota exceeded/private mode).
  }
}
