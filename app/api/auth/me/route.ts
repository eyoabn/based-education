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

export async function PATCH(request: NextRequest) {
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

    const body = await request.json().catch(() => ({}));
    const { avatarUrl, name, bio, specialty } = body;

    const dataToUpdate: Record<string, unknown> = {};

    if (avatarUrl !== undefined) {
      if (avatarUrl === null || avatarUrl === '') {
        dataToUpdate.avatarUrl = null;
      } else if (typeof avatarUrl === 'string') {
        const trimmed = avatarUrl.trim();
        // Allow URL or data:image URI (capped to 4MB)
        if (trimmed.length > 4_000_000) {
          return NextResponse.json({ error: 'Avatar image is too large. Max 3MB.' }, { status: 400 });
        }
        dataToUpdate.avatarUrl = trimmed;
      }
    }

    if (name !== undefined && typeof name === 'string') {
      const trimmedName = name.trim();
      if (!trimmedName) {
        return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });
      }
      dataToUpdate.name = trimmedName;
    }

    if (bio !== undefined && typeof bio === 'string') {
      dataToUpdate.bio = bio.trim().slice(0, 1000) || null;
    }

    if (specialty !== undefined && typeof specialty === 'string') {
      dataToUpdate.specialty = specialty.trim().slice(0, 200) || null;
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.userId },
      data: dataToUpdate,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        teacherStatus: true,
        avatarUrl: true,
        bio: true,
        specialty: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
