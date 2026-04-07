import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth/session';
import { handle500Error, handleApiError } from '@/lib/api';
import { getUserSettingsByUserId, upsertUserSettings } from '@/lib/db/operations/users';
import { mapSettingsSchema } from '@/lib/validation/schemas';

function getUnauthorizedResponse() {
  return handleApiError(
    { statusCode: 401, message: 'Authentication required' },
    'User Settings API: Authentication'
  );
}

export async function GET() {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return getUnauthorizedResponse();
    }

    const settings = await getUserSettingsByUserId(userId);
    return NextResponse.json({
      success: true,
      userId,
      settings: settings?.settings ?? null,
    });
  } catch (error) {
    return handle500Error(error, 'User Settings API: GET');
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return getUnauthorizedResponse();
    }

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return handleApiError(
        { statusCode: 400, message: 'Invalid map settings payload' },
        'User Settings API: Validation'
      );
    }
    const candidate =
      payload && typeof payload === 'object' && 'settings' in payload
        ? (payload as { settings?: unknown }).settings
        : payload;
    const parsed = mapSettingsSchema.safeParse(candidate);

    if (!parsed.success) {
      return handleApiError(
        { statusCode: 400, message: 'Invalid map settings payload' },
        'User Settings API: Validation'
      );
    }

    const upserted = await upsertUserSettings(userId, {
      settings: parsed.data,
    });

    if (upserted.settings == null) {
      return handleApiError(
        { statusCode: 500, message: 'Failed to persist map settings' },
        'User Settings API: Persistence'
      );
    }

    return NextResponse.json({
      success: true,
      userId,
      settings: upserted.settings,
    });
  } catch (error) {
    return handle500Error(error, 'User Settings API: PUT');
  }
}
