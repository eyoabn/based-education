import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const session = await verifyToken(token);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: courseId } = await params;

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        students: {
          where: { id: session.userId },
          select: { id: true },
        },
      },
    });

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    if (course.teacherId === session.userId) {
      return NextResponse.json({ error: 'You are the instructor of this course' }, { status: 400 });
    }

    if (course.students.length > 0) {
      return NextResponse.json({ error: 'You are already enrolled in this course', status: 'ENROLLED' });
    }

    if (course.accessMode === 'PUBLIC') {
      await prisma.course.update({
        where: { id: courseId },
        data: {
          students: { connect: { id: session.userId } },
        },
      });

      return NextResponse.json({
        message: 'Successfully enrolled in course!',
        status: 'ENROLLED',
      });
    }

    // Permission Required Flow
    const existingRequest = await prisma.courseEnrollmentRequest.findUnique({
      where: {
        courseId_studentId: {
          courseId,
          studentId: session.userId,
        },
      },
    });

    if (existingRequest && existingRequest.status === 'PENDING') {
      return NextResponse.json({
        message: 'Your join request is already pending approval by the instructor.',
        status: 'PENDING',
      });
    }

    const newRequest = await prisma.courseEnrollmentRequest.upsert({
      where: {
        courseId_studentId: {
          courseId,
          studentId: session.userId,
        },
      },
      update: { status: 'PENDING' },
      create: {
        courseId,
        studentId: session.userId,
        status: 'PENDING',
      },
    });

    // Notify the teacher about the new join request
    await prisma.notification.create({
      data: {
        userId: course.teacherId,
        type: 'COURSE_JOIN_REQUESTED',
        title: 'New Student Join Request',
        message: `${session.name} requested to join your course "${course.title}".`,
        link: '/dashboard/teacher',
      },
    });

    return NextResponse.json({
      message: 'Join request sent to instructor for approval.',
      status: 'PENDING',
      request: newRequest,
    });
  } catch (error) {
    console.error("[POST /api/courses/[id]/join]", error);
    return NextResponse.json({ error: 'Failed to process course join request' }, { status: 500 });
  }
}
