import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import {
  deadlineFor,
  randomizePaper,
  stripAnswerKey,
  totalPointsOf,
  normalizeQuestions,
  type ExamDetail,
  type ExamQuestion,
} from '@/lib/exams';
import { notifyUser } from '@/app/api/notifications/stream/route';

/**
 * Phase 5 — a single assessment.
 *
 * GET    /api/exams/[id]  -> the paper. Students get it with the answer key
 *                            stripped and the order shuffled; teachers get
 *                            the full paper including the key.
 * POST   /api/exams/[id]  -> `{ action: 'start' }` opens the attempt and
 *                            anchors the server-side clock.
 * PATCH  /api/exams/[id]  -> update draft or published assessment.
 * DELETE /api/exams/[id]  -> the author withdraws the paper.
 */

/** Students may only reach published papers targeted at their courses or their teachers. */
async function studentCanAccess(studentId: string, courseId: string | null, teacherId?: string | null): Promise<boolean> {
  if (!courseId) {
    if (!teacherId) return true;
    const course = await prisma.course.findFirst({
      where: { teacherId, students: { some: { id: studentId } } },
      select: { id: true },
    });
    return course !== null;
  }
  const course = await prisma.course.findFirst({
    where: { id: courseId, students: { some: { id: studentId } } },
    select: { id: true },
  });
  return course !== null;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const session = await verifyToken(token);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const exam = await prisma.exam.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        type: true,
        durationMins: true,
        totalPoints: true,
        passingPct: true,
        dueAt: true,
        isPublished: true,
        courseId: true,
        teacherId: true,
        questions: true,
        forceFullscreen: true,
        trackTabSwitches: true,
        maxTabSwitches: true,
        blockCopyPaste: true,
        randomizeOrder: true,
        course: { select: { title: true } },
        teacher: { select: { name: true } },
      },
    });

    if (!exam) return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });

    const questions = (exam.questions as unknown as ExamQuestion[]) ?? [];

    const isAssignment = exam.type === 'ASSIGNMENT';
    const config = isAssignment ? {
      forceFullscreen: false,
      trackTabSwitches: false,
      maxTabSwitches: 0,
      blockCopyPaste: false,
      randomizeOrder: false,
    } : {
      forceFullscreen: exam.forceFullscreen,
      trackTabSwitches: exam.trackTabSwitches,
      maxTabSwitches: exam.maxTabSwitches,
      blockCopyPaste: exam.blockCopyPaste,
      randomizeOrder: exam.randomizeOrder,
    };

    // --- Teacher / admin: full paper, answer key included ------------------
    if (session.role === 'TEACHER' || session.role === 'ADMIN') {
      if (session.role === 'TEACHER' && exam.teacherId && exam.teacherId !== session.userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      return NextResponse.json({
        exam: {
          id: exam.id,
          title: exam.title,
          description: exam.description,
          type: exam.type,
          durationMins: exam.durationMins,
          totalPoints: exam.totalPoints,
          passingPct: exam.passingPct,
          dueAt: exam.dueAt ? exam.dueAt.toISOString() : null,
          isPublished: exam.isPublished,
          courseTitle: exam.course?.title ?? null,
          teacherName: exam.teacher?.name ?? null,
          config,
          questions,
        },
      });
    }

    // --- Student: locked-down paper ---------------------------------------
    if (!exam.isPublished) {
      return NextResponse.json({ error: 'This assessment is not available yet.' }, { status: 403 });
    }
    if (!(await studentCanAccess(session.userId, exam.courseId, exam.teacherId))) {
      return NextResponse.json(
        { error: 'You are not enrolled in the course this assessment belongs to.' },
        { status: 403 }
      );
    }

    const attempt = await prisma.submission.findUnique({
      where: { examId_studentId: { examId: exam.id, studentId: session.userId } },
      select: {
        status: true,
        startedAt: true,
        submittedAt: true,
        score: true,
        maxScore: true,
        tabSwitches: true,
      },
    });

    // Strip the key, then shuffle deterministically so a mid-exam reload
    // returns the same order this student already had in front of them.
    const safeQuestions = stripAnswerKey(questions);
    const paper = (!isAssignment && exam.randomizeOrder)
      ? randomizePaper(safeQuestions, `${exam.id}:${session.userId}`)
      : safeQuestions;

    const detail: ExamDetail = {
      id: exam.id,
      title: exam.title,
      description: exam.description,
      type: exam.type,
      durationMins: exam.durationMins,
      totalPoints: exam.totalPoints,
      passingPct: exam.passingPct,
      dueAt: exam.dueAt ? exam.dueAt.toISOString() : null,
      courseTitle: exam.course?.title ?? null,
      teacherName: exam.teacher?.name ?? null,
      config,
      // Questions are handed out only while an attempt is genuinely open.
      // Before "Start" the student gets metadata alone — otherwise they could
      // pull the paper, never start the clock, and submit at their leisure.
      questions: attempt?.status === 'IN_PROGRESS' ? paper : [],
      attempt: attempt
        ? {
            status: attempt.status,
            startedAt: attempt.startedAt.toISOString(),
            submittedAt: attempt.submittedAt ? attempt.submittedAt.toISOString() : null,
            score: attempt.status === 'GRADED' ? attempt.score : null,
            maxScore: attempt.maxScore,
            tabSwitches: attempt.tabSwitches,
          }
        : null,
      deadline:
        attempt && attempt.status === 'IN_PROGRESS' && !isAssignment && exam.durationMins > 0
          ? deadlineFor(attempt.startedAt, exam.durationMins).toISOString()
          : null,
    };

    return NextResponse.json({ exam: detail });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load the assessment' }, { status: 500 });
  }
}

