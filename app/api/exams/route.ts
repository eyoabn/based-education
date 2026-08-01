import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { notifyUser } from '@/app/api/notifications/stream/route';
import {
  normalizeQuestions,
  totalPointsOf,
  type ExamQuestion,
  type ExamSummary,
} from '@/lib/exams';

/**
 * Phase 5 — assessments.
 *
 * GET  /api/exams  -> teachers see the papers they authored with submission
 *                     counts; students see published papers for their courses
 *                     alongside their own attempt state.
 * POST /api/exams  -> a teacher publishes a new exam or assignment.
 *
 * The answer key never leaves this route for a student — the list payload
 * carries counts and metadata only.
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const session = await verifyToken(token);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // --- Teacher view ------------------------------------------------------
    if (session.role === 'TEACHER' || session.role === 'ADMIN') {
      const exams = await prisma.exam.findMany({
        where: session.role === 'ADMIN' ? {} : { teacherId: session.userId },
        orderBy: { createdAt: 'desc' },
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
          questions: true,
          maxTabSwitches: true,
          course: { select: { title: true } },
          submissions: {
            select: { status: true, isFlagged: true },
          },
        },
      });

      const summaries: ExamSummary[] = exams.map(exam => {
        const questions = (exam.questions as unknown as ExamQuestion[]) ?? [];
        return {
          id: exam.id,
          title: exam.title,
          description: exam.description,
          type: exam.type,
          durationMins: exam.durationMins,
          totalPoints: exam.totalPoints,
          passingPct: exam.passingPct,
          questionCount: Array.isArray(questions) ? questions.length : 0,
          dueAt: exam.dueAt ? exam.dueAt.toISOString() : null,
          isPublished: exam.isPublished,
          courseId: exam.courseId,
          courseTitle: exam.course?.title ?? null,
          createdAt: exam.createdAt.toISOString(),
          submissionCount: exam.submissions.filter(s => s.status !== 'IN_PROGRESS').length,
          gradedCount: exam.submissions.filter(s => s.status === 'GRADED').length,
          flaggedCount: exam.submissions.filter(s => s.isFlagged).length,
        };
      });

      return NextResponse.json({ exams: summaries });
    }

    // --- Student view ------------------------------------------------------
    const enrolledCourseIds = (
      await prisma.course.findMany({
        where: { students: { some: { id: session.userId } } },
        select: { id: true },
      })
    ).map(c => c.id);

    const exams = await prisma.exam.findMany({
      where: {
        isPublished: true,
        OR: [{ courseId: { in: enrolledCourseIds } }, { courseId: null }],
      },
      orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
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
        questions: true,
        course: { select: { title: true } },
        // Only this student's attempt — never the cohort's.
        submissions: {
          where: { studentId: session.userId },
          select: {
            status: true,
            startedAt: true,
            submittedAt: true,
            score: true,
            maxScore: true,
            tabSwitches: true,
          },
        },
      },
    });

    const summaries: ExamSummary[] = exams.map(exam => {
      const questions = (exam.questions as unknown as ExamQuestion[]) ?? [];
      const attempt = exam.submissions[0];

      return {
        id: exam.id,
        title: exam.title,
        description: exam.description,
        type: exam.type,
        durationMins: exam.durationMins,
        totalPoints: exam.totalPoints,
        passingPct: exam.passingPct,
        questionCount: Array.isArray(questions) ? questions.length : 0,
        dueAt: exam.dueAt ? exam.dueAt.toISOString() : null,
        isPublished: exam.isPublished,
        courseId: exam.courseId,
        courseTitle: exam.course?.title ?? null,
        createdAt: exam.createdAt.toISOString(),
        attempt: attempt
          ? {
              status: attempt.status,
              startedAt: attempt.startedAt.toISOString(),
              submittedAt: attempt.submittedAt ? attempt.submittedAt.toISOString() : null,
              // A score is only visible once the teacher releases it.
              score: attempt.status === 'GRADED' ? attempt.score : null,
              maxScore: attempt.maxScore,
              tabSwitches: attempt.tabSwitches,
            }
          : null,
      };
    });

    return NextResponse.json({ exams: summaries });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load assessments' }, { status: 500 });
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
    const {
      title,
      description,
      courseId,
      durationMins,
      passingPct,
      dueAt,
      type,
      questions: rawQuestions,
      forceFullscreen,
      trackTabSwitches,
      maxTabSwitches,
      blockCopyPaste,
      randomizeOrder,
      isPublished,
    } = body ?? {};

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'Give the assessment a title.' }, { status: 400 });
    }

    const assessmentType = type === 'ASSIGNMENT' ? 'ASSIGNMENT' : 'EXAM';

    const duration = Number(durationMins);
    if (!Number.isFinite(duration) || duration < 1 || duration > 600) {
      return NextResponse.json(
        { error: 'Duration must be between 1 and 600 minutes.' },
        { status: 400 }
      );
    }

    const passing = Number(passingPct);
    if (!Number.isFinite(passing) || passing < 0 || passing > 100) {
      return NextResponse.json(
        { error: 'Passing score must be between 0 and 100.' },
        { status: 400 }
      );
    }

    let due: Date | null = null;
    if (dueAt) {
      due = new Date(dueAt);
      if (Number.isNaN(due.getTime())) {
        return NextResponse.json({ error: 'Invalid due date.' }, { status: 400 });
      }
    }

    // Never trust the client's question shape — normalise or reject.
    const normalized = normalizeQuestions(rawQuestions);
    if (normalized.error !== null) {
      return NextResponse.json({ error: normalized.error }, { status: 400 });
    }
    const questions = normalized.questions;

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

    const published = isPublished !== false;
    const switchBudget = Number(maxTabSwitches);

    const exam = await prisma.exam.create({
      data: {
        title: title.trim(),
        description: typeof description === 'string' && description.trim() ? description.trim() : null,
        type: assessmentType,
        teacherId: session.userId,
        courseId: course?.id ?? null,
        durationMins: Math.round(duration),
        passingPct: Math.round(passing),
        dueAt: due,
        totalPoints: totalPointsOf(questions),
        questions: questions as unknown as object[],
        isPublished: published,
        forceFullscreen: forceFullscreen !== false,
        trackTabSwitches: trackTabSwitches !== false,
        maxTabSwitches:
          Number.isFinite(switchBudget) && switchBudget >= 0 ? Math.round(switchBudget) : 3,
        blockCopyPaste: blockCopyPaste !== false,
        randomizeOrder: randomizeOrder !== false,
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

    // Announce it to the cohort. An unpublished draft stays silent.
    let notifiedCount = 0;
    if (published) {
      const recipientIds = course
        ? course.students.map(s => s.id)
        : (
            await prisma.user.findMany({ where: { role: 'STUDENT' }, select: { id: true } })
          ).map(u => u.id);

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
          message: `"${exam.title}" is now available${
            course ? ` in ${course.title}` : ''
          }.${dueLabel}`,
        };

        await prisma.notification.createMany({
          data: recipientIds.map(userId => ({ userId, ...notification })),
        });

        // Push over SSE so open dashboards update without a refresh.
        for (const userId of recipientIds) {
          notifyUser(userId, { ...notification, createdAt: new Date().toISOString() });
        }

        notifiedCount = recipientIds.length;
      }
    }

    const summary: ExamSummary = {
      id: exam.id,
      title: exam.title,
      description: exam.description,
      type: exam.type,
      durationMins: exam.durationMins,
      totalPoints: exam.totalPoints,
      passingPct: exam.passingPct,
      questionCount: questions.length,
      dueAt: exam.dueAt ? exam.dueAt.toISOString() : null,
      isPublished: exam.isPublished,
      courseId: exam.courseId,
      courseTitle: exam.course?.title ?? null,
      createdAt: exam.createdAt.toISOString(),
      submissionCount: 0,
      gradedCount: 0,
      flaggedCount: 0,
    };

    return NextResponse.json({ exam: summary, notifiedCount }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create the assessment' }, { status: 500 });
  }
}
