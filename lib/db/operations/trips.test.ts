import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { eq } from 'drizzle-orm';
import {
  attachActivitiesToTrip,
  closePool,
  createActivity,
  createTrip,
  createUser,
  deleteTrip,
  deleteUser,
  detachActivityFromTrip,
  getActivityById,
  getDb,
  getTripById,
  getTripDetailById,
  listTripsByUserId,
  tripDays,
  updateTrip,
  upsertTripDay,
  type NewActivity,
  type NewUser,
} from '@/lib/db';

const suffix = `${Date.now()}`;

const ownerUser: NewUser = {
  stravaId: `trip-owner-${suffix}`,
  email: `trip-owner-${suffix}@example.com`,
  firstName: 'Trip',
  lastName: 'Owner',
};

const otherUser: NewUser = {
  stravaId: `trip-other-${suffix}`,
  email: `trip-other-${suffix}@example.com`,
  firstName: 'Other',
  lastName: 'Rider',
};

const makeActivity = (
  userId: string,
  name: string,
  startDate: string,
  overrides: Partial<NewActivity> = {}
): NewActivity => ({
  userId,
  stravaActivityId: `${name.toLowerCase().replace(/\s+/g, '-').slice(0, 12)}-${startDate.slice(8, 10)}-${suffix.slice(-8)}`,
  name,
  type: 'Ride',
  distance: 10000,
  movingTime: 1800,
  elapsedTime: 2100,
  totalElevationGain: 200,
  startDate: new Date(startDate),
  ...overrides,
});

