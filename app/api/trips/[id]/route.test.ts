/**
 * @jest-environment node
 */

import { deleteTrip, getTripDetailById, updateTrip } from '@/lib/db';
import { DELETE, GET, PATCH } from './route';

jest.mock('@/lib/db', () => ({
  deleteTrip: jest.fn(),
  getTripDetailById: jest.fn(),
  updateTrip: jest.fn(),
}));

const context = { params: Promise.resolve({ id: 'trip-1' }) };

describe('app/api/trips/[id]/route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 404 when a trip cannot be found', async () => {
    (getTripDetailById as jest.Mock).mockResolvedValue(undefined);

    const response = await GET(
      new Request('http://localhost/api/trips/trip-1', {
        headers: { 'x-user-id': 'user-1' },
      }),
      context
    );

    expect(response.status).toBe(404);
  });

  it('returns the trip detail for the current user', async () => {
    (getTripDetailById as jest.Mock).mockResolvedValue({ id: 'trip-1', title: 'Trip detail' });

    const response = await GET(
      new Request('http://localhost/api/trips/trip-1', {
        headers: { 'x-user-id': 'user-1' },
      }),
      context
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      trip: { id: 'trip-1', title: 'Trip detail' },
    });
  });

  it('updates a trip', async () => {
    (updateTrip as jest.Mock).mockResolvedValue({ id: 'trip-1', title: 'Updated trip' });

    const response = await PATCH(
      new Request('http://localhost/api/trips/trip-1', {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
          'x-user-id': 'user-1',
        },
        body: JSON.stringify({ title: 'Updated trip' }),
      }),
      context
    );

    expect(response.status).toBe(200);
    expect(updateTrip).toHaveBeenCalledWith('user-1', 'trip-1', { title: 'Updated trip' });
  });

  it('deletes a trip', async () => {
    (deleteTrip as jest.Mock).mockResolvedValue(true);

    const response = await DELETE(
      new Request('http://localhost/api/trips/trip-1', {
        method: 'DELETE',
        headers: { 'x-user-id': 'user-1' },
      }),
      context
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ deleted: true });
  });

  it('rejects detail requests without x-user-id header', async () => {
    const response = await GET(new Request('http://localhost/api/trips/trip-1'), context);
    expect(response.status).toBe(401);
  });
});