/**
 * Open an attempt. The clock starts here, on the server — the countdown the
 * student sees is only a mirror of `startedAt + durationMins`, so editing it
 * in the browser buys no extra time.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const session = await verifyToken(token);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Only students can sit an exam.' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    if (body?.action !== 'start') {
      return NextResponse.json({ error: 'Unsupported action.' }, { status: 400 });
    }

    const exam = await prisma.exam.findUnique({
      where: { id },
      select: {
        id: true,
        type: true,
        durationMins: true,
        isPublished: true,
        courseId: true,
        teacherId: true,
        totalPoints: true,
        dueAt: true,
      },
    });

    if (!exam) return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    if (!exam.isPublished) {
      return NextResponse.json({ error: 'This assessment is not available yet.' }, { status: 403 });
    }
    if (!(await studentCanAccess(session.userId, exam.courseId, exam.teacherId))) {
      return NextResponse.json(
        { error: 'You are not enrolled in the course this assessment belongs to.' },
        { status: 403 }
      );
    }

    const existing = await prisma.submission.findUnique({
      where: { examId_studentId: { examId: exam.id, studentId: session.userId } },
      select: { id: true, status: true, startedAt: true },
    });

    const isAssignment = exam.type === 'ASSIGNMENT';

    // One attempt per student — a resumed attempt keeps its original clock.
    if (existing) {
      if (existing.status !== 'IN_PROGRESS') {
        return NextResponse.json(
          { error: 'You have already submitted this assessment.' },
          { status: 409 }
        );
      }

      return NextResponse.json({
        startedAt: existing.startedAt.toISOString(),
        deadline: !isAssignment && exam.durationMins > 0 ? deadlineFor(existing.startedAt, exam.durationMins).toISOString() : null,
        resumed: true,
      });
    }

    const startedAt = new Date();
    await prisma.submission.create({
      data: {
        examId: exam.id,
        studentId: session.userId,
        status: 'IN_PROGRESS',
        startedAt,
        maxScore: exam.totalPoints,
      },
    });

    return NextResponse.json(
      {
        startedAt: startedAt.toISOString(),
        deadline: !isAssignment && exam.durationMins > 0 ? deadlineFor(startedAt, exam.durationMins).toISOString() : null,
        resumed: false,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json({ error: 'Could not start the assessment' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const session = await verifyToken(token);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.role !== 'TEACHER' && session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const exam = await prisma.exam.findFirst({
      where: session.role === 'ADMIN' ? { id } : { id, teacherId: session.userId },
      select: { id: true },
    });
    if (!exam) {
      return NextResponse.json({ error: 'Assessment not found, or not yours.' }, { status: 404 });
    }

    // Submissions cascade — withdrawing a paper takes its attempts with it.
    await prisma.exam.delete({ where: { id: exam.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete the assessment' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const session = await verifyToken(token);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.role !== 'TEACHER' && session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const existing = await prisma.exam.findFirst({
      where: session.role === 'ADMIN' ? { id } : { id, teacherId: session.userId },
      include: { course: { include: { students: { select: { id: true } } } } },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Assessment not found, or not yours.' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const {
      title,
      description,
      courseId,
      type,
      durationMins,
      passingPct,
      dueAt,
      questions: rawQuestions,
      forceFullscreen,
      trackTabSwitches,
      maxTabSwitches,
      blockCopyPaste,
      randomizeOrder,
      isPublished,
    } = body ?? {};

    const targetType = type ?? existing.type;
    const assessmentType = targetType === 'ASSIGNMENT' ? 'ASSIGNMENT' : 'EXAM';
    const willPublish = isPublished !== undefined ? isPublished === true : existing.isPublished;

    let duration = 0;
    if (assessmentType === 'EXAM') {
      const rawDur = durationMins !== undefined ? Number(durationMins) : existing.durationMins;
      if (willPublish && (!Number.isFinite(rawDur) || rawDur < 1 || rawDur > 600)) {
        return NextResponse.json(
          { error: 'Exam duration must be between 1 and 600 minutes.' },
          { status: 400 }
        );
      }
      duration = Number.isFinite(rawDur) && rawDur > 0 ? rawDur : 45;
    } else {
      duration = 0;
    }

    let due: Date | null = existing.dueAt;
    if (dueAt !== undefined) {
      if (dueAt) {
        due = new Date(dueAt);
        if (Number.isNaN(due.getTime())) {
          return NextResponse.json({ error: 'Invalid due date.' }, { status: 400 });
        }
      } else {
        due = null;
      }
    }

    let questions = existing.questions as unknown as ExamQuestion[];
    if (rawQuestions !== undefined) {
      const normalized = normalizeQuestions(rawQuestions, !willPublish);
      if (normalized.error !== null) {
        return NextResponse.json({ error: normalized.error }, { status: 400 });
      }
      questions = normalized.questions;
    }

    let course = existing.course;
    if (courseId !== undefined && courseId !== existing.courseId) {
      if (courseId) {
        course = await prisma.course.findFirst({
          where: { id: courseId, teacherId: session.userId },
          include: { students: { select: { id: true } } },
        });
        if (!course) {
          return NextResponse.json(
            { error: 'Course not found, or you do not teach it.' },
            { status: 404 }
          );
        }
      } else {
        course = null;
      }
    }

    const switchBudget = maxTabSwitches !== undefined ? Number(maxTabSwitches) : existing.maxTabSwitches;

    const updated = await prisma.exam.update({
      where: { id: existing.id },
      data: {
        ...(title && typeof title === 'string' && { title: title.trim() }),
        ...(description !== undefined && {
          description: typeof description === 'string' && description.trim() ? description.trim() : null,
        }),
        type: assessmentType,
        courseId: courseId !== undefined ? (course?.id ?? null) : undefined,
        durationMins: Math.round(duration),
        ...(passingPct !== undefined && {
          passingPct: Number.isFinite(Number(passingPct)) ? Math.round(Number(passingPct)) : existing.passingPct,
        }),
        dueAt: due,
        ...(rawQuestions !== undefined && {
          totalPoints: totalPointsOf(questions),
          questions: questions as unknown as object[],
        }),
        isPublished: willPublish,
        forceFullscreen: assessmentType === 'ASSIGNMENT' ? false : (forceFullscreen !== undefined ? forceFullscreen !== false : existing.forceFullscreen),
        trackTabSwitches: assessmentType === 'ASSIGNMENT' ? false : (trackTabSwitches !== undefined ? trackTabSwitches !== false : existing.trackTabSwitches),
        maxTabSwitches: Number.isFinite(switchBudget) && switchBudget >= 0 ? Math.round(switchBudget) : 3,
        blockCopyPaste: assessmentType === 'ASSIGNMENT' ? false : (blockCopyPaste !== undefined ? blockCopyPaste !== false : existing.blockCopyPaste),
        randomizeOrder: assessmentType === 'ASSIGNMENT' ? false : (randomizeOrder !== undefined ? randomizeOrder !== false : existing.randomizeOrder),
      },
      select: {
        id: true,
        title: true,
        description: true,
        type: true,
        durationMins: true,
        totalPoints: true,
        passingPct: true,
        dueAt: true,
        isPublished: true,
        courseId: true,
        createdAt: true,
        course: { select: { title: true } },
      },
    });

    let notifiedCount = 0;
    if (willPublish && !existing.isPublished) {
      // Transitioning draft to published! Notify teacher's students
      let recipientIds: string[] = [];
      if (course) {
        recipientIds = course.students.map(s => s.id);
      } else {
        const teacherCourses = await prisma.course.findMany({
          where: { teacherId: session.userId },
          select: { students: { select: { id: true } } },
        });
        const idSet = new Set<string>();
        for (const c of teacherCourses) {
          for (const s of c.students) {
            idSet.add(s.id);
          }
        }
        recipientIds = Array.from(idSet);
      }

      if (recipientIds.length > 0) {
        const dueLabel = due
          ? ` Due ${due.toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'UTC',
            })} UTC.`
          : '';

        const notification = {
          type: 'EXAM_PUBLISHED' as const,
          title: assessmentType === 'EXAM' ? 'New Exam Published' : 'New Assignment Posted',
          message: `"${updated.title}" is now available${course ? ` in ${course.title}` : ''}.${dueLabel}`,
        };

        await prisma.notification.createMany({
          data: recipientIds.map(userId => ({ userId, ...notification })),
        });

        for (const userId of recipientIds) {
          notifyUser(userId, { ...notification, createdAt: new Date().toISOString() });
        }
        notifiedCount = recipientIds.length;
      }
    }

    return NextResponse.json({
      exam: {
        ...updated,
        courseTitle: updated.course?.title ?? null,
        dueAt: updated.dueAt ? updated.dueAt.toISOString() : null,
        createdAt: updated.createdAt.toISOString(),
      },
      notifiedCount,
    });
  } catch (error) {
    console.error('[PATCH /api/exams/[id]]', error);
    return NextResponse.json({ error: 'Failed to update assessment' }, { status: 500 });
  }
}
