const MAP_SETTINGS_USER_ID_KEY = 'rr:user-id';

/**
 * Provides a single place to resolve authenticated user context for map settings persistence.
 * For now this uses LocalStorage and can be swapped later for cookie/session/JWT sources.
 */
export function getPersistedMapSettingsUserId(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const value = window.localStorage.getItem(MAP_SETTINGS_USER_ID_KEY);
    return value?.trim() || null;
  } catch {
    return null;
  }
}
