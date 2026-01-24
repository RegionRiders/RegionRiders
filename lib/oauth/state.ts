/**
 * OAuth State Management
 * Provides CSRF protection for OAuth flows using state parameter
 *
 * SECURITY CONSIDERATIONS:
 * - State parameters prevent CSRF attacks in OAuth flows
 * - Must be cryptographically secure and unique per request
 * - Should expire quickly to limit attack window
 * - Must use timing-safe comparison to prevent timing attacks
 */

import { cookies } from 'next/headers';
import { randomBytes, timingSafeEqual } from 'crypto';
import { dbLogger } from '@/lib/logger';

const STATE_COOKIE_NAME = 'oauth_state';
const STATE_TTL = 600; // 10 minutes in seconds
const MAX_STATE_LENGTH = 128; // Prevent DoS with oversized states

/**
 * OAuth state metadata for tracking and validation
 */
export interface StateMetadata {
  state: string;
  createdAt: number;
  expiresAt: number;
  used: boolean;
}

/**
 * Generate a cryptographically secure state parameter
 * @returns Secure random state string (64 characters hex)
 */
export function generateState(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Store state in HTTP-only cookie with metadata
 * @param state - The state value to store
 * @throws Error if state storage fails
 */
export async function storeState(state: string): Promise<void> {
  if (!state) {
    throw new Error('Invalid state parameter');
  }

  if (state.length > MAX_STATE_LENGTH) {
    throw new Error('State parameter too long');
  }

  const cookieStore = await cookies();
  const metadata: StateMetadata = {
    state,
    createdAt: Date.now(),
    expiresAt: Date.now() + STATE_TTL * 1000,
    used: false,
  };

  // Store metadata as JSON in cookie
  const cookieValue = JSON.stringify(metadata);

  cookieStore.set(STATE_COOKIE_NAME, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: STATE_TTL,
    path: '/',
  });
}

/**
 * Retrieve and validate state from cookie with comprehensive checks
 * @param providedState - The state parameter from OAuth callback
 * @returns Validation result with detailed status
 */
export async function validateState(providedState: string | null): Promise<{
  valid: boolean;
  reason?: string;
  metadata?: StateMetadata;
}> {
  try {
    // Input validation
    if (!providedState) {
      return { valid: false, reason: 'Missing or invalid state parameter' };
    }

    if (providedState.length > MAX_STATE_LENGTH) {
      return { valid: false, reason: 'State parameter too long' };
    }

    const cookieStore = await cookies();
    const cookieValue = cookieStore.get(STATE_COOKIE_NAME)?.value;

    if (!cookieValue) {
      return { valid: false, reason: 'No stored state found' };
    }

    // Parse metadata with error handling
    let metadata: StateMetadata;
    try {
      metadata = JSON.parse(cookieValue);
    } catch (error) {
      // Clear corrupted cookie
      await clearState();
      return { valid: false, reason: 'Corrupted state data' };
    }

    // Validate metadata structure
    if (!metadata.state || !metadata.createdAt || !metadata.expiresAt) {
      await clearState();
      return { valid: false, reason: 'Invalid state metadata' };
    }

    // Check expiration
    if (Date.now() > metadata.expiresAt) {
      await clearState();
      return { valid: false, reason: 'State expired' };
    }

    // Check if already used (prevent replay attacks)
    if (metadata.used) {
      await clearState();
      return { valid: false, reason: 'State already used' };
    }

    // Timing-safe comparison with length check
    // OAuth states are already 64-char random hex strings (32 bytes of entropy)
    // No need for additional hashing - direct buffer comparison is sufficient
    if (providedState.length !== metadata.state.length) {
      return { valid: false, reason: 'State mismatch' };
    }

    const providedBuffer = Buffer.from(providedState, 'utf8');
    const storedBuffer = Buffer.from(metadata.state, 'utf8');
    const statesMatch = timingSafeEqual(providedBuffer, storedBuffer);

    if (!statesMatch) {
      return { valid: false, reason: 'State mismatch' };
    }

    // Mark as used and clear cookie
    metadata.used = true;
    await clearState();

    return { valid: true, metadata };
  } catch (error) {
    dbLogger.error({ error }, 'State validation error');
    await clearState();
    return { valid: false, reason: 'Validation error' };
  }
}

/**
 * Clear state cookie
 */
export async function clearState(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(STATE_COOKIE_NAME);
}
