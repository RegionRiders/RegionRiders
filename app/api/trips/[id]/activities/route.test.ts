/**
 * @jest-environment node
 */

import { attachActivitiesToTrip } from '@/lib/db';
import { POST } from './route';

jest.mock('@/lib/db', () => ({
  attachActivitiesToTrip: jest.fn(),
}));

describe('app/api/trips/[id]/activities/route', () => {
  it('attaches activities to a trip', async () => {
    (attachActivitiesToTrip as jest.Mock).mockResolvedValue({ id: 'trip-1' });

    const response = await POST(
      new Request('http://localhost/api/trips/trip-1/activities', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-user-id': 'user-1',
        },
        body: JSON.stringify({ activityIds: ['123e4567-e89b-42d3-a456-426614174000'] }),
      }),
      { params: Promise.resolve({ id: 'trip-1' }) }
    );

    expect(response.status).toBe(200);
    expect(attachActivitiesToTrip).toHaveBeenCalledWith('user-1', 'trip-1', [
      '123e4567-e89b-42d3-a456-426614174000',
    ]);
  });
});
