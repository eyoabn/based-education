import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { notifyUser } from '@/app/api/notifications/stream/route';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const session = await verifyToken(token);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admins only' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const reports = await prisma.bugReport.findMany({
      where: status && status !== 'ALL' ? { status: status as any } : {},
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            avatarUrl: true,
          },
        },
      },
    });

    return NextResponse.json({ reports });
  } catch (error) {
    console.error('[GET /api/feedback]', error);
    return NextResponse.json({ error: 'Failed to fetch bug reports' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const session = await verifyToken(token);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, description } = await request.json();
    if (!title || !description) {
      return NextResponse.json({ error: 'Title and description are required' }, { status: 400 });
    }

    const bugReport = await prisma.bugReport.create({
      data: {
        title: title.trim(),
        description: description.trim(),
        userId: session.userId,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true, avatarUrl: true },
        },
      },
    });

    // Notify all admins about the new report
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN', isBanned: false },
      select: { id: true },
    });

    if (admins.length > 0) {
      const notif = {
        type: 'PLATFORM_BROADCAST' as const,
        title: 'New Bug Report / User Feedback',
        message: `${session.name} (${session.role}): "${title.trim().slice(0, 80)}"`,
        link: '/dashboard/admin/feedback',
      };

      await prisma.notification.createMany({
        data: admins.map(admin => ({
          userId: admin.id,
          type: notif.type,
          title: notif.title,
          message: notif.message,
          link: notif.link,
        })),
      });

      const now = new Date().toISOString();
      for (const admin of admins) {
        notifyUser(admin.id, { ...notif, createdAt: now });
      }
    }

    return NextResponse.json({ bugReport }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/feedback]', error);
    return NextResponse.json({ error: 'Failed to submit bug report' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const session = await verifyToken(token);
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admins only' }, { status: 403 });
    }

    const body = await request.json();
    const { id, status } = body;
    if (!id || !status) {
      return NextResponse.json({ error: 'Report ID and status are required' }, { status: 400 });
    }

    const updated = await prisma.bugReport.update({
      where: { id },
      data: { status },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            avatarUrl: true,
          },
        },
      },
    });

    return NextResponse.json({ report: updated });
  } catch (error) {
    console.error('[PATCH /api/feedback]', error);
    return NextResponse.json({ error: 'Failed to update bug report' }, { status: 500 });
  }
}
