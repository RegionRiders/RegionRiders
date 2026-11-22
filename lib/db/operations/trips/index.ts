/**
 * Trip Operations
 * Provides create/read/update/delete and read-model operations for trips.
 */

export type {
  Trip,
  NewTrip,
  TripUpdate,
  TripDay,
  NewTripDay,
  TripDayUpdate,
  TripStatus,
  TripCreationMode,
  GetTripsOptions,
  CreateTripInput,
  UpdateTripInput,
  UpsertTripDayInput,
  TripStats,
  TripListItem,
  TripDayDetail,
  TripDetail,
  TripOperationError,
} from './types';

export {
  getActiveTripByUserId,
  getTripById,
  getTripDetailById,
  listTripsByUserId,
} from './queries';

export {
  createTrip,
  updateTrip,
  attachActivitiesToTrip,
  detachActivityFromTrip,
  upsertTripDay,
  deleteTrip,
} from './mutations';
