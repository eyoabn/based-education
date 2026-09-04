import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

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

    const liveRoom = await prisma.liveRoom.findFirst({
      where: {
        OR: [
          { id: roomTitle },
          { title: roomTitle },
        ],
      },
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
      return NextResponse.json({
        exists: false,
        isLive: false,
        endedAt: null,
      });
    }

    return NextResponse.json({
      exists: true,
      id: liveRoom.id,
      title: liveRoom.title,
      isLive: liveRoom.isLive && liveRoom.endedAt === null,
      startedAt: liveRoom.startedAt?.toISOString() || null,
      endedAt: liveRoom.endedAt?.toISOString() || null,
      teacher: liveRoom.teacher,
    });
  } catch (error) {
    console.error("[GET /api/live/status]", error);
    return NextResponse.json({ error: 'Failed to fetch live session status' }, { status: 500 });
  }
}
