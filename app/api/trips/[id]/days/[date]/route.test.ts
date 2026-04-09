/**
 * @jest-environment node
 */

import { upsertTripDay } from '@/lib/db';
import { PUT } from './route';

jest.mock('@/lib/db', () => ({
  upsertTripDay: jest.fn(),
}));

describe('app/api/trips/[id]/days/[date]/route', () => {
  it('upserts a trip day note', async () => {
    (upsertTripDay as jest.Mock).mockResolvedValue({ id: 'day-1', dayDate: '2026-04-09' });

    const response = await PUT(
      new Request('http://localhost/api/trips/trip-1/days/2026-04-09', {
        method: 'PUT',
        headers: {
          'content-type': 'application/json',
          'x-user-id': 'user-1',
        },
        body: JSON.stringify({ note: 'Strong headwinds today' }),
      }),
      { params: Promise.resolve({ id: 'trip-1', date: '2026-04-09' }) }
    );

    expect(response.status).toBe(200);
    expect(upsertTripDay).toHaveBeenCalledWith('user-1', 'trip-1', '2026-04-09', {
      note: 'Strong headwinds today',
    });
  });
});
