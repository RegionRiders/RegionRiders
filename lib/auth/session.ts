import 'server-only';

import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';

const SESSION_COOKIE_NAME = 'rr_session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days
const DEV_SESSION_SECRET = 'dev-only-session-secret-change-me';

interface SessionPayload {
  userId: string;
  iat: number;
  exp: number;
}

function getSessionSecret(): string {
  const configuredSecret = process.env.SESSION_SECRET;
  if (configuredSecret) {
    return configuredSecret;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET is required in production');
  }

  return DEV_SESSION_SECRET;
}

function encodePayload(payload: SessionPayload): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

function decodePayload(value: string): SessionPayload | null {
  try {
    return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as SessionPayload;
  } catch {
    return null;
  }
}

function signValue(value: string): string {
  return createHmac('sha256', getSessionSecret()).update(value).digest('base64url');
}

function timingSafeEqualStrings(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a, 'utf8');
  const bBuffer = Buffer.from(b, 'utf8');

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  return timingSafeEqual(aBuffer, bBuffer);
}

export async function createUserSession(userId: string): Promise<void> {
  const cookieStore = await cookies();
  const nowInSeconds = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    userId,
    iat: nowInSeconds,
    exp: nowInSeconds + SESSION_MAX_AGE_SECONDS,
  };
  const encodedPayload = encodePayload(payload);
  const signature = signValue(encodedPayload);

  cookieStore.set(SESSION_COOKIE_NAME, `${encodedPayload}.${signature}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: '/',
  });
}

export async function clearUserSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getAuthenticatedUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionCookie) {
    return null;
  }

  const [encodedPayload, providedSignature] = sessionCookie.split('.');
  if (!encodedPayload || !providedSignature) {
    await clearUserSession();
    return null;
  }

  const expectedSignature = signValue(encodedPayload);
  if (!timingSafeEqualStrings(providedSignature, expectedSignature)) {
    await clearUserSession();
    return null;
  }

  const payload = decodePayload(encodedPayload);
  if (!payload?.userId || typeof payload.exp !== 'number') {
    await clearUserSession();
    return null;
  }

  const nowInSeconds = Math.floor(Date.now() / 1000);
  if (payload.exp <= nowInSeconds) {
    await clearUserSession();
    return null;
  }

  return payload.userId;
}
