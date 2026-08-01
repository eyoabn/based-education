import * as jose from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'super-secret-jwt-key'
);

export interface SessionPayload {
  userId: string;
  name: string;
  email?: string;
  role: 'STUDENT' | 'TEACHER' | 'ADMIN';
  teacherStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
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
  } catch (error) {
    return null;
  }
}
