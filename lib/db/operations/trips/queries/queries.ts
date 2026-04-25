import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { activities, getDb, tripDays, trips } from '@/lib/db';
import { PAGINATION } from '@/lib/db/config/constants';
import { dbLogger } from '@/lib/logger';
import type { Activity } from '../../activities';
import type {
  GetTripsOptions,
  Trip,
  TripDay,
  TripDayDetail,
  TripDetail,
  TripListItem,
  TripStats,
} from '../types';

// Trip days are bucketed in UTC until trips store an explicit timezone.
const getActivityDayKey = (startDate: Date): string => startDate.toISOString().slice(0, 10);

const buildTripStats = (tripActivities: Activity[]): TripStats => {
  if (tripActivities.length === 0) {
    return {
      activityCount: 0,
      totalDistance: 0,
      totalMovingTime: 0,
      totalElapsedTime: 0,
      totalElevationGain: 0,
      firstActivityStartDate: null,
      lastActivityStartDate: null,
    };
  }

  return {
    activityCount: tripActivities.length,
    totalDistance: tripActivities.reduce((sum, activity) => sum + (activity.distance ?? 0), 0),
    totalMovingTime: tripActivities.reduce((sum, activity) => sum + (activity.movingTime ?? 0), 0),
    totalElapsedTime: tripActivities.reduce(
      (sum, activity) => sum + (activity.elapsedTime ?? 0),
      0
    ),
    totalElevationGain: tripActivities.reduce(
      (sum, activity) => sum + (activity.totalElevationGain ?? 0),
      0
    ),
    firstActivityStartDate: tripActivities[0]?.startDate ?? null,
    lastActivityStartDate: tripActivities[tripActivities.length - 1]?.startDate ?? null,
  };
};

const buildTripDays = (
  persistedTripDays: TripDay[],
  tripActivities: Activity[]
): TripDayDetail[] => {
  const dayByDate = new Map(persistedTripDays.map((day) => [day.dayDate, day]));
  const activityDates = new Set(
    tripActivities.map((activity) => getActivityDayKey(activity.startDate))
  );
  const allDates = Array.from(
    new Set([...Array.from(dayByDate.keys()), ...Array.from(activityDates)])
  ).sort();

  return allDates.map((dayDate) => {
    const persisted = dayByDate.get(dayDate);
    return {
      id: persisted?.id ?? null,
      dayDate,
      title: persisted?.title ?? null,
      summary: persisted?.summary ?? null,
      note: persisted?.note ?? null,
      createdAt: persisted?.createdAt ?? null,
      updatedAt: persisted?.updatedAt ?? null,
      activities: tripActivities.filter(
        (activity) => getActivityDayKey(activity.startDate) === dayDate
      ),
    };
  });
};

const toTripDetail = async (trip: Trip): Promise<TripDetail> => {
  const db = getDb();
  const tripActivities = await db
    .select()
    .from(activities)
    .where(eq(activities.tripId, trip.id))
    .orderBy(asc(activities.startDate), asc(activities.createdAt));
  const persistedTripDays = await db
    .select()
    .from(tripDays)
    .where(eq(tripDays.tripId, trip.id))
    .orderBy(asc(tripDays.dayDate));

  return {
    ...trip,
    metadata: trip.metadata ?? null,
    activities: tripActivities,
    days: buildTripDays(persistedTripDays, tripActivities),
    stats: buildTripStats(tripActivities),
  };
};

export async function getTripById(userId: string, tripId: string): Promise<Trip | undefined> {
  try {
    const db = getDb();
    const [trip] = await db
      .select()
      .from(trips)
      .where(and(eq(trips.id, tripId), eq(trips.userId, userId)))
      .limit(1);
    return trip;
  } catch (error) {
    dbLogger.error({ error, userId, tripId }, 'Error fetching trip by ID');
    return undefined;
  }
}

export async function getActiveTripByUserId(userId: string): Promise<Trip | undefined> {
  try {
    const db = getDb();
    const [trip] = await db
      .select()
      .from(trips)
      .where(and(eq(trips.userId, userId), eq(trips.status, 'active')))
      .orderBy(desc(trips.updatedAt))
      .limit(1);
    return trip;
  } catch (error) {
    dbLogger.error({ error, userId }, 'Error fetching active trip by user ID');
    return undefined;
  }
}

export async function listTripsByUserId(
  userId: string,
  options: GetTripsOptions = {}
): Promise<TripListItem[]> {
  try {
    const db = getDb();
    const { status, limit = PAGINATION.DEFAULT_LIMIT, offset = PAGINATION.MIN_OFFSET } = options;
    const safeLimit = Math.max(PAGINATION.MIN_LIMIT, Math.min(limit, PAGINATION.MAX_LIMIT));
    const safeOffset = Math.max(PAGINATION.MIN_OFFSET, offset);
    const conditions = [eq(trips.userId, userId)];

    if (status) {
      conditions.push(eq(trips.status, status));
    }

    const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);

    return await db
      .select({
        id: trips.id,
        title: trips.title,
        status: trips.status,
        startDate: trips.startDate,
        endDate: trips.endDate,
        coverActivityId: trips.coverActivityId,
        activityCount: sql<number>`count(${activities.id})::int`,
        totalDistance: sql<number>`coalesce(sum(${activities.distance}), 0)`,
        totalMovingTime: sql<number>`coalesce(sum(${activities.movingTime}), 0)::int`,
        totalElevationGain: sql<number>`coalesce(sum(${activities.totalElevationGain}), 0)`,
        updatedAt: trips.updatedAt,
      })
      .from(trips)
      .leftJoin(activities, eq(activities.tripId, trips.id))
      .where(whereClause)
      .groupBy(
        trips.id,
        trips.title,
        trips.status,
        trips.startDate,
        trips.endDate,
        trips.coverActivityId,
        trips.updatedAt
      )
      .orderBy(desc(trips.updatedAt), desc(trips.createdAt))
      .limit(safeLimit)
      .offset(safeOffset);
  } catch (error) {
    dbLogger.error({ error, userId, options }, 'Error listing trips by user ID');
    return [];
  }
}

export async function getTripDetailById(
  userId: string,
  tripId: string
): Promise<TripDetail | undefined> {
  try {
    const trip = await getTripById(userId, tripId);
    if (!trip) {
      return undefined;
    }

    return await toTripDetail(trip);
  } catch (error) {
    dbLogger.error({ error, userId, tripId }, 'Error fetching trip detail by ID');
    return undefined;
  }
}
