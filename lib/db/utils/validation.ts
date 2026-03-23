/**
 * Database field validation utilities
 */

/**
 * UUID format validation regex
 * Matches standard UUID format: 8-4-4-4-12 hexadecimal characters
 * Format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
 *   - time_low (8 hex)
 *   - time_mid (4 hex)
 *   - time_hi_and_version (4 hex)
 *   - clock_seq_hi_and_reserved (4 hex)
 *   - clock_seq_low (12 hex)
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validate if a string is a valid UUID format
 * @param value - String to validate
 * @returns true if valid UUID, false otherwise
 *
 * @example
 * ```ts
 * isValidUuid('550e8400-e29b-41d4-a716-446655440000'); // true
 * isValidUuid('00000000-0000-0000-0000-000000000000'); // true
 * isValidUuid('not-a-uuid'); // false
 * ```
 */
export function isValidUuid(value: string): boolean {
  if (!value) {
    return false;
  }
  return UUID_REGEX.test(value);
}
