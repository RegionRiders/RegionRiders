import { describe, expect, it } from '@jest/globals';
import {
  NewTrip,
  NewTripDay,
  Trip,
  TripDay,
  tripDays,
  TripDayUpdate,
  trips,
  TripUpdate,
} from '@/lib/db';

describe('Trips Table Schema', () => {
  it('has all required trip columns', () => {
    expect(trips.id).toBeDefined();
    expect(trips.userId).toBeDefined();
    expect(trips.title).toBeDefined();
    expect(trips.status).toBeDefined();
    expect(trips.startDate).toBeDefined();
    expect(trips.endDate).toBeDefined();
    expect(trips.coverActivityId).toBeDefined();
    expect(trips.createdAt).toBeDefined();
    expect(trips.updatedAt).toBeDefined();
  });

  it('has all required trip day columns', () => {
    expect(tripDays.id).toBeDefined();
    expect(tripDays.tripId).toBeDefined();
    expect(tripDays.dayDate).toBeDefined();
    expect(tripDays.note).toBeDefined();
    expect(tripDays.createdAt).toBeDefined();
    expect(tripDays.updatedAt).toBeDefined();
  });

  it('infers Trip and NewTrip types', () => {
    const trip: Trip = {
      id: 'trip-id',
      userId: 'user-id',
      title: 'Bikepacking Tour',
      description: null,
      status: 'draft',
      startDate: null,
      endDate: null,
      startedAt: null,
      completedAt: null,
      coverActivityId: null,
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(trip).toBeDefined();

    const newTrip: NewTrip = {
      userId: 'user-id',
      title: 'Bikepacking Tour',
      status: 'draft',
    };
    expect(newTrip).toBeDefined();
  });

  it('infers TripDay and NewTripDay types', () => {
    const tripDay: TripDay = {
      id: 'trip-day-id',
      tripId: 'trip-id',
      dayDate: '2026-04-09',
      title: null,
      summary: null,
      note: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(tripDay).toBeDefined();

    const newTripDay: NewTripDay = {
      tripId: 'trip-id',
      dayDate: '2026-04-09',
    };
    expect(newTripDay).toBeDefined();
  });

  it('infers TripUpdate and TripDayUpdate types', () => {
    const tripUpdate: TripUpdate = {
      title: 'Updated title',
      status: 'active',
      updatedAt: new Date(),
    };
    expect(tripUpdate).toBeDefined();

    const tripDayUpdate: TripDayUpdate = {
      note: 'Updated note',
      updatedAt: new Date(),
    };
    expect(tripDayUpdate).toBeDefined();
  });
});
