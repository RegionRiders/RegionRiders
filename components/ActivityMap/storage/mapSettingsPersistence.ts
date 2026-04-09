import { MapSettings } from '@/components/ActivityMap/controls/LayersPanel/types';
import { mapSettingsSchema } from '@/lib/validation/schemas';

export const MAP_SETTINGS_STORAGE_KEY_PREFIX = 'rr:map-settings';
export const MAP_SETTINGS_ANON_STORAGE_KEY = `${MAP_SETTINGS_STORAGE_KEY_PREFIX}:anon`;
export const MAP_SETTINGS_STORAGE_VERSION = 1;

interface PersistedMapSettingsV1 {
  version: number;
  savedAt: string;
  settings: MapSettings;
}

export interface LoadedPersistedMapSettings {
  settings: Partial<MapSettings>;
  savedAt: string | null;
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

/**
 * Validates and normalizes a raw settings object using the Zod schema.
 * - Strips unknown keys
 * - Type-checks each optional field (invalid types are removed)
 * - If cross-field index refinements fail (e.g. index out of bounds), the
 *   offending index fields are stripped and the remaining data is returned.
 * This ensures a corrupted/stale localStorage payload can never overwrite
 * defaults with invalid values (e.g. `lineColorSwatches: null`).
 */
function validateAndNormalizeSettings(raw: unknown): Partial<MapSettings> | null {
  if (!isObject(raw)) {
    return null;
  }

  const schema = mapSettingsSchema;

  // First attempt: parse the whole object (strips unknown keys, type-checks fields).
  const first = schema.safeParse(raw);
  if (first.success) {
    return first.data as Partial<MapSettings>;
  }

  // If parsing failed, remove the fields that caused errors, then retry.
  // This handles cases like `lineColorSwatches: null` or out-of-bounds indices.
  const badPaths = new Set(
    first.error.issues.map((issue) => issue.path[0]).filter((p) => p != null)
  );
  const sanitized = Object.fromEntries(Object.entries(raw).filter(([key]) => !badPaths.has(key)));

  const second = schema.safeParse(sanitized);
  return second.success ? (second.data as Partial<MapSettings>) : null;
}

export function loadMapSettingsFromStorage(userId?: string | null): Partial<MapSettings> | null {
  return loadPersistedMapSettingsFromStorage(userId)?.settings ?? null;
}

export function loadPersistedMapSettingsFromStorage(
  userId?: string | null
): LoadedPersistedMapSettings | null {
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

    if ('version' in parsed && 'settings' in parsed) {
      if (typeof parsed.version !== 'number' || parsed.version !== MAP_SETTINGS_STORAGE_VERSION) {
        return null;
      }

      // Versioned payload: extract and validate the settings object.
      const settings = validateAndNormalizeSettings(parsed.settings);
      if (!settings || Object.keys(settings).length === 0) {
        return null;
      }

      const savedAt = typeof parsed.savedAt === 'string' ? parsed.savedAt : null;
      return {
        settings,
        savedAt,
      };
    }

    // Backward-compatible legacy payload support (unversioned settings object).
    const settings = validateAndNormalizeSettings(parsed);
    if (!settings || Object.keys(settings).length === 0) {
      return null;
    }

    return {
      settings,
      savedAt: null,
    };
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
