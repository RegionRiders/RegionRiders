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
  const body = await request.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    throw createApiRouteError(400, parsed.error.issues.map((issue) => issue.message).join('; '));
  }

  return parsed.data;
}

export const parseDayStart = (dayDate: string): Date => new Date(`${dayDate}T00:00:00.000Z`);
export const parseDayEnd = (dayDate: string): Date => new Date(`${dayDate}T23:59:59.999Z`);
