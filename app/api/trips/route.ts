import { handleApiError } from '@/lib/api';
import { createTrip, listTripsByUserId } from '@/lib/db';
import { tripSchemas } from '@/lib/validation/schemas';
import { parseDayEnd, parseDayStart, parseJsonBody, requireUserId } from './_shared';

export async function GET(request: Request) {
  try {
    const userId = requireUserId(request);
    const { searchParams } = new URL(request.url);
    const parsedFilters = tripSchemas.listFilters.safeParse({
      status: searchParams.get('status') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
      offset: searchParams.get('offset') ?? undefined,
    });

    if (!parsedFilters.success) {
      return handleApiError(
        {
          statusCode: 400,
          message: parsedFilters.error.issues.map((issue) => issue.message).join('; '),
        },
        'Trips API: List Trips'
      );
    }

    const trips = await listTripsByUserId(userId, parsedFilters.data);
    return Response.json({ trips });
  } catch (error) {
    return handleApiError(error, 'Trips API: List Trips');
  }
}

export async function POST(request: Request) {
  try {
    const userId = requireUserId(request);
    const body = await parseJsonBody(request, tripSchemas.create);
    const trip = await createTrip(userId, {
      ...body,
      rangeStart: body.rangeStart ? parseDayStart(body.rangeStart) : undefined,
      rangeEnd: body.rangeEnd ? parseDayEnd(body.rangeEnd) : undefined,
    });

    return Response.json({ trip }, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'Trips API: Create Trip');
  }
}
