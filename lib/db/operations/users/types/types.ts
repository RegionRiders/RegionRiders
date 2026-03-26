/**
 * User Types
 * Type definitions for user operations
 */
export type { User, NewUser, UserUpdate } from '../../../schema/users';
export type {
  NewUserSettings,
  UserMapSettings,
  UserSettings,
  UserSettingsUpdate,
} from '../../../schema/userSettings';
/**
 * Token update data structure
 */
export interface UserTokenUpdate {
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: Date;
}
/**
 * User query options
 */
export interface GetUsersOptions {
  limit?: number;
  offset?: number;
  activeOnly?: boolean;
}

/**
 * User settings mutation payload
 */
export interface UserSettingsPatch {
  settings?: Partial<UserMapSettings>;
  metadata?: Record<string, unknown>;
}
