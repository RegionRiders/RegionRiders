/**
 * @jest-environment node
 */

import { ACTIVITY_TYPES, DEFAULT_ACTIVITY, getActivityConfig } from './activityConfig';

describe('activityConfig', () => {
  describe('getActivityConfig', () => {
    it('returns the correct config for a known activity type', () => {
      const config = getActivityConfig('run');
      expect(config.label).toBe('Run');
      expect(config.icon).toBeDefined();
    });

    it('returns the correct config for a known cycle sport', () => {
      const config = getActivityConfig('ride');
      expect(config.label).toBe('Ride');
      expect(config.icon).toBeDefined();
    });

    it('returns the correct config for a water sport', () => {
      const config = getActivityConfig('swim');
      expect(config.label).toBe('Swim');
    });

    it('returns the correct config for a winter sport', () => {
      const config = getActivityConfig('snowboard');
      expect(config.label).toBe('Snowboard');
    });

    it('is case-insensitive', () => {
      expect(getActivityConfig('RUN')).toEqual(getActivityConfig('run'));
      expect(getActivityConfig('Ride')).toEqual(getActivityConfig('ride'));
      expect(getActivityConfig('SWIM')).toEqual(getActivityConfig('swim'));
    });

    it('returns DEFAULT_ACTIVITY for unknown type', () => {
      const config = getActivityConfig('unknown_type');
      expect(config).toBe(DEFAULT_ACTIVITY);
      expect(config.label).toBe('Unknown Activity Type');
      expect(config.color).toBe('gray');
    });

    it('returns DEFAULT_ACTIVITY for empty string', () => {
      const config = getActivityConfig('');
      expect(config).toBe(DEFAULT_ACTIVITY);
    });

    it('returns DEFAULT_ACTIVITY for a random string', () => {
      const config = getActivityConfig('not_a_real_activity_xyz');
      expect(config).toBe(DEFAULT_ACTIVITY);
    });

    it('returns correct config for stand_up_paddling', () => {
      const config = getActivityConfig('stand_up_paddling');
      expect(config.label).toBe('Stand Up Paddling');
    });

    it('returns correct config for e_bike_ride', () => {
      const config = getActivityConfig('e_bike_ride');
      expect(config.label).toBe('E-Bike Ride');
    });

    it('returns correct config for weight_training', () => {
      const config = getActivityConfig('weight_training');
      expect(config.label).toBe('Weight Training');
    });

    it('returns correct config for football', () => {
      const config = getActivityConfig('football');
      expect(config.label).toBe('Football (Soccer)');
    });
  });

  describe('ACTIVITY_TYPES', () => {
    it('contains at least the basic activity types', () => {
      expect(ACTIVITY_TYPES).toHaveProperty('run');
      expect(ACTIVITY_TYPES).toHaveProperty('ride');
      expect(ACTIVITY_TYPES).toHaveProperty('swim');
      expect(ACTIVITY_TYPES).toHaveProperty('walk');
      expect(ACTIVITY_TYPES).toHaveProperty('hike');
    });

    it('every entry has an icon and label', () => {
      for (const [key, config] of Object.entries(ACTIVITY_TYPES)) {
        expect(config.icon).toBeDefined();
        expect(typeof config.label).toBe('string');
        expect(config.label.length).toBeGreaterThan(0);
      }
    });
  });

  describe('DEFAULT_ACTIVITY', () => {
    it('has the correct shape', () => {
      expect(DEFAULT_ACTIVITY.icon).toBeDefined();
      expect(DEFAULT_ACTIVITY.label).toBe('Unknown Activity Type');
      expect(DEFAULT_ACTIVITY.color).toBe('gray');
    });
  });
});
