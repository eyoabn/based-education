import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    const session = token ? await verifyToken(token) : null;

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim();

    if (!q || q.length < 2) {
      return NextResponse.json({
        results: {
          courses: [],
          liveRooms: [],
          people: [],
          shortcuts: [],
        },
      });
    }

    const isTeacher = session?.role === 'TEACHER' || session?.role === 'ADMIN';

    // 1. Search Courses
    const courses = await prisma.course.findMany({
      where: {
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
          { code: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: 6,
      select: {
        id: true,
        title: true,
        code: true,
        logoUrl: true,
        teacher: { select: { name: true } },
      },
    });

    // 2. Search Live Rooms
    const liveRooms = await prisma.liveRoom.findMany({
      where: {
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { course: { title: { contains: q, mode: 'insensitive' } } },
        ],
      },
      take: 5,
      select: {
        id: true,
        title: true,
        isLive: true,
        scheduledAt: true,
        course: { select: { title: true } },
        teacher: { select: { name: true } },
      },
    });

    // 3. Search Users (Students / Teachers)
    const people = await prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: 5,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
      },
    });

    // 4. Quick Navigation Shortcuts based on role and query
    const navItems = [
      { title: 'Live Broadcast Studio', path: '/dashboard/teacher/live/MainStudio', keywords: ['live', 'studio', 'broadcast', 'stream'], teacherOnly: true },
      { title: 'Student Sanctuary Live', path: '/dashboard/student/live/MainStudio', keywords: ['live', 'class', 'session', 'stream'], studentOnly: true },
      { title: 'Message Center & Chats', path: isTeacher ? '/dashboard/teacher/messages' : '/dashboard/student/messages', keywords: ['message', 'chat', 'direct', 'inbox', 'dm'] },
      { title: 'Attendance Analytics', path: '/dashboard/teacher/attendance', keywords: ['attendance', 'presence', 'report', 'tracking'], teacherOnly: true },
      { title: 'Student Gradebook', path: '/dashboard/student/gradebook', keywords: ['grade', 'marks', 'exam', 'score'], studentOnly: true },
      { title: 'Courses & Catalog', path: isTeacher ? '/dashboard/teacher' : '/dashboard/student', keywords: ['course', 'curriculum', 'classes', 'dashboard'] },
    ];

    const qLower = q.toLowerCase();
    const matchedShortcuts = navItems
      .filter(item => {
        if (item.teacherOnly && !isTeacher) return false;
        if (item.studentOnly && isTeacher) return false;
        return (
          item.title.toLowerCase().includes(qLower) ||
          item.keywords.some(k => k.includes(qLower) || qLower.includes(k))
        );
      })
      .slice(0, 4);

    return NextResponse.json({
      results: {
        courses,
        liveRooms,
        people,
        shortcuts: matchedShortcuts,
      },
    });
  } catch (error) {
    console.error('[GET /api/search]', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
