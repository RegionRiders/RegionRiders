import { handleApiError } from '@/lib/api';
import { deleteTrip, getTripDetailById, updateTrip } from '@/lib/db';
import { tripSchemas } from '@/lib/validation/schemas';
import { parseJsonBody, requireUserId } from '../_shared';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const userId = requireUserId(request);
    const { id } = await context.params;
    const trip = await getTripDetailById(userId, id);

    if (!trip) {
      return handleApiError({ statusCode: 404, message: 'Trip not found' }, 'Trips API: Get Trip');
    }

    return Response.json({ trip });
  } catch (error) {
    return handleApiError(error, 'Trips API: Get Trip');
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const userId = requireUserId(request);
    const { id } = await context.params;
    const body = await parseJsonBody(request, tripSchemas.update);
    const trip = await updateTrip(userId, id, body);

    if (!trip) {
      return handleApiError(
        { statusCode: 404, message: 'Trip not found' },
        'Trips API: Update Trip'
      );
    }

    return Response.json({ trip });
  } catch (error) {
    return handleApiError(error, 'Trips API: Update Trip');
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const userId = requireUserId(request);
    const { id } = await context.params;
    const deleted = await deleteTrip(userId, id);

    return Response.json({ deleted });
  } catch (error) {
    return handleApiError(error, 'Trips API: Delete Trip');
  }
}
