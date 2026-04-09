/**
 * @jest-environment node
 */

import { createTrip, listTripsByUserId } from '@/lib/db';
import { GET, POST } from './route';

jest.mock('@/lib/db', () => ({
  createTrip: jest.fn(),
  listTripsByUserId: jest.fn(),
}));

describe('app/api/trips/route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects requests without x-user-id header', async () => {
    const response = await GET(new Request('http://localhost/api/trips'));
    expect(response.status).toBe(401);
  });

  it('lists trips for the current user', async () => {
    (listTripsByUserId as jest.Mock).mockResolvedValue([{ id: 'trip-1', title: 'Trip' }]);

    const request = new Request('http://localhost/api/trips?status=active', {
      headers: { 'x-user-id': 'user-1' },
    });
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(listTripsByUserId).toHaveBeenCalledWith('user-1', { status: 'active' });
    await expect(response.json()).resolves.toEqual({
      trips: [{ id: 'trip-1', title: 'Trip' }],
    });
  });

  it('creates a trip for the current user', async () => {
    (createTrip as jest.Mock).mockResolvedValue({ id: 'trip-1', title: 'Created trip' });

    const request = new Request('http://localhost/api/trips', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-user-id': 'user-1',
      },
      body: JSON.stringify({
        creationMode: 'manual',
        title: 'Created trip',
      }),
    });
    const response = await POST(request);

    expect(response.status).toBe(201);
    expect(createTrip).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ creationMode: 'manual', title: 'Created trip' })
    );
  });

  it('rejects invalid trip creation payloads', async () => {
    const response = await POST(
      new Request('http://localhost/api/trips', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-user-id': 'user-1',
        },
        body: JSON.stringify({
          creationMode: 'manual',
        }),
      })
    );

    expect(response.status).toBe(400);
    expect(createTrip).not.toHaveBeenCalled();
  });
});
