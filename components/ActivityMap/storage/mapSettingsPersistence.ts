import { MapSettings } from '@/components/ActivityMap/controls/LayersPanel/types';
import { DEFAULT_MAP_SETTINGS } from '@/components/ActivityMap/config/mapConfig';
import { ColorThreshold, RGBA } from '@/components/ActivityMap/mapTypes';

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

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isInteger(value: unknown): value is number {
  return Number.isInteger(value);
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function parseEnum<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  return isString(value) && allowed.includes(value as T) ? (value as T) : undefined;
}

function parseRgba(value: unknown): RGBA | undefined {
  if (!Array.isArray(value) || value.length !== 4 || !value.every(isFiniteNumber)) {
    return undefined;
  }

  return value as RGBA;
}

function parseColorThreshold(value: unknown): ColorThreshold | undefined {
  if (!isObject(value) || !isFiniteNumber(value.threshold)) {
    return undefined;
  }

  const color = parseRgba(value.color);
  if (!color) {
    return undefined;
  }

  return { threshold: value.threshold, color };
}

function parseArray<T>(value: unknown, parser: (entry: unknown) => T | undefined): T[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const parsed: T[] = [];
  for (const entry of value) {
    const parsedEntry = parser(entry);
    if (parsedEntry === undefined) {
      return undefined;
    }
    parsed.push(parsedEntry);
  }

  return parsed;
}

function parseLineColorSwatch(value: unknown): MapSettings['lineColorSwatches'][number] | undefined {
  if (!isObject(value)) {
    return undefined;
  }

  const normal = parseRgba(value.normal);
  const hover = parseRgba(value.hover);

  if (!normal || !hover) {
    return undefined;
  }

  return { normal, hover };
}

function parseColorThresholdSwatches(value: unknown): ColorThreshold[][] | undefined {
  return parseArray(value, (swatch) => parseArray(swatch, parseColorThreshold));
}

type MapSettingValidator<K extends keyof MapSettings> = (value: unknown) => MapSettings[K] | undefined;

const MAP_SETTINGS_VALIDATORS: { [K in keyof MapSettings]: MapSettingValidator<K> } = {
  activityMode: (value) => parseEnum(value, ['heatmap', 'lines']),
  showActivities: (value) => (isBoolean(value) ? value : undefined),
  activityThickness: (value) => (isFiniteNumber(value) ? value : undefined),
  activityLayerTransparency: (value) => (isFiniteNumber(value) ? value : undefined),
  heatmapDensity: (value) => (isFiniteNumber(value) ? value : undefined),
  lineColorSwatches: (value) => parseArray(value, parseLineColorSwatch),
  selectedLineSwatchIndex: (value) => (isInteger(value) ? value : undefined),
  activityHeatmapColorSwatches: (value) => parseColorThresholdSwatches(value),
  selectedActivityHeatmapSwatchIndex: (value) => (isInteger(value) ? value : undefined),
  regionMode: (value) => parseEnum(value, ['heatmap', 'static']),
  showRegions: (value) => (isBoolean(value) ? value : undefined),
  regionBorderThickness: (value) => (isFiniteNumber(value) ? value : undefined),
  regionLayerTransparency: (value) => (isFiniteNumber(value) ? value : undefined),
  regionStaticColorSwatches: (value) => parseColorThresholdSwatches(value),
  selectedRegionStaticSwatchIndex: (value) => (isInteger(value) ? value : undefined),
  regionHeatmapColorSwatches: (value) => parseColorThresholdSwatches(value),
  selectedRegionHeatmapSwatchIndex: (value) => (isInteger(value) ? value : undefined),
  tileLayerUrl: (value) => (isString(value) ? value : undefined),
  attribution: (value) => (isString(value) ? value : undefined),
  overlayTileLayerUrl: (value) => (isString(value) ? value : undefined),
  overlayAttribution: (value) => (isString(value) ? value : undefined),
  mapSourceMonochrome: (value) => (isBoolean(value) ? value : undefined),
  mapOverlayMonochrome: (value) => (isBoolean(value) ? value : undefined),
  mapTintSwatches: (value) => parseArray(value, parseRgba),
  selectedMapTintSwatchIndex: (value) => (isInteger(value) ? value : undefined),
};

