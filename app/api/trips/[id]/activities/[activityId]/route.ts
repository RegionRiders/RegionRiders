import { handleApiError } from '@/lib/api';
import { detachActivityFromTrip } from '@/lib/db';
import { requireUserId } from '../../../_shared';

interface RouteContext {
  params: Promise<{ id: string; activityId: string }>;
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const userId = requireUserId(request);
    const { id, activityId } = await context.params;
    const trip = await detachActivityFromTrip(userId, id, activityId);

    if (!trip) {
      return handleApiError(
        { statusCode: 404, message: 'Trip not found' },
        'Trips API: Detach Activity'
      );
    }

    return Response.json({ trip });
  } catch (error) {
    return handleApiError(error, 'Trips API: Detach Activity');
  }
}
