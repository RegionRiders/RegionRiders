import { describe, expect, it } from '@jest/globals';
import * as schemaExports from './index';

describe('Database Schema Module Exports', () => {
  it('exports users, userSettings, trips, tripDays, activities, and helpers', () => {
    expect(schemaExports.users).toBeDefined();
    expect(schemaExports.userSettings).toBeDefined();
    expect(schemaExports.trips).toBeDefined();
    expect(schemaExports.tripDays).toBeDefined();
    expect(schemaExports.activities).toBeDefined();
    expect(schemaExports.activityFields).toBeDefined();
    expect(schemaExports.activityQueries).toBeDefined();
  });
});
