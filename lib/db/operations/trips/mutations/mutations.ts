import { and, asc, eq, gte, inArray, lte, ne } from 'drizzle-orm';
import { activities, getDb, tripDays, trips } from '@/lib/db';
import { dbLogger } from '@/lib/logger';
import type { Activity } from '../../activities';
import { getTripDetailById } from '../queries';
import type {
  CreateTripInput,
  Trip,
  TripDay,
  TripDetail,
  TripOperationError,
  TripStatus,
  UpdateTripInput,
  UpsertTripDayInput,
} from '../types';

const createTripError = (statusCode: number, message: string): TripOperationError => ({
  statusCode,
  message,
});

const ACTIVE_TRIP_CONSTRAINT_NAME = 'trips_one_active_per_user';

const isActiveTripUniqueViolation = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const dbError = error as { code?: string; constraint?: string; detail?: string };
  return (
    dbError.code === '23505' &&
    (dbError.constraint === ACTIVE_TRIP_CONSTRAINT_NAME ||
      dbError.detail?.includes(ACTIVE_TRIP_CONSTRAINT_NAME) === true)
  );
};

const buildStatusForCreate = (input: CreateTripInput): TripStatus => {
  if (input.creationMode === 'active') {
    return 'active';
  }

  return input.status ?? 'draft';
};

const buildConflictMessage = async (conflictingActivities: Activity[]): Promise<string> => {
  const conflictingTripIds = Array.from(
    new Set(conflictingActivities.map((activity) => activity.tripId).filter(Boolean))
  ) as string[];

  if (conflictingTripIds.length === 0) {
    return 'One or more activities are already assigned to another trip';
  }

  const db = getDb();
  const linkedTrips = await db
    .select({ id: trips.id, title: trips.title })
    .from(trips)
    .where(inArray(trips.id, conflictingTripIds));
  const tripTitleById = new Map(linkedTrips.map((trip) => [trip.id, trip.title]));
  const summary = conflictingTripIds
    .map((tripId) => `${tripTitleById.get(tripId) ?? 'Untitled trip'} (${tripId})`)
    .join(', ');

  return `Activities already belong to other trips: ${summary}`;
};

const ensureSingleActiveTrip = async (userId: string, excludeTripId?: string): Promise<void> => {
  const db = getDb();
  const conditions = [eq(trips.userId, userId), eq(trips.status, 'active')];

  if (excludeTripId) {
    conditions.push(ne(trips.id, excludeTripId));
  }

  const [existing] = await db
    .select({ id: trips.id })
    .from(trips)
    .where(and(...conditions))
    .limit(1);
  if (existing) {
    throw createTripError(409, 'Only one active trip is allowed per user');
  }
};

const getTripOrThrow = async (userId: string, tripId: string): Promise<Trip> => {
  const db = getDb();
  const [trip] = await db
    .select()
    .from(trips)
    .where(and(eq(trips.id, tripId), eq(trips.userId, userId)))
    .limit(1);

  if (!trip) {
    throw createTripError(404, 'Trip not found');
  }

  return trip;
};

const getActivitiesByIds = async (activityIds: string[]): Promise<Activity[]> => {
  if (activityIds.length === 0) {
    return [];
  }

  const db = getDb();
  return await db
    .select()
    .from(activities)
    .where(inArray(activities.id, activityIds))
    .orderBy(asc(activities.startDate), asc(activities.createdAt));
};

const validateSelectedActivities = async (
  userId: string,
  activityIds: string[],
  currentTripId?: string
): Promise<Activity[]> => {
  const selectedActivities = await getActivitiesByIds(activityIds);

  if (selectedActivities.length !== activityIds.length) {
    throw createTripError(400, 'One or more activities were not found');
  }

  const foreignActivity = selectedActivities.find((activity) => activity.userId !== userId);
  if (foreignActivity) {
    throw createTripError(403, 'One or more activities do not belong to the current user');
  }

  const conflictingActivities = selectedActivities.filter(
    (activity) => activity.tripId && activity.tripId !== currentTripId
  );
  if (conflictingActivities.length > 0) {
    throw createTripError(409, await buildConflictMessage(conflictingActivities));
  }

  return selectedActivities;
};

const validateCoverActivity = (
  coverActivityId: string | null | undefined,
  selectedActivities: Activity[]
): void => {
  if (!coverActivityId) {
    return;
  }

  const isLinked = selectedActivities.some((activity) => activity.id === coverActivityId);
  if (!isLinked) {
    throw createTripError(400, 'coverActivityId must reference an activity linked to the trip');
  }
};

