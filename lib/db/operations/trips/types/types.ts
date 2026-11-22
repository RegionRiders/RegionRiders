import type { Activity } from '../../../schema/activities';
import type { TripStatus } from '../../../schema/trips';

export type {
  Trip,
  NewTrip,
  TripUpdate,
  TripDay,
  NewTripDay,
  TripDayUpdate,
  TripStatus,
} from '../../../schema/trips';

export type TripCreationMode = 'manual' | 'date_range' | 'activity_selection' | 'active';

export interface GetTripsOptions {
  status?: TripStatus;
  limit?: number;
  offset?: number;
}

export interface CreateTripInput {
  creationMode: TripCreationMode;
  title: string;
  description?: string | null;
  status?: TripStatus;
  startDate?: Date | null;
  endDate?: Date | null;
  coverActivityId?: string | null;
  metadata?: Record<string, unknown> | null;
  activityIds?: string[];
  rangeStart?: Date;
  rangeEnd?: Date;
  allowEmptyRange?: boolean;
}

export interface UpdateTripInput {
  title?: string;
  description?: string | null;
  status?: TripStatus;
  startDate?: Date | null;
  endDate?: Date | null;
  coverActivityId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface UpsertTripDayInput {
  title?: string | null;
  summary?: string | null;
  note?: string | null;
}

export interface TripStats {
  activityCount: number;
  totalDistance: number;
  totalMovingTime: number;
  totalElapsedTime: number;
  totalElevationGain: number;
  firstActivityStartDate: Date | null;
  lastActivityStartDate: Date | null;
}

export interface TripListItem {
  id: string;
  title: string;
  status: TripStatus;
  startDate: Date | null;
  endDate: Date | null;
  coverActivityId: string | null;
  activityCount: number;
  totalDistance: number;
  totalMovingTime: number;
  totalElevationGain: number;
  updatedAt: Date;
}

export interface TripDayDetail {
  id: string | null;
  dayDate: string;
  title: string | null;
  summary: string | null;
  note: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  activities: Activity[];
}

export interface TripDetail {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  status: TripStatus;
  startDate: Date | null;
  endDate: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  coverActivityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  activities: Activity[];
  days: TripDayDetail[];
  stats: TripStats;
}

export interface TripOperationError {
  statusCode: number;
  message: string;
}
