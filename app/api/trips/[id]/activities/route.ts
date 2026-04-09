import { handle500Error, handleApiError } from '@/lib/api';
import { attachActivitiesToTrip } from '@/lib/db';
import { tripSchemas } from '@/lib/validation/schemas';
import { parseJsonBody, requireUserId } from '../../_shared';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const userId = requireUserId(request);
    const { id } = await context.params;
    const body = await parseJsonBody(request, tripSchemas.attachActivities);
    const trip = await attachActivitiesToTrip(userId, id, body.activityIds);

    if (!trip) {
      return handleApiError(
        { statusCode: 404, message: 'Trip not found' },
        'Trips API: Attach Activities'
      );
    }

    return Response.json({ trip });
  } catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      return handleApiError(error, 'Trips API: Attach Activities');
    }

    return handle500Error(error, 'Trips API: Attach Activities');
  }
}