const deriveTripWindow = (
  selectedActivities: Activity[]
): { startDate: Date | null; endDate: Date | null } => ({
  startDate: selectedActivities[0]?.startDate ?? null,
  endDate: selectedActivities[selectedActivities.length - 1]?.startDate ?? null,
});

const buildStatusTimestamps = (
  trip: Trip,
  nextStatus: TripStatus,
  now: Date
): { startedAt: Date | null; completedAt: Date | null } => ({
  startedAt:
    nextStatus === 'active'
      ? (trip.startedAt ?? now)
      : trip.status === 'active'
        ? null
        : trip.startedAt,
  completedAt:
    nextStatus === 'completed'
      ? (trip.completedAt ?? now)
      : trip.status === 'completed'
        ? null
        : trip.completedAt,
});

export async function createTrip(userId: string, input: CreateTripInput): Promise<TripDetail> {
  try {
    const db = getDb();
    const status = buildStatusForCreate(input);
    const now = new Date();

    if (status === 'active') {
      await ensureSingleActiveTrip(userId);
    }

    let selectedActivities: Activity[] = [];
    if (input.creationMode === 'activity_selection') {
      selectedActivities = await validateSelectedActivities(userId, input.activityIds ?? []);
    }

    if (input.creationMode === 'date_range') {
      if (!input.rangeStart || !input.rangeEnd) {
        throw createTripError(
          400,
          'rangeStart and rangeEnd are required for date range trip creation'
        );
      }
      if (input.rangeStart > input.rangeEnd) {
        throw createTripError(400, 'rangeStart must be before or equal to rangeEnd');
      }

      selectedActivities = await db
        .select()
        .from(activities)
        .where(
          and(
            eq(activities.userId, userId),
            gte(activities.startDate, input.rangeStart),
            lte(activities.startDate, input.rangeEnd)
          )
        )
        .orderBy(asc(activities.startDate), asc(activities.createdAt));

      if (selectedActivities.length === 0 && !input.allowEmptyRange) {
        throw createTripError(400, 'No activities were found in the selected date range');
      }

      const conflictingActivities = selectedActivities.filter(
        (activity) => activity.tripId !== null
      );
      if (conflictingActivities.length > 0) {
        throw createTripError(409, await buildConflictMessage(conflictingActivities));
      }
    }

    validateCoverActivity(input.coverActivityId, selectedActivities);
    const derivedWindow = deriveTripWindow(selectedActivities);
    const createdTrip = await db.transaction(async (tx) => {
      const [insertedTrip] = await tx
        .insert(trips)
        .values({
          userId,
          title: input.title,
          description: input.description ?? null,
          status,
          startDate:
            input.creationMode === 'manual' || input.creationMode === 'active'
              ? (input.startDate ?? null)
              : derivedWindow.startDate,
          endDate:
            input.creationMode === 'manual' || input.creationMode === 'active'
              ? (input.endDate ?? null)
              : derivedWindow.endDate,
          startedAt: status === 'active' ? now : null,
          completedAt: status === 'completed' ? now : null,
          coverActivityId: input.coverActivityId ?? null,
          metadata: input.metadata ?? null,
        })
        .returning();

      if (selectedActivities.length > 0) {
        await tx
          .update(activities)
          .set({
            tripId: insertedTrip.id,
            updatedAt: now,
          })
          .where(
            inArray(
              activities.id,
              selectedActivities.map((activity) => activity.id)
            )
          );
      }

      return insertedTrip;
    });

    const detail = await getTripDetailById(userId, createdTrip.id);
    if (!detail) {
      throw createTripError(500, 'Trip was created but could not be loaded');
    }

    return detail;
  } catch (error) {
    if (isActiveTripUniqueViolation(error)) {
      throw createTripError(409, 'Only one active trip is allowed per user');
    }

    dbLogger.error({ error, userId, input }, 'Error creating trip');
    throw error;
  }
}

