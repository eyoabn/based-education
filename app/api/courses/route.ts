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
    const scope = searchParams.get('scope'); // 'all' or 'my'

    let whereClause = {};
    if (scope === 'my') {
      whereClause = session.role === 'TEACHER'
        ? { teacherId: session.userId }
        : session.role === 'ADMIN'
          ? {}
          : { students: { some: { id: session.userId } } };
    }

    const courses = await prisma.course.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            specialty: true,
          },
        },
        students: {
          where: { id: session.userId },
          select: { id: true },
        },
        requests: {
          where: { studentId: session.userId, status: 'PENDING' },
          select: { id: true, status: true },
        },
        liveRooms: {
          where: { isLive: true, endedAt: null },
          select: { id: true, title: true, isLive: true },
          take: 1,
        },
        _count: {
          select: { students: true, requests: true, liveRooms: true },
        },
      },
    });

    return NextResponse.json({
      courses: courses.map(c => ({
        id: c.id,
        title: c.title,
        code: c.code,
        description: c.description,
        logoUrl: c.logoUrl,
        accessMode: c.accessMode,
        teacherId: c.teacherId,
        teacher: c.teacher,
        studentCount: c._count.students,
        requestCount: c._count.requests,
        liveRoomCount: c._count.liveRooms,
        activeLiveRoom: c.liveRooms.length > 0 ? c.liveRooms[0] : null,
        isEnrolled: c.students.length > 0 || c.teacherId === session.userId,
        hasPendingRequest: c.requests.length > 0,
      })),
    });
  } catch (error) {
    console.error("[GET /api/courses]", error);
    return NextResponse.json({ error: 'Failed to load courses' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const session = await verifyToken(token);
    if (!session || (session.role !== 'TEACHER' && session.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Forbidden: Only teachers can create courses' }, { status: 403 });
    }

    const body = await request.json();
    const { title, code, description, logoUrl, accessMode } = body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'Course title is required' }, { status: 400 });
    }

    const generatedCode = code && typeof code === 'string' && code.trim()
      ? code.trim().toUpperCase()
      : `CRS-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    const existingCode = await prisma.course.findUnique({
      where: { code: generatedCode },
    });
    if (existingCode) {
      return NextResponse.json({ error: 'A course with this code already exists' }, { status: 400 });
    }

    const course = await prisma.course.create({
      data: {
        title: title.trim(),
        code: generatedCode,
        description: description?.trim() || null,
        logoUrl: logoUrl?.trim() || null,
        accessMode: accessMode === 'PERMISSION_REQUIRED' ? 'PERMISSION_REQUIRED' : 'PUBLIC',
        teacherId: session.userId,
      },
      include: {
        teacher: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });

    return NextResponse.json({ course }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/courses]", error);
    return NextResponse.json({ error: 'Failed to create course' }, { status: 500 });
  }
}
