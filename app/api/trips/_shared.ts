import type { ZodSchema } from 'zod';

const createApiRouteError = (statusCode: number, message: string): Error & { statusCode: number } =>
  Object.assign(new Error(message), { statusCode });

export function requireUserId(request: Request): string {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    throw createApiRouteError(401, 'Missing x-user-id header');
  }

  return userId;
}

export async function parseJsonBody<T>(request: Request, schema: ZodSchema<T>): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw createApiRouteError(400, 'Malformed JSON body');
  }

  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    throw createApiRouteError(400, parsed.error.issues.map((issue) => issue.message).join('; '));
  }

  return parsed.data;
}

const parseDayBoundary = (dayDate: string, time: string): Date => {
  const date = new Date(`${dayDate}T${time}Z`);
  if (Number.isNaN(date.getTime())) {
    throw createApiRouteError(400, 'Invalid day date');
  }

  return date;
};

export const parseDayStart = (dayDate: string): Date => parseDayBoundary(dayDate, '00:00:00.000');
export const parseDayEnd = (dayDate: string): Date => parseDayBoundary(dayDate, '23:59:59.999');
