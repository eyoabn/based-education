import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const session = await verifyToken(token);
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'overview';

    if (type === 'overview') {
      const usersCount = await prisma.user.count();
      const coursesCount = await prisma.course.count();
      const liveRoomsCount = await prisma.liveRoom.count();
      const postsCount = await prisma.post.count();
      const messagesCount = await prisma.chatMessage.count();
      const recordingsCount = await prisma.liveRecording.count();

      return NextResponse.json({
        reports: {
          users: usersCount,
          courses: coursesCount,
          liveRooms: liveRoomsCount,
          posts: postsCount,
          messages: messagesCount,
          recordings: recordingsCount
        }
      });
    }

    if (type === 'courses') {
      const courses = await prisma.course.findMany({
        take: 100,
        orderBy: { createdAt: 'desc' },
        include: {
          teacher: { select: { name: true, email: true } },
          _count: { select: { students: true, liveRooms: true } }
        }
      });
      return NextResponse.json({ courses });
    }

    if (type === 'users') {
      const users = await prisma.user.findMany({
        take: 100,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isBanned: true,
          createdAt: true,
          _count: { select: { enrolledIn: true, taughtCourses: true } }
        }
      });
      return NextResponse.json({ users });
    }

    return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
  } catch (error) {
    console.error("[GET /api/admin/database]", error);
    return NextResponse.json({ error: 'Failed to fetch database reports' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const session = await verifyToken(token);
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const type = searchParams.get('type');

    if (!id || !type) return NextResponse.json({ error: 'ID and type required' }, { status: 400 });

    if (type === 'course') {
      await prisma.course.delete({ where: { id } });
    } else if (type === 'user') {
      // In a real scenario, you might want to soft-delete or anonymize
      await prisma.user.delete({ where: { id } });
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/admin/database]", error);
    return NextResponse.json({ error: 'Failed to delete record' }, { status: 500 });
  }
}
