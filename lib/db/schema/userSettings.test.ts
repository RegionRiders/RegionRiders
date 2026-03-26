import { describe, expect, it } from '@jest/globals';
import { NewUserSettings, UserSettings, userSettings, UserSettingsUpdate } from './userSettings';

describe('User Settings Table Schema', () => {
  it('has all required columns', () => {
    expect(userSettings.id).toBeDefined();
    expect(userSettings.userId).toBeDefined();
    expect(userSettings.settings).toBeDefined();
    expect(userSettings.metadata).toBeDefined();
    expect(userSettings.createdAt).toBeDefined();
    expect(userSettings.updatedAt).toBeDefined();
  });

  it('infers UserSettings and NewUserSettings types', () => {
    const settings: UserSettings = {
      id: 'uuid',
      userId: 'user-uuid',
      settings: null,
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(settings).toBeDefined();

    const newSettings: NewUserSettings = {
      userId: 'user-uuid',
      settings: {
        activityTransparency: 0.6,
        regionTransparency: 0.4,
        lineColorSwatches: [{ normal: [255, 0, 0, 0.5], hover: [255, 100, 100, 0.7] }],
      },
    };
    expect(newSettings).toBeDefined();
  });

  it('infers UserSettingsUpdate type', () => {
    const update: UserSettingsUpdate = {
      settings: {
        mapTintSwatches: [
          [0, 0, 0, 0],
          [255, 255, 255, 0.2],
        ],
      },
      metadata: { source: 'test' },
    };
    expect(update).toBeDefined();
  });
});
