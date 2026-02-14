/**
 * Database configuration constants
 */

/**
 * Pagination limits
 */
export const PAGINATION = {
  /** Default number of items per page */
  DEFAULT_LIMIT: 50,
  /** Maximum number of items per page */
  MAX_LIMIT: 100,
  /** Minimum number of items per page */
  MIN_LIMIT: 1,
  /** Minimum offset value */
  MIN_OFFSET: 0,
} as const;
