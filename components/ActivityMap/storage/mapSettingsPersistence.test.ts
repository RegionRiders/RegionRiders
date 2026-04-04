import { DEFAULT_MAP_SETTINGS } from '@/components/ActivityMap/config/mapConfig';
import {
  loadMapSettingsFromStorage,
  MAP_SETTINGS_ANON_STORAGE_KEY,
  MAP_SETTINGS_STORAGE_VERSION,
} from './mapSettingsPersistence';

describe('mapSettingsPersistence hydration normalization', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('returns null for malformed payload', () => {
    window.localStorage.setItem(MAP_SETTINGS_ANON_STORAGE_KEY, '{not-json');
    expect(loadMapSettingsFromStorage()).toBeNull();
  });

  it('normalizes versioned payload through shared extraction path', () => {
    window.localStorage.setItem(
      MAP_SETTINGS_ANON_STORAGE_KEY,
      JSON.stringify({
        version: MAP_SETTINGS_STORAGE_VERSION,
        savedAt: '2026-01-01T00:00:00.000Z',
        settings: {
          showActivities: false,
          tileLayerUrl: 'https://tiles.example.com/{z}/{x}/{y}.png',
          attribution: '© Example',
        },
      })
    );

    expect(loadMapSettingsFromStorage()).toEqual({
      showActivities: false,
      tileLayerUrl: 'https://tiles.example.com/{z}/{x}/{y}.png',
      attribution: '© Example',
    });
  });

  it('normalizes legacy raw payload through shared extraction path', () => {
    window.localStorage.setItem(
      MAP_SETTINGS_ANON_STORAGE_KEY,
      JSON.stringify({
        showRegions: false,
        mapSourceMonochrome: false,
      })
    );

    expect(loadMapSettingsFromStorage()).toEqual({
      showRegions: false,
      mapSourceMonochrome: false,
    });
  });

  it('drops unknown keys and invalid known values', () => {
    window.localStorage.setItem(
      MAP_SETTINGS_ANON_STORAGE_KEY,
      JSON.stringify({
        version: MAP_SETTINGS_STORAGE_VERSION,
        settings: {
          showActivities: 'nope',
          unknownSetting: 123,
          heatmapDensity: 0.4,
        },
      })
    );

    expect(loadMapSettingsFromStorage()).toEqual({
      heatmapDensity: 0.4,
    });
  });

  it('resets swatches and index to defaults when persisted swatches are empty', () => {
    window.localStorage.setItem(
      MAP_SETTINGS_ANON_STORAGE_KEY,
      JSON.stringify({
        version: MAP_SETTINGS_STORAGE_VERSION,
        settings: {
          mapTintSwatches: [],
          selectedMapTintSwatchIndex: 3,
        },
      })
    );

    expect(loadMapSettingsFromStorage()).toEqual({
      mapTintSwatches: DEFAULT_MAP_SETTINGS.mapTintSwatches,
      selectedMapTintSwatchIndex: DEFAULT_MAP_SETTINGS.selectedMapTintSwatchIndex,
    });
  });

  it('clamps selected index when persisted swatches are valid but index is out of bounds', () => {
    window.localStorage.setItem(
      MAP_SETTINGS_ANON_STORAGE_KEY,
      JSON.stringify({
        version: MAP_SETTINGS_STORAGE_VERSION,
        settings: {
          mapTintSwatches: [
            [0, 0, 0, 0],
            [255, 255, 255, 0.2],
          ],
          selectedMapTintSwatchIndex: 999,
        },
      })
    );

    expect(loadMapSettingsFromStorage()).toEqual({
      mapTintSwatches: [
        [0, 0, 0, 0],
        [255, 255, 255, 0.2],
      ],
      selectedMapTintSwatchIndex: 1,
    });
  });
});
