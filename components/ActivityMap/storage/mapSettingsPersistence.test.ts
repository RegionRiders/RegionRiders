import {
  loadMapSettingsFromStorage,
  loadPersistedMapSettingsFromStorage,
  MAP_SETTINGS_STORAGE_VERSION,
  resolveMapSettingsStorageKey,
} from '@/components/ActivityMap/storage/mapSettingsPersistence';

describe('mapSettingsPersistence', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('loads versioned payloads from storage', () => {
    window.localStorage.setItem(
      resolveMapSettingsStorageKey(),
      JSON.stringify({
        version: MAP_SETTINGS_STORAGE_VERSION,
        savedAt: '2026-01-01T00:00:00.000Z',
        settings: {
          showActivities: false,
        },
      })
    );

    expect(loadPersistedMapSettingsFromStorage()).toEqual({
      savedAt: '2026-01-01T00:00:00.000Z',
      settings: {
        showActivities: false,
      },
    });
    expect(loadMapSettingsFromStorage()).toEqual({
      showActivities: false,
    });
  });

  it('loads legacy unversioned payloads from storage', () => {
    window.localStorage.setItem(
      resolveMapSettingsStorageKey(),
      JSON.stringify({
        showActivities: false,
      })
    );

    expect(loadPersistedMapSettingsFromStorage()).toEqual({
      savedAt: null,
      settings: {
        showActivities: false,
      },
    });
    expect(loadMapSettingsFromStorage()).toEqual({
      showActivities: false,
    });
  });

  it('ignores legacy unversioned payloads that normalize to empty settings', () => {
    window.localStorage.setItem(
      resolveMapSettingsStorageKey(),
      JSON.stringify({
        unknownSetting: true,
      })
    );

    expect(loadPersistedMapSettingsFromStorage()).toBeNull();
    expect(loadMapSettingsFromStorage()).toBeNull();
  });

  it('ignores unsupported payload versions from storage', () => {
    window.localStorage.setItem(
      resolveMapSettingsStorageKey(),
      JSON.stringify({
        version: MAP_SETTINGS_STORAGE_VERSION + 1,
        savedAt: '2026-01-01T00:00:00.000Z',
        settings: {
          showActivities: false,
        },
      })
    );

    expect(loadPersistedMapSettingsFromStorage()).toBeNull();
    expect(loadMapSettingsFromStorage()).toBeNull();
  });

  it('ignores non-numeric payload versions from storage', () => {
    window.localStorage.setItem(
      resolveMapSettingsStorageKey(),
      JSON.stringify({
        version: String(MAP_SETTINGS_STORAGE_VERSION),
        savedAt: '2026-01-01T00:00:00.000Z',
        settings: {
          showActivities: false,
        },
      })
    );

    expect(loadPersistedMapSettingsFromStorage()).toBeNull();
    expect(loadMapSettingsFromStorage()).toBeNull();
  });
});
