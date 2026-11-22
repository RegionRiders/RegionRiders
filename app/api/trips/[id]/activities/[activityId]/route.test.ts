/**
 * @jest-environment node
 */

import { detachActivityFromTrip } from '@/lib/db';
import { DELETE } from './route';

jest.mock('@/lib/db', () => ({
  detachActivityFromTrip: jest.fn(),
}));

describe('app/api/trips/[id]/activities/[activityId]/route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('detaches an activity from a trip', async () => {
    (detachActivityFromTrip as jest.Mock).mockResolvedValue({ id: 'trip-1' });

    const response = await DELETE(
      new Request('http://localhost/api/trips/trip-1/activities/activity-1', {
        method: 'DELETE',
        headers: { 'x-user-id': 'user-1' },
      }),
      { params: Promise.resolve({ id: 'trip-1', activityId: 'activity-1' }) }
    );

    expect(response.status).toBe(200);
    expect(detachActivityFromTrip).toHaveBeenCalledWith('user-1', 'trip-1', 'activity-1');
    await expect(response.json()).resolves.toEqual({ trip: { id: 'trip-1' } });
  });

  it('returns 401 when user header is missing', async () => {
    const response = await DELETE(
      new Request('http://localhost/api/trips/trip-1/activities/activity-1', {
        method: 'DELETE',
      }),
      { params: Promise.resolve({ id: 'trip-1', activityId: 'activity-1' }) }
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        error: 'Error',
        message: 'Missing x-user-id header',
        statusCode: 401,
      })
    );
    expect(detachActivityFromTrip).not.toHaveBeenCalled();
  });

  it.each([undefined, null])('returns 404 when trip is not found: %p', async (missingTrip) => {
    (detachActivityFromTrip as jest.Mock).mockResolvedValue(missingTrip);

    const response = await DELETE(
      new Request('http://localhost/api/trips/trip-1/activities/activity-1', {
        method: 'DELETE',
        headers: { 'x-user-id': 'user-1' },
      }),
      { params: Promise.resolve({ id: 'trip-1', activityId: 'activity-1' }) }
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        error: 'Not Found',
        message: 'Trip not found',
        statusCode: 404,
      })
    );
    expect(detachActivityFromTrip).toHaveBeenCalledWith('user-1', 'trip-1', 'activity-1');
  });
});
