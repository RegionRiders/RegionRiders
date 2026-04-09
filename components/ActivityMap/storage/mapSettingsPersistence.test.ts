import {
  loadMapSettingsFromStorage,
  loadPersistedMapSettingsFromStorage,
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
        version: 1,
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

  it('ignores unversioned payloads from storage', () => {
    window.localStorage.setItem(
      resolveMapSettingsStorageKey(),
      JSON.stringify({
        showActivities: false,
      })
    );

    expect(loadPersistedMapSettingsFromStorage()).toBeNull();
    expect(loadMapSettingsFromStorage()).toBeNull();
  });
});
