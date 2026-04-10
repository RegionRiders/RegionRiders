import { MapSettings } from '@/components/ActivityMap/controls/LayersPanel/types';
import { mapSettingsSchema } from '@/lib/validation/schemas';

interface MapSettingsApiResponse {
  userId: string;
  settings: unknown;
  updatedAt?: unknown;
}

interface AuthSessionApiResponse {
  authenticated: boolean;
  userId: string | null;
}

export type LoadMapSettingsFromApiSuccessResult = {
  userId: string;
  settings: Partial<MapSettings> | null;
  updatedAt: string | null;
};

export type LoadMapSettingsFromApiResult =
  | LoadMapSettingsFromApiSuccessResult
  | {
      unauthenticated: true;
    };

function isMapSettingsApiResponse(value: unknown): value is MapSettingsApiResponse {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<MapSettingsApiResponse>;
  return typeof candidate.userId === 'string' && 'settings' in candidate;
}

export async function loadMapSettingsFromApi(): Promise<LoadMapSettingsFromApiResult | null> {
  try {
    const response = await fetch('/api/user/settings', {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    });

    if (response.status === 401) {
      return { unauthenticated: true };
    }

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as unknown;
    if (!isMapSettingsApiResponse(payload)) {
      return null;
    }

    const inputSettings = payload.settings;
    const parsed = mapSettingsSchema.safeParse(inputSettings);
    // Guard against payloads containing only unknown keys that Zod strips to an empty object.
    const isStrippedToEmpty =
      inputSettings != null &&
      typeof inputSettings === 'object' &&
      !Array.isArray(inputSettings) &&
      Object.keys(inputSettings as Record<string, unknown>).length > 0 &&
      parsed.success &&
      Object.keys(parsed.data).length === 0;
    return {
      userId: payload.userId,
      settings: parsed.success && !isStrippedToEmpty ? parsed.data : null,
      updatedAt: typeof payload.updatedAt === 'string' ? payload.updatedAt : null,
    };
  } catch {
    return null;
  }
}

export async function saveMapSettingsToApi(settings: MapSettings): Promise<boolean> {
  try {
    const response = await fetch('/api/user/settings', {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ settings }),
    });

    return response.ok;
  } catch {
    return false;
  }
}

export async function loadAuthenticatedUserIdFromApi(): Promise<string | null> {
  try {
    const response = await fetch('/api/auth/session', {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as Partial<AuthSessionApiResponse>;
    if (payload?.authenticated !== true || typeof payload.userId !== 'string') {
      return null;
    }

    return payload.userId;
  } catch {
    return null;
  }
}