export async function updateTrip(
  userId: string,
  tripId: string,
  input: UpdateTripInput
): Promise<TripDetail | undefined> {
  try {
    const db = getDb();
    const trip = await getTripOrThrow(userId, tripId);
    const nextStatus = input.status ?? trip.status;

    if (nextStatus === 'active' && trip.status !== 'active') {
      await ensureSingleActiveTrip(userId, trip.id);
    }

    if (input.coverActivityId) {
      const [coverActivity] = await db
        .select()
        .from(activities)
        .where(eq(activities.id, input.coverActivityId))
        .limit(1);

      if (!coverActivity) {
        throw createTripError(400, 'coverActivityId references an unknown activity');
      }
      if (coverActivity.userId !== userId) {
        throw createTripError(403, 'coverActivityId must belong to the current user');
      }
      if (coverActivity.tripId !== trip.id) {
        throw createTripError(400, 'coverActivityId must reference an activity linked to the trip');
      }
    }

    const now = new Date();
    const statusTimestamps = buildStatusTimestamps(trip, nextStatus, now);
    await db
      .update(trips)
      .set({
        title: input.title ?? trip.title,
        description: input.description === undefined ? trip.description : input.description,
        status: nextStatus,
        startDate: input.startDate === undefined ? trip.startDate : input.startDate,
        endDate: input.endDate === undefined ? trip.endDate : input.endDate,
        startedAt: statusTimestamps.startedAt,
        completedAt: statusTimestamps.completedAt,
        coverActivityId:
          input.coverActivityId === undefined ? trip.coverActivityId : input.coverActivityId,
        metadata: input.metadata === undefined ? trip.metadata : input.metadata,
        updatedAt: now,
      })
      .where(eq(trips.id, trip.id));

    return await getTripDetailById(userId, trip.id);
  } catch (error) {
    if (isActiveTripUniqueViolation(error)) {
      throw createTripError(409, 'Only one active trip is allowed per user');
    }

    dbLogger.error({ error, userId, tripId, input }, 'Error updating trip');
    throw error;
  }
}

export async function attachActivitiesToTrip(
  userId: string,
  tripId: string,
  activityIds: string[]
): Promise<TripDetail | undefined> {
  try {
    const db = getDb();
    await getTripOrThrow(userId, tripId);
    const selectedActivities = await validateSelectedActivities(userId, activityIds, tripId);

    if (selectedActivities.length > 0) {
      await db.transaction(async (tx) => {
        await tx
          .update(activities)
          .set({
            tripId,
            updatedAt: new Date(),
          })
          .where(
            inArray(
              activities.id,
              selectedActivities.map((activity) => activity.id)
            )
          );
      });
    }

    return await getTripDetailById(userId, tripId);
  } catch (error) {
    dbLogger.error({ error, userId, tripId, activityIds }, 'Error attaching activities to trip');
    throw error;
  }
}

export async function detachActivityFromTrip(
  userId: string,
  tripId: string,
  activityId: string
): Promise<TripDetail | undefined> {
  try {
    const db = getDb();
    const trip = await getTripOrThrow(userId, tripId);
    const [activity] = await db
      .select()
      .from(activities)
      .where(eq(activities.id, activityId))
      .limit(1);

    if (!activity) {
      throw createTripError(404, 'Activity not found');
    }
    if (activity.userId !== userId) {
      throw createTripError(403, 'Activity does not belong to the current user');
    }
    if (activity.tripId !== trip.id) {
      throw createTripError(409, 'Activity is not linked to the specified trip');
    }

    await db.transaction(async (tx) => {
      const now = new Date();
      await tx
        .update(activities)
        .set({
          tripId: null,
          updatedAt: now,
        })
        .where(eq(activities.id, activity.id));

      if (trip.coverActivityId === activity.id) {
        await tx
          .update(trips)
          .set({
            coverActivityId: null,
            updatedAt: now,
          })
          .where(eq(trips.id, trip.id));
      }
    });

    return await getTripDetailById(userId, trip.id);
  } catch (error) {
    dbLogger.error({ error, userId, tripId, activityId }, 'Error detaching activity from trip');
    throw error;
  }
}

export async function upsertTripDay(
  userId: string,
  tripId: string,
  dayDate: string,
  input: UpsertTripDayInput
): Promise<TripDay | undefined> {
  try {
    const db = getDb();
    await getTripOrThrow(userId, tripId);
    const [day] = await db
      .insert(tripDays)
      .values({
        tripId,
        dayDate,
        title: input.title ?? null,
        summary: input.summary ?? null,
        note: input.note ?? null,
      })
      .onConflictDoUpdate({
        target: [tripDays.tripId, tripDays.dayDate],
        set: {
          title: input.title ?? null,
          summary: input.summary ?? null,
          note: input.note ?? null,
          updatedAt: new Date(),
        },
      })
      .returning();

    return day;
  } catch (error) {
    dbLogger.error({ error, userId, tripId, dayDate, input }, 'Error upserting trip day');
    throw error;
  }
}

export async function deleteTrip(userId: string, tripId: string): Promise<boolean> {
  try {
    const db = getDb();
    await getTripOrThrow(userId, tripId);
    const result = await db.delete(trips).where(eq(trips.id, tripId));
    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    dbLogger.error({ error, userId, tripId }, 'Error deleting trip');
    throw error;
  }
}
