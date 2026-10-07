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

    // Auto-dismiss LIVE_CLASS_STARTING notifications for live sessions that already ended
    const liveNotifs = await prisma.notification.findMany({
      where: {
        userId: session.userId,
        type: 'LIVE_CLASS_STARTING',
        isRead: false,
      },
      select: { id: true, link: true },
    });

    if (liveNotifs.length > 0) {
      const roomIds = liveNotifs
        .map(n => n.link?.split('/').pop()?.trim())
        .filter(Boolean) as string[];

      if (roomIds.length > 0) {
        const endedRooms = await prisma.liveRoom.findMany({
          where: {
            id: { in: roomIds },
            OR: [{ isLive: false }, { endedAt: { not: null } }],
          },
          select: { id: true },
        });

        if (endedRooms.length > 0) {
          const endedSet = new Set(endedRooms.map(r => r.id));
          const staleIds = liveNotifs
            .filter(n => {
              const rId = n.link?.split('/').pop()?.trim();
              return rId && endedSet.has(rId);
            })
            .map(n => n.id);

          if (staleIds.length > 0) {
            await prisma.notification.updateMany({
              where: { id: { in: staleIds } },
              data: { isRead: true },
            }).catch(() => {});
          }
        }
      }
    }

    const notifications = await prisma.notification.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(notifications);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    const session = await verifyToken(token);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await request.json(); // if id is provided, mark one, else mark all

    if (id) {
      await prisma.notification.updateMany({
        where: { id, userId: session.userId },
        data: { isRead: true }
      });
    } else {
      await prisma.notification.updateMany({
        where: { userId: session.userId, isRead: false },
        data: { isRead: true }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 });
  }
}
