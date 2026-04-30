/**
 * Database Schema Module
 * Centralized exports for all database tables
 */

export * from './users';
export * from './userSettings';
export { trips, tripDays, tripStatusEnum, tripStatusValues } from './trips';
export type { Trip, NewTrip, TripUpdate, TripDay, NewTripDay, TripDayUpdate } from './trips';
export * from './activities';

// Query helpers for selective field loading
export * from './helpers/activityFields';
