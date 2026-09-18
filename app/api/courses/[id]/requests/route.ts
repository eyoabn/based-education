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
      select: { teacherId: true, title: true },
    });

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    if (course.teacherId !== session.userId && session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: You do not manage this course' }, { status: 403 });
    }

    const requests = await prisma.courseEnrollmentRequest.findMany({
      where: { courseId, status: 'PENDING' },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ requests });
  } catch (error) {
    console.error("[GET /api/courses/[id]/requests]", error);
    return NextResponse.json({ error: 'Failed to fetch course join requests' }, { status: 500 });
  }
}

export async function PATCH(
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
    const body = await request.json();
    const { requestId, status } = body;

    if (!requestId || !['APPROVED', 'REJECTED'].includes(status)) {
      return NextResponse.json({ error: 'Valid requestId and status (APPROVED or REJECTED) are required' }, { status: 400 });
    }

    const joinRequest = await prisma.courseEnrollmentRequest.findUnique({
      where: { id: requestId },
      include: {
        course: { select: { id: true, title: true, teacherId: true } },
        student: { select: { id: true, name: true } },
      },
    });

    if (!joinRequest || joinRequest.courseId !== courseId) {
      return NextResponse.json({ error: 'Join request not found for this course' }, { status: 404 });
    }

    if (joinRequest.course.teacherId !== session.userId && session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: You do not manage this course' }, { status: 403 });
    }

    if (status === 'APPROVED') {
      await prisma.$transaction([
        prisma.courseEnrollmentRequest.update({
          where: { id: requestId },
          data: { status: 'APPROVED' },
        }),
        prisma.course.update({
          where: { id: courseId },
          data: {
            students: { connect: { id: joinRequest.studentId } },
          },
        }),
        prisma.notification.create({
          data: {
            userId: joinRequest.studentId,
            type: 'COURSE_JOIN_APPROVED',
            title: 'Course Join Request Approved!',
            message: `Your request to join "${joinRequest.course.title}" has been approved. You now have full access to the course content.`,
            link: '/dashboard/student/courses',
          },
        }),
      ]);
    } else {
      await prisma.$transaction([
        prisma.courseEnrollmentRequest.update({
          where: { id: requestId },
          data: { status: 'REJECTED' },
        }),
        prisma.notification.create({
          data: {
            userId: joinRequest.studentId,
            type: 'COURSE_JOIN_REJECTED',
            title: 'Course Join Request Declined',
            message: `Your request to join "${joinRequest.course.title}" was declined by the instructor.`,
            link: '/dashboard/student/courses',
          },
        }),
      ]);
    }

    return NextResponse.json({
      message: `Join request ${status.toLowerCase()} successfully.`,
      status,
    });
  } catch (error) {
    console.error("[PATCH /api/courses/[id]/requests]", error);
    return NextResponse.json({ error: 'Failed to update join request status' }, { status: 500 });
  }
}
