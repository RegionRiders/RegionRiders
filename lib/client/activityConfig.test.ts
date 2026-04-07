import { ACTIVITY_TYPES, DEFAULT_ACTIVITY, getActivityConfig } from './activityConfig';

describe('activityConfig', () => {
  describe('getActivityConfig', () => {
    it('returns the correct config for a known activity type', () => {
      const cfg = getActivityConfig('ride');
      expect(cfg.label).toBe('Ride');
      expect(cfg.icon).toBeDefined();
    });

    it('returns config for run', () => {
      const cfg = getActivityConfig('run');
      expect(cfg.label).toBe('Run');
    });

    it('is case-insensitive', () => {
      const cfg = getActivityConfig('RUN');
      expect(cfg.label).toBe('Run');

      const cfg2 = getActivityConfig('RIDE');
      expect(cfg2.label).toBe('Ride');
    });

    it('returns DEFAULT_ACTIVITY for unknown activity types', () => {
      const cfg = getActivityConfig('unknown_xyz');
      expect(cfg).toBe(DEFAULT_ACTIVITY);
      expect(cfg.label).toBe('Unknown Activity Type');
    });

    it('returns DEFAULT_ACTIVITY for empty string', () => {
      const cfg = getActivityConfig('');
      expect(cfg).toBe(DEFAULT_ACTIVITY);
    });

    it('returns swim config', () => {
      const cfg = getActivityConfig('swim');
      expect(cfg.label).toBe('Swim');
    });

    it('returns hike config', () => {
      const cfg = getActivityConfig('hike');
      expect(cfg.label).toBe('Hike');
    });

    it('returns walk config', () => {
      const cfg = getActivityConfig('walk');
      expect(cfg.label).toBe('Walk');
    });

    it('returns snowboard config', () => {
      const cfg = getActivityConfig('snowboard');
      expect(cfg.label).toBe('Snowboard');
    });

    it('returns yoga config', () => {
      const cfg = getActivityConfig('yoga');
      expect(cfg.label).toBe('Yoga');
    });
  });

  describe('ACTIVITY_TYPES', () => {
    it('contains expected foot sport types', () => {
      expect(ACTIVITY_TYPES).toHaveProperty('run');
      expect(ACTIVITY_TYPES).toHaveProperty('trail_run');
      expect(ACTIVITY_TYPES).toHaveProperty('walk');
      expect(ACTIVITY_TYPES).toHaveProperty('hike');
      expect(ACTIVITY_TYPES).toHaveProperty('virtual_run');
    });

    it('contains expected cycle sport types', () => {
      expect(ACTIVITY_TYPES).toHaveProperty('ride');
      expect(ACTIVITY_TYPES).toHaveProperty('mountain_bike_ride');
      expect(ACTIVITY_TYPES).toHaveProperty('gravel_ride');
      expect(ACTIVITY_TYPES).toHaveProperty('e_bike_ride');
      expect(ACTIVITY_TYPES).toHaveProperty('virtual_ride');
    });

    it('contains expected water sport types', () => {
      expect(ACTIVITY_TYPES).toHaveProperty('swim');
      expect(ACTIVITY_TYPES).toHaveProperty('canoe');
      expect(ACTIVITY_TYPES).toHaveProperty('kayak');
      expect(ACTIVITY_TYPES).toHaveProperty('rowing');
    });

    it('contains expected winter sport types', () => {
      expect(ACTIVITY_TYPES).toHaveProperty('alpine_ski');
      expect(ACTIVITY_TYPES).toHaveProperty('snowboard');
      expect(ACTIVITY_TYPES).toHaveProperty('snowshoe');
    });

    it('each entry has an icon and a label', () => {
      Object.entries(ACTIVITY_TYPES).forEach(([, cfg]) => {
        expect(cfg.icon).toBeDefined();
        expect(typeof cfg.label).toBe('string');
        expect(cfg.label.length).toBeGreaterThan(0);
      });
    });
  });

  describe('DEFAULT_ACTIVITY', () => {
    it('has an icon, a label, and the color gray', () => {
      expect(DEFAULT_ACTIVITY.icon).toBeDefined();
      expect(DEFAULT_ACTIVITY.label).toBe('Unknown Activity Type');
      expect(DEFAULT_ACTIVITY.color).toBe('gray');
    });
  });
});
