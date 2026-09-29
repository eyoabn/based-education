import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken, clearSessionCookie } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const session = await verifyToken(token);
    if (!session) {
      return clearSessionCookie(
        NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 })
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        teacherStatus: true,
        avatarUrl: true,
        bio: true,
        specialty: true,
        isBanned: true,
        sessionEpoch: true,
        createdAt: true,
      },
    });

    if (!user) {
      return clearSessionCookie(
        NextResponse.json({ error: 'User not found' }, { status: 401 })
      );
    }

    if (user.isBanned) {
      return clearSessionCookie(
        NextResponse.json({ error: 'Your account has been suspended.' }, { status: 403 })
      );
    }

    if (typeof session.epoch === 'number' && session.epoch < user.sessionEpoch) {
      return clearSessionCookie(
        NextResponse.json({ error: 'Session invalidated. Please sign in again.' }, { status: 401 })
      );
    }

    // Do not leak internal auth flags to the client
    const { isBanned, sessionEpoch, ...safeUser } = user;

    return NextResponse.json({ user: safeUser });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch current user' }, { status: 500 });
  }
}
