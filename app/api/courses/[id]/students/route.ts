import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const session = await verifyToken(token);
    if (!session || (session.role !== 'TEACHER' && session.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: courseId } = await params;

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        students: {
          select: { id: true, name: true, email: true, avatarUrl: true }
        }
      }
    });

    if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    if (session.role !== 'ADMIN' && course.teacherId !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ students: course.students });
  } catch (error) {
    console.error("[GET /api/courses/[id]/students]", error);
    return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 });
  }
}
