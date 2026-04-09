/**
 * @jest-environment node
 */

import { detachActivityFromTrip } from '@/lib/db';
import { DELETE } from './route';

jest.mock('@/lib/db', () => ({
  detachActivityFromTrip: jest.fn(),
}));

describe('app/api/trips/[id]/activities/[activityId]/route', () => {
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
  });
});
