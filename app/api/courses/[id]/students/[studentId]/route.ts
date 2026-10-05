import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; studentId: string }> }
) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const session = await verifyToken(token);
    if (!session || (session.role !== 'TEACHER' && session.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: courseId, studentId } = await params;

    const course = await prisma.course.findUnique({
      where: { id: courseId }
    });

    if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    if (session.role !== 'ADMIN' && course.teacherId !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Disconnect the student from the course
    await prisma.course.update({
      where: { id: courseId },
      data: {
        students: {
          disconnect: { id: studentId }
        }
      }
    });

    // Also remove any pending join requests if they exist
    await prisma.courseEnrollmentRequest.deleteMany({
      where: { courseId, studentId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/courses/[id]/students/[studentId]]", error);
    return NextResponse.json({ error: 'Failed to remove student' }, { status: 500 });
  }
}
