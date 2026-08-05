import * as jose from 'jose';
import { NextResponse } from 'next/server';

const rawJwtSecret = process.env.JWT_SECRET;

if (
  process.env.NODE_ENV === 'production' &&
  (!rawJwtSecret ||
    rawJwtSecret === 'change-me-to-a-long-random-string' ||
    rawJwtSecret.length < 32)
) {
  throw new Error(
    'JWT_SECRET must be set to a random value of at least 32 characters in production.'
  );
}

const JWT_SECRET = new TextEncoder().encode(
  rawJwtSecret || 'dev-only-secret-change-before-production'
);

export const AUTH_COOKIE_NAME = 'token';
export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24;

export interface SessionPayload {
  userId: string;
  name: string;
  email?: string;
  role: 'STUDENT' | 'TEACHER' | 'ADMIN';
  teacherStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  /**
   * Phase 6: the value of `User.sessionEpoch` when this token was minted.
   * `requireSession()` rejects a token whose epoch trails the database, which
   * is how a ban or a role change revokes sessions that are already live.
   * Tokens issued before Phase 6 omit it and are read as epoch 0.
   */
  epoch?: number;
}

export async function signToken(payload: SessionPayload): Promise<string> {
  return new jose.SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jose.jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export function attachSessionCookie(
  response: NextResponse,
  token: string
): NextResponse {
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: AUTH_COOKIE_MAX_AGE,
    path: '/',
  });

  return response;
}

export function clearSessionCookie(response: NextResponse): NextResponse {
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    expires: new Date(0),
    path: '/',
  });

  return response;
}
