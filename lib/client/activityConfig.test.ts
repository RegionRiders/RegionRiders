import { ACTIVITY_TYPES, DEFAULT_ACTIVITY, getActivityConfig } from '@/lib/client/activityConfig';

describe('ACTIVITY_TYPES', () => {
  it('contains common activity types', () => {
    expect(ACTIVITY_TYPES).toHaveProperty('run');
    expect(ACTIVITY_TYPES).toHaveProperty('ride');
    expect(ACTIVITY_TYPES).toHaveProperty('swim');
    expect(ACTIVITY_TYPES).toHaveProperty('walk');
    expect(ACTIVITY_TYPES).toHaveProperty('hike');
  });

  it('each entry has an icon and label', () => {
    for (const [, config] of Object.entries(ACTIVITY_TYPES)) {
      expect(config).toHaveProperty('icon');
      expect(config).toHaveProperty('label');
      expect(typeof config.label).toBe('string');
      expect(config.label.length).toBeGreaterThan(0);
    }
  });
});

describe('DEFAULT_ACTIVITY', () => {
  it('has icon, label, and gray color', () => {
    expect(DEFAULT_ACTIVITY).toHaveProperty('icon');
    expect(DEFAULT_ACTIVITY.label).toBe('Unknown Activity Type');
    expect(DEFAULT_ACTIVITY.color).toBe('gray');
  });
});

describe('getActivityConfig', () => {
  it('returns the correct config for a known activity type', () => {
    const cfg = getActivityConfig('run');
    expect(cfg.label).toBe('Run');
    expect(cfg.icon).toBeDefined();
  });

  it('is case-insensitive', () => {
    const lower = getActivityConfig('ride');
    const upper = getActivityConfig('RIDE');
    const mixed = getActivityConfig('Ride');
    expect(lower.label).toBe(upper.label);
    expect(lower.label).toBe(mixed.label);
  });

  it('returns DEFAULT_ACTIVITY for unknown types', () => {
    const cfg = getActivityConfig('not_a_real_activity');
    expect(cfg).toBe(DEFAULT_ACTIVITY);
  });

  it('returns config for all defined activity types without falling back', () => {
    for (const type of Object.keys(ACTIVITY_TYPES)) {
      const cfg = getActivityConfig(type);
      expect(cfg).not.toBe(DEFAULT_ACTIVITY);
    }
  });
});
