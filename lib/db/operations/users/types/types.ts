/**
 * User Types
 * Type definitions for user operations
 */
export type { User, NewUser, UserUpdate } from '../../../schema/users';
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
