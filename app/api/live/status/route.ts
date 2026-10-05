import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { getRoomMediaState } from '@/lib/liveMediaState';

// High-speed in-memory status cache to protect the database from concurrent polling
const statusCache = new Map<string, { data: any; expiry: number }>();

export function invalidateLiveStatusCache(room: string) {
  statusCache.delete(room);
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const session = await verifyToken(token);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const roomParam = searchParams.get('room');
    if (!roomParam) {
      return NextResponse.json({ error: 'Missing room parameter' }, { status: 400 });
    }

    const roomTitle = decodeURIComponent(roomParam);

    // Fast-path: return cached response if fresh (TTL: 2.5s)
    const now = Date.now();
    const cached = statusCache.get(roomTitle);
    if (cached && cached.expiry > now) {
      return NextResponse.json(cached.data);
    }

    const liveRoom = await prisma.liveRoom.findFirst({
      where: {
        OR: [
          { id: roomTitle },
          { title: roomTitle },
        ],
      },
      orderBy: [
        { isLive: 'desc' },
        { createdAt: 'desc' },
      ],
      select: {
        id: true,
        title: true,
        isLive: true,
        startedAt: true,
        endedAt: true,
        teacherId: true,
        teacher: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!liveRoom) {
      const emptyResult = {
        exists: false,
        isLive: false,
        endedAt: null,
      };
      statusCache.set(roomTitle, { data: emptyResult, expiry: now + 2500 });
      return NextResponse.json(emptyResult);
    }

    const currentMedia = getRoomMediaState(liveRoom.id) || getRoomMediaState(roomTitle) || null;

    const result = {
      exists: true,
      id: liveRoom.id,
      title: liveRoom.title,
      isLive: liveRoom.isLive && liveRoom.endedAt === null,
      startedAt: liveRoom.startedAt?.toISOString() || null,
      endedAt: liveRoom.endedAt?.toISOString() || null,
      teacher: liveRoom.teacher,
      mediaState: currentMedia,
    };

    statusCache.set(roomTitle, { data: result, expiry: now + 2500 });
    if (liveRoom.id !== roomTitle) {
      statusCache.set(liveRoom.id, { data: result, expiry: now + 2500 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[GET /api/live/status]", error);
    return NextResponse.json({ error: 'Failed to fetch live session status' }, { status: 500 });
  }
}