type SwatchPairConfig = {
  swatchesKey:
    | 'lineColorSwatches'
    | 'activityHeatmapColorSwatches'
    | 'regionStaticColorSwatches'
    | 'regionHeatmapColorSwatches'
    | 'mapTintSwatches';
  selectedIndexKey:
    | 'selectedLineSwatchIndex'
    | 'selectedActivityHeatmapSwatchIndex'
    | 'selectedRegionStaticSwatchIndex'
    | 'selectedRegionHeatmapSwatchIndex'
    | 'selectedMapTintSwatchIndex';
};

const SWATCH_SELECTION_PAIRS: SwatchPairConfig[] = [
  { swatchesKey: 'lineColorSwatches', selectedIndexKey: 'selectedLineSwatchIndex' },
  {
    swatchesKey: 'activityHeatmapColorSwatches',
    selectedIndexKey: 'selectedActivityHeatmapSwatchIndex',
  },
  { swatchesKey: 'regionStaticColorSwatches', selectedIndexKey: 'selectedRegionStaticSwatchIndex' },
  {
    swatchesKey: 'regionHeatmapColorSwatches',
    selectedIndexKey: 'selectedRegionHeatmapSwatchIndex',
  },
  { swatchesKey: 'mapTintSwatches', selectedIndexKey: 'selectedMapTintSwatchIndex' },
];

function clampIndex(index: number, maxIndex: number): number {
  return Math.min(Math.max(index, 0), maxIndex);
}

function normalizeSwatchSelectionPairs(normalized: Partial<MapSettings>): void {
  for (const { swatchesKey, selectedIndexKey } of SWATCH_SELECTION_PAIRS) {
    const hasPersistedSwatches = swatchesKey in normalized;
    const hasPersistedIndex = selectedIndexKey in normalized;
    if (!hasPersistedSwatches && !hasPersistedIndex) {
      continue;
    }

    const persistedOrDefaultSwatches = (hasPersistedSwatches
      ? normalized[swatchesKey]
      : DEFAULT_MAP_SETTINGS[swatchesKey]) as unknown[];

    const defaultSwatches = DEFAULT_MAP_SETTINGS[swatchesKey];
    const defaultIndex = DEFAULT_MAP_SETTINGS[selectedIndexKey] as number;

    if (!Array.isArray(persistedOrDefaultSwatches) || persistedOrDefaultSwatches.length === 0) {
      normalized[swatchesKey] = defaultSwatches;
      normalized[selectedIndexKey] = defaultIndex;
      continue;
    }

    const index = hasPersistedIndex
      ? ((normalized[selectedIndexKey] as number | undefined) ?? defaultIndex)
      : defaultIndex;

    normalized[swatchesKey] = persistedOrDefaultSwatches as any;
    normalized[selectedIndexKey] = clampIndex(index, persistedOrDefaultSwatches.length - 1) as any;
  }
}

function normalizeMapSettingsPayload(payload: unknown): Partial<MapSettings> | null {
  if (!isObject(payload)) {
    return null;
  }

  const normalized: Partial<MapSettings> = {};
  for (const [key, validator] of Object.entries(MAP_SETTINGS_VALIDATORS) as [
    keyof MapSettings,
    MapSettingValidator<keyof MapSettings>,
  ][]) {
    if (!(key in payload)) {
      continue;
    }
    const parsedValue = validator(payload[key]);
    if (parsedValue !== undefined) {
      normalized[key] = parsedValue;
    }
  }

  normalizeSwatchSelectionPairs(normalized);

  return Object.keys(normalized).length > 0 ? normalized : null;
}

function extractSettingsPayload(parsed: unknown): unknown {
  if (!isObject(parsed)) {
    return null;
  }

  if ('settings' in parsed) {
    return isObject(parsed.settings) ? parsed.settings : null;
  }

  return parsed;
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
    const settingsPayload = extractSettingsPayload(parsed);
    return normalizeMapSettingsPayload(settingsPayload);
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