describe('Trip Operations', () => {
  let ownerId: string;
  let otherUserId: string;
  let activityOneId: string;
  let activityTwoId: string;
  let activityThreeId: string;
  let activityFourId: string;
  let foreignActivityId: string;
  let selectedTripId: string;
  let rangeTripId: string;

  beforeAll(async () => {
    const owner = await createUser(ownerUser);
    const other = await createUser(otherUser);
    ownerId = owner.id;
    otherUserId = other.id;

    const activityOne = await createActivity(
      makeActivity(ownerId, 'Day One Ride', '2026-04-01T08:00:00.000Z')
    );
    const activityTwo = await createActivity(
      makeActivity(ownerId, 'Day Two Ride', '2026-04-02T08:00:00.000Z', {
        distance: 15000,
        movingTime: 2400,
        totalElevationGain: 350,
      })
    );
    const activityThree = await createActivity(
      makeActivity(ownerId, 'Day Three Ride', '2026-04-03T08:00:00.000Z', {
        distance: 18000,
        elapsedTime: 2600,
      })
    );
    const activityFour = await createActivity(
      makeActivity(ownerId, 'Day Four Ride', '2026-04-04T08:00:00.000Z', {
        distance: 22000,
        movingTime: 3000,
      })
    );
    const foreignActivity = await createActivity(
      makeActivity(otherUserId, 'Other User Ride', '2026-04-05T08:00:00.000Z')
    );

    activityOneId = activityOne.id;
    activityTwoId = activityTwo.id;
    activityThreeId = activityThree.id;
    activityFourId = activityFour.id;
    foreignActivityId = foreignActivity.id;
  });

  afterAll(async () => {
    if (ownerId) {
      await deleteUser(ownerId);
    }
    if (otherUserId) {
      await deleteUser(otherUserId);
    }
    await closePool();
  });

  it('creates a manual draft trip with zero activities', async () => {
    const trip = await createTrip(ownerId, {
      creationMode: 'manual',
      title: 'Manual trip',
      description: 'Plan first, attach rides later',
    });

    expect(trip.title).toBe('Manual trip');
    expect(trip.status).toBe('draft');
    expect(trip.stats.activityCount).toBe(0);
  });

  it('creates exactly one active trip per user', async () => {
    const activeTrip = await createTrip(ownerId, {
      creationMode: 'active',
      title: 'Active tour',
    });
    expect(activeTrip.status).toBe('active');
    expect(activeTrip.startedAt).toBeTruthy();

    await expect(
      createTrip(ownerId, {
        creationMode: 'active',
        title: 'Second active trip',
      })
    ).rejects.toMatchObject({ statusCode: 409 });

    const otherActiveTrip = await createTrip(otherUserId, {
      creationMode: 'active',
      title: 'Other user active trip',
    });
    expect(otherActiveTrip.status).toBe('active');
  });

  it('creates a trip from selected activities and aggregates stats', async () => {
    const trip = await createTrip(ownerId, {
      creationMode: 'activity_selection',
      title: 'Selected rides trip',
      activityIds: [activityOneId, activityTwoId],
      coverActivityId: activityOneId,
    });
    selectedTripId = trip.id;

    expect(trip.startDate?.toISOString()).toBe('2026-04-01T08:00:00.000Z');
    expect(trip.endDate?.toISOString()).toBe('2026-04-02T08:00:00.000Z');
    expect(trip.activities.map((activity) => activity.id)).toEqual([activityOneId, activityTwoId]);
    expect(trip.stats.activityCount).toBe(2);
    expect(trip.stats.totalDistance).toBe(25000);
    expect(trip.coverActivityId).toBe(activityOneId);
  });

  it('lists only the current user trips with derived fields', async () => {
    const trips = await listTripsByUserId(ownerId);

    expect(trips.some((trip) => trip.id === selectedTripId && trip.activityCount === 2)).toBe(true);
    expect(trips.every((trip) => trip.title !== 'Other user active trip')).toBe(true);
  });

  it('rejects creating from a date range with zero activities', async () => {
    await expect(
      createTrip(ownerId, {
        creationMode: 'date_range',
        title: 'Empty range',
        rangeStart: new Date('2026-05-01T00:00:00.000Z'),
        rangeEnd: new Date('2026-05-02T23:59:59.999Z'),
      })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('rejects creating from an invalid date range', async () => {
    await expect(
      createTrip(ownerId, {
        creationMode: 'date_range',
        title: 'Invalid range',
        rangeStart: new Date('2026-04-05T00:00:00.000Z'),
        rangeEnd: new Date('2026-04-04T23:59:59.999Z'),
      })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('creates a trip from a date range and rejects conflicts', async () => {
    const rangeTrip = await createTrip(ownerId, {
      creationMode: 'date_range',
      title: 'Date range trip',
      rangeStart: new Date('2026-04-03T00:00:00.000Z'),
      rangeEnd: new Date('2026-04-04T23:59:59.999Z'),
    });
    rangeTripId = rangeTrip.id;

    expect(rangeTrip.activities.map((activity) => activity.id)).toEqual([
      activityThreeId,
      activityFourId,
    ]);

    await expect(
      createTrip(ownerId, {
        creationMode: 'activity_selection',
        title: 'Conflicting trip',
        activityIds: [activityThreeId],
      })
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('rejects attaching an activity already linked to a different trip', async () => {
    await expect(
      attachActivitiesToTrip(ownerId, selectedTripId, [activityThreeId])
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('attaches and detaches activities while enforcing ownership', async () => {
    const detached = await detachActivityFromTrip(ownerId, selectedTripId, activityTwoId);
    expect(detached?.activities.map((activity) => activity.id)).toEqual([activityOneId]);

    const attached = await attachActivitiesToTrip(ownerId, selectedTripId, [activityTwoId]);
    expect(attached?.activities.map((activity) => activity.id)).toEqual([
      activityOneId,
      activityTwoId,
    ]);

    await expect(
      attachActivitiesToTrip(ownerId, selectedTripId, [foreignActivityId])
    ).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it('updates trip metadata, status, and validates cover activity membership', async () => {
    const updated = await updateTrip(ownerId, selectedTripId, {
      title: 'Updated selected trip',
      status: 'completed',
      coverActivityId: activityTwoId,
    });

    expect(updated?.title).toBe('Updated selected trip');
    expect(updated?.status).toBe('completed');
    expect(updated?.completedAt).toBeTruthy();
    expect(updated?.coverActivityId).toBe(activityTwoId);

    await expect(
      updateTrip(ownerId, selectedTripId, { coverActivityId: activityFourId })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('stores day notes and exposes grouped detail days', async () => {
    const day = await upsertTripDay(ownerId, selectedTripId, '2026-04-02', {
      title: 'Day 2',
      note: 'Private day note',
    });
    expect(day?.dayDate).toBe('2026-04-02');

    const detail = await getTripDetailById(ownerId, selectedTripId);
    expect(detail?.days.map((entry) => entry.dayDate)).toEqual(['2026-04-01', '2026-04-02']);
    expect(detail?.days.find((entry) => entry.dayDate === '2026-04-02')?.note).toBe(
      'Private day note'
    );
  });

  it('upserts a trip day note for a day with zero activities', async () => {
    const manualTrip = await createTrip(ownerId, {
      creationMode: 'manual',
      title: 'Rest day journal',
    });

    const createdDay = await upsertTripDay(ownerId, manualTrip.id, '2026-04-10', {
      title: 'Rest day',
      note: 'Laundry and resupply',
    });
    const updatedDay = await upsertTripDay(ownerId, manualTrip.id, '2026-04-10', {
      title: 'Rest day updated',
      note: 'Laundry, resupply, and route planning',
    });

    expect(updatedDay?.id).toBe(createdDay?.id);

    const detail = await getTripDetailById(ownerId, manualTrip.id);
    expect(detail?.days).toEqual([
      expect.objectContaining({
        dayDate: '2026-04-10',
        title: 'Rest day updated',
        note: 'Laundry, resupply, and route planning',
        activities: [],
      }),
    ]);
  });

  it('enforces ownership on reads and deletes', async () => {
    const foreignRead = await getTripById(otherUserId, selectedTripId);
    expect(foreignRead).toBeUndefined();

    await expect(deleteTrip(otherUserId, selectedTripId)).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('deletes a trip without deleting activities', async () => {
    const deleted = await deleteTrip(ownerId, selectedTripId);
    expect(deleted).toBe(true);

    const activity = await getActivityById(activityOneId);
    expect(activity?.tripId).toBeNull();

    const deletedTrip = await getTripById(ownerId, selectedTripId);
    expect(deletedTrip).toBeUndefined();
  });

  it('deletes range trips by clearing linked activities and trip day rows', async () => {
    await upsertTripDay(ownerId, rangeTripId, '2026-04-05', {
      title: 'Camp note',
      note: 'Stayed near the lake',
    });

    const deleted = await deleteTrip(ownerId, rangeTripId);
    expect(deleted).toBe(true);

    await expect(getTripDetailById(ownerId, rangeTripId)).resolves.toBeUndefined();
    await expect(getActivityById(activityThreeId)).resolves.toMatchObject({ tripId: null });
    await expect(getActivityById(activityFourId)).resolves.toMatchObject({ tripId: null });

    const persistedDays = await getDb()
      .select()
      .from(tripDays)
      .where(eq(tripDays.tripId, rangeTripId));
    expect(persistedDays).toHaveLength(0);
  });
});
