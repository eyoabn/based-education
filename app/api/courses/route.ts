import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

/**
 * Phase 4 support route — populates the "Target Course" picker in
 * ScheduleModal. Teachers get the courses they teach; students get the
 * courses they're enrolled in.
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const session = await verifyToken(token);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const courses = await prisma.course.findMany({
      where:
        session.role === 'TEACHER'
          ? { teacherId: session.userId }
          : session.role === 'ADMIN'
            ? {}
            : { students: { some: { id: session.userId } } },
      orderBy: { title: 'asc' },
      select: {
        id: true,
        title: true,
        code: true,
        _count: { select: { students: true } },
      },
    });

    return NextResponse.json({
      courses: courses.map(c => ({
        id: c.id,
        title: c.title,
        code: c.code,
        studentCount: c._count.students,
      })),
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load courses' }, { status: 500 });
  }
}
