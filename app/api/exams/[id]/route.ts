import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import {
  deadlineFor,
  randomizePaper,
  stripAnswerKey,
  type ExamDetail,
  type ExamQuestion,
} from '@/lib/exams';

/**
 * Phase 5 — a single assessment.
 *
 * GET    /api/exams/[id]  -> the paper. Students get it with the answer key
 *                            stripped and the order shuffled; teachers get
 *                            the full paper including the key.
 * POST   /api/exams/[id]  -> `{ action: 'start' }` opens the attempt and
 *                            anchors the server-side clock.
 * DELETE /api/exams/[id]  -> the author withdraws the paper.
 */

/** Students may only reach published papers targeted at their courses. */
async function studentCanAccess(studentId: string, courseId: string | null): Promise<boolean> {
  if (!courseId) return true; // open assessment
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

    const config = {
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
    if (!(await studentCanAccess(session.userId, exam.courseId))) {
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
    const paper = exam.randomizeOrder
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
        attempt && attempt.status === 'IN_PROGRESS'
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
        durationMins: true,
        isPublished: true,
        courseId: true,
        totalPoints: true,
        dueAt: true,
      },
    });

    if (!exam) return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    if (!exam.isPublished) {
      return NextResponse.json({ error: 'This assessment is not available yet.' }, { status: 403 });
    }
    if (!(await studentCanAccess(session.userId, exam.courseId))) {
      return NextResponse.json(
        { error: 'You are not enrolled in the course this assessment belongs to.' },
        { status: 403 }
      );
    }

    const existing = await prisma.submission.findUnique({
      where: { examId_studentId: { examId: exam.id, studentId: session.userId } },
      select: { id: true, status: true, startedAt: true },
    });

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
        deadline: deadlineFor(existing.startedAt, exam.durationMins).toISOString(),
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
        deadline: deadlineFor(startedAt, exam.durationMins).toISOString(),
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
    if (session.role !== 'TEACHER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const exam = await prisma.exam.findFirst({
      where: { id, teacherId: session.userId },
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
