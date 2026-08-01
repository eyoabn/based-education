import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import type { CalendarEvent } from '@/lib/calendar';

/**
 * Phase 4 — scheduling.
 *
 * GET  /api/schedules?from=<iso>&to=<iso>  -> calendar events in range
 * POST /api/schedules                      -> teacher creates a scheduled class
 *
 * GET returns live classes for everyone, plus exam and assignment deadlines
 * for students, so one request populates the whole student calendar.
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const session = await verifyToken(token);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);

    // Default window: one month back through three months ahead — enough for
    // the month grid to page around without refetching constantly.
    const now = new Date();
    const from = searchParams.get('from')
      ? new Date(searchParams.get('from') as string)
      : new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const to = searchParams.get('to')
      ? new Date(searchParams.get('to') as string)
      : new Date(now.getFullYear(), now.getMonth() + 3, 0);

    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      return NextResponse.json({ error: 'Invalid date range' }, { status: 400 });
    }

    const isTeacher = session.role === 'TEACHER';

    // Courses the viewer is enrolled in (students) — used to scope deadlines.
    const enrolledCourseIds = isTeacher
      ? []
      : (
          await prisma.course.findMany({
            where: { students: { some: { id: session.userId } } },
            select: { id: true },
          })
        ).map(c => c.id);

    const rooms = await prisma.liveRoom.findMany({
      where: {
        scheduledAt: { gte: from, lte: to },
        ...(isTeacher
          ? { teacherId: session.userId }
          : {
              // A student sees classes for their courses, plus any
              // unassigned (open) class.
              OR: [{ courseId: { in: enrolledCourseIds } }, { courseId: null }],
            }),
      },
      orderBy: { scheduledAt: 'asc' },
      select: {
        id: true,
        title: true,
        description: true,
        scheduledAt: true,
        endsAt: true,
        isLive: true,
        course: { select: { title: true } },
        teacher: { select: { name: true } },
      },
    });

    const events: CalendarEvent[] = rooms.map(room => ({
      id: room.id,
      type: 'LIVE_CLASS',
      title: room.title,
      description: room.description,
      startsAt: room.scheduledAt.toISOString(),
      endsAt: room.endsAt ? room.endsAt.toISOString() : null,
      courseTitle: room.course?.title ?? null,
      teacherName: room.teacher?.name ?? null,
      roomId: room.id,
      isLive: room.isLive,
    }));

    // Students also get their exam and assignment deadlines on the same grid.
    if (!isTeacher) {
      const [exams, assignments] = await Promise.all([
        prisma.exam.findMany({
          where: {
            dueAt: { gte: from, lte: to },
            OR: [{ courseId: { in: enrolledCourseIds } }, { courseId: null }],
          },
          select: {
            id: true,
            title: true,
            dueAt: true,
            durationMins: true,
            course: { select: { title: true } },
          },
        }),
        prisma.assignment.findMany({
          where: {
            dueAt: { gte: from, lte: to },
            OR: [{ courseId: { in: enrolledCourseIds } }, { courseId: null }],
          },
          select: {
            id: true,
            title: true,
            description: true,
            dueAt: true,
            course: { select: { title: true } },
            teacher: { select: { name: true } },
          },
        }),
      ]);

      for (const exam of exams) {
        if (!exam.dueAt) continue;
        events.push({
          id: `exam-${exam.id}`,
          type: 'EXAM',
          title: exam.title,
          description: `${exam.durationMins} minute exam`,
          startsAt: exam.dueAt.toISOString(),
          endsAt: null,
          courseTitle: exam.course?.title ?? null,
          teacherName: null,
          roomId: null,
          isLive: false,
        });
      }

      for (const assignment of assignments) {
        events.push({
          id: `assignment-${assignment.id}`,
          type: 'ASSIGNMENT',
          title: assignment.title,
          description: assignment.description,
          startsAt: assignment.dueAt.toISOString(),
          endsAt: null,
          courseTitle: assignment.course?.title ?? null,
          teacherName: assignment.teacher?.name ?? null,
          roomId: null,
          isLive: false,
        });
      }
    }

    events.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

    return NextResponse.json({ events });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load schedule' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const session = await verifyToken(token);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (session.teacherStatus === 'PENDING') {
      return NextResponse.json(
        { error: 'Your teacher account is still awaiting approval.' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { title, description, startsAt, endsAt, courseId } = body ?? {};

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'A class title is required.' }, { status: 400 });
    }
    if (!startsAt) {
      return NextResponse.json({ error: 'A start date and time is required.' }, { status: 400 });
    }

    const start = new Date(startsAt);
    const end = endsAt ? new Date(endsAt) : null;

    if (Number.isNaN(start.getTime())) {
      return NextResponse.json({ error: 'Invalid start time.' }, { status: 400 });
    }
    if (end && Number.isNaN(end.getTime())) {
      return NextResponse.json({ error: 'Invalid end time.' }, { status: 400 });
    }
    if (end && end <= start) {
      return NextResponse.json({ error: 'End time must be after the start time.' }, { status: 400 });
    }

    // Verify course ownership before targeting its students.
    let course: { id: string; title: string; students: { id: string }[] } | null = null;
    if (courseId) {
      course = await prisma.course.findFirst({
        where: { id: courseId, teacherId: session.userId },
        select: { id: true, title: true, students: { select: { id: true } } },
      });
      if (!course) {
        return NextResponse.json(
          { error: 'Course not found, or you do not teach it.' },
          { status: 404 }
        );
      }
    }

    const room = await prisma.liveRoom.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        teacherId: session.userId,
        scheduledAt: start,
        endsAt: end,
        courseId: course?.id ?? null,
        isLive: false,
      },
      select: {
        id: true,
        title: true,
        description: true,
        scheduledAt: true,
        endsAt: true,
        isLive: true,
        course: { select: { title: true } },
        teacher: { select: { name: true } },
      },
    });

    // Fan out notifications to the targeted cohort. Falls back to every
    // student when the class isn't tied to a specific course.
    const recipientIds = course
      ? course.students.map(s => s.id)
      : (
          await prisma.user.findMany({
            where: { role: 'STUDENT' },
            select: { id: true },
          })
        ).map(u => u.id);

    if (recipientIds.length > 0) {
      const whenLabel = start.toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC',
      });

      await prisma.notification.createMany({
        data: recipientIds.map(userId => ({
          userId,
          type: 'CLASS_SCHEDULED' as const,
          title: 'New Live Class Scheduled',
          message: `"${room.title}" is scheduled for ${whenLabel} UTC${
            course ? ` in ${course.title}` : ''
          }.`,
        })),
      });
    }

    const event: CalendarEvent = {
      id: room.id,
      type: 'LIVE_CLASS',
      title: room.title,
      description: room.description,
      startsAt: room.scheduledAt.toISOString(),
      endsAt: room.endsAt ? room.endsAt.toISOString() : null,
      courseTitle: room.course?.title ?? null,
      teacherName: room.teacher?.name ?? null,
      roomId: room.id,
      isLive: room.isLive,
    };

    return NextResponse.json({ event, notifiedCount: recipientIds.length }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to schedule the class' }, { status: 500 });
  }
}
