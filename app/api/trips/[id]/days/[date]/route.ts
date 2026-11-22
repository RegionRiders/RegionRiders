import { handleApiError } from '@/lib/api';
import { upsertTripDay } from '@/lib/db';
import { tripSchemas } from '@/lib/validation/schemas';
import { parseJsonBody, requireUserId } from '../../../_shared';

interface RouteContext {
  params: Promise<{ id: string; date: string }>;
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const userId = requireUserId(request);
    const { id, date } = await context.params;
    const parsedDate = tripSchemas.dayDate.safeParse(date);

    if (!parsedDate.success) {
      return handleApiError(
        { statusCode: 400, message: 'Invalid trip day date' },
        'Trips API: Upsert Day'
      );
    }

    const body = await parseJsonBody(request, tripSchemas.upsertDay);
    const day = await upsertTripDay(userId, id, date, body);

    if (!day) {
      return handleApiError(
        { statusCode: 404, message: 'Trip not found' },
        'Trips API: Upsert Day'
      );
    }

    return Response.json({ day });
  } catch (error) {
    return handleApiError(error, 'Trips API: Upsert Day');
  }
}
