import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { notifyUser } from '@/app/api/notifications/stream/route';
import {
  hasPassed,
  letterGrade,
  round2,
  scorePct,
  stripAnswerKey,
  totalAwarded,
  type ExamQuestion,
  type GradebookRow,
  type GradebookSummary,
  type StudentAnswer,
  type SubmissionRow,
  type ViolationEvent,
} from '@/lib/exams';

/**
 * The student's own scorecard.
 *
 * A paper the teacher hasn't released yet appears as "Awaiting Review" with no
 * score, no marked answers and no prompts — handing back a graded answer array
 * early would expose the key to anyone still sitting the paper.
 */
async function studentGradebook(studentId: string) {
  const submissions = await prisma.submission.findMany({
    where: { studentId, status: { not: 'IN_PROGRESS' } },
    orderBy: [{ submittedAt: 'desc' }],
    select: {
      id: true,
      examId: true,
      status: true,
      submittedAt: true,
      gradedAt: true,
      score: true,
      maxScore: true,
      feedback: true,
      answers: true,
      exam: {
        select: {
          title: true,
          type: true,
          passingPct: true,
          questions: true,
          course: { select: { title: true } },
          teacher: { select: { name: true } },
        },
      },
    },
  });

  const rows: GradebookRow[] = submissions.map(sub => {
    const released = sub.status === 'GRADED';
    const answers = (sub.answers as unknown as StudentAnswer[]) ?? [];
    const questions = (sub.exam.questions as unknown as ExamQuestion[]) ?? [];

    return {
      submissionId: sub.id,
      examId: sub.examId,
      examTitle: sub.exam.title,
      type: sub.exam.type,
      courseTitle: sub.exam.course?.title ?? null,
      teacherName: sub.exam.teacher?.name ?? null,
      status: sub.status,
      submittedAt: sub.submittedAt ? sub.submittedAt.toISOString() : null,
      gradedAt: sub.gradedAt ? sub.gradedAt.toISOString() : null,
      score: released ? sub.score : null,
      maxScore: sub.maxScore,
      passingPct: sub.exam.passingPct,
      feedback: released ? sub.feedback : null,
      answers: released && Array.isArray(answers) ? answers : [],
      questions: released && Array.isArray(questions) ? stripAnswerKey(questions) : [],
    };
  });

  const graded = rows.filter(r => r.status === 'GRADED' && r.score !== null);
  const passedCount = graded.filter(r =>
    hasPassed(r.score ?? 0, r.maxScore, r.passingPct)
  ).length;

  // Averaged over percentages rather than raw points, so a 10-point quiz and a
  // 100-point final weigh the same.
  const averagePct = graded.length
    ? Math.round(
        graded.reduce((sum, r) => sum + scorePct(r.score ?? 0, r.maxScore), 0) / graded.length
      )
    : 0;

  const summary: GradebookSummary = {
    averagePct,
    letter: graded.length ? letterGrade(averagePct) : '—',
    totalTaken: rows.length,
    gradedCount: graded.length,
    pendingCount: rows.filter(r => r.status === 'SUBMITTED').length,
    passedCount,
    failedCount: graded.length - passedCount,
  };

  return NextResponse.json({ grades: rows, summary });
}

/**
 * Phase 5 — the grading suite.
 *
 * GET   /api/grading?examId=&flagged=  -> teachers: submissions awaiting or
 *                                         holding a grade
 *                                      -> students: their own gradebook
 * PATCH /api/grading                   -> award essay points, leave feedback,
 *                                         optionally release the grade
 *
 * Teachers only ever see submissions on papers they authored; students only
 * ever see their own, and only once the grade has been released.
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const session = await verifyToken(token);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // The same resource read from the other side of the desk.
    if (session.role === 'STUDENT') return studentGradebook(session.userId);

    if (session.role !== 'TEACHER' && session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const examId = searchParams.get('examId');
    const flaggedOnly = searchParams.get('flagged') === 'true';
    const status = searchParams.get('status');

    const submissions = await prisma.submission.findMany({
      where: {
        // An in-progress attempt has nothing to grade yet.
        status: status === 'SUBMITTED' || status === 'GRADED' ? status : { not: 'IN_PROGRESS' },
        ...(flaggedOnly ? { isFlagged: true } : {}),
        ...(examId ? { examId } : {}),
        exam: session.role === 'ADMIN' ? {} : { teacherId: session.userId },
      },
      orderBy: [{ submittedAt: 'desc' }],
      select: {
        id: true,
        examId: true,
        studentId: true,
        status: true,
        submittedAt: true,
        gradedAt: true,
        autoScore: true,
        score: true,
        maxScore: true,
        tabSwitches: true,
        isFlagged: true,
        violations: true,
        feedback: true,
        answers: true,
        exam: {
          select: {
            title: true,
            passingPct: true,
            maxTabSwitches: true,
            questions: true,
            course: { select: { title: true } },
          },
        },
        student: { select: { name: true, email: true, avatarUrl: true } },
      },
    });

    const rows: SubmissionRow[] = submissions.map(sub => {
      const answers = (sub.answers as unknown as StudentAnswer[]) ?? [];
      const questions = (sub.exam.questions as unknown as ExamQuestion[]) ?? [];
      const violations = (sub.violations as unknown as ViolationEvent[]) ?? [];
      const safeAnswers = Array.isArray(answers) ? answers : [];

      return {
        id: sub.id,
        examId: sub.examId,
        examTitle: sub.exam.title,
        courseTitle: sub.exam.course?.title ?? null,
        studentId: sub.studentId,
        studentName: sub.student.name,
        studentEmail: sub.student.email,
        avatarUrl: sub.student.avatarUrl,
        status: sub.status,
        submittedAt: sub.submittedAt ? sub.submittedAt.toISOString() : null,
        gradedAt: sub.gradedAt ? sub.gradedAt.toISOString() : null,
        autoScore: sub.autoScore,
        score: sub.score,
        maxScore: sub.maxScore,
        passingPct: sub.exam.passingPct,
        tabSwitches: sub.tabSwitches,
        maxTabSwitches: sub.exam.maxTabSwitches,
        isFlagged: sub.isFlagged,
        violations: Array.isArray(violations) ? violations : [],
        feedback: sub.feedback,
        questions: Array.isArray(questions) ? questions : [],
        answers: safeAnswers,
        // Essays still sitting at zero with no remark — the teacher's queue.
        pendingManualCount: safeAnswers.filter(a => !a.autoGraded && a.feedback === null).length,
      };
    });

    return NextResponse.json({
      submissions: rows,
      summary: {
        total: rows.length,
        awaitingReview: rows.filter(r => r.status === 'SUBMITTED').length,
        graded: rows.filter(r => r.status === 'GRADED').length,
        flagged: rows.filter(r => r.isFlagged).length,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load submissions' }, { status: 500 });
  }
}

/**
 * Award manual points and, when `release` is set, publish the grade.
 *
 * Manual awards are additive on top of the engine's auto-score: the final
 * figure is always `Σ(pointsAwarded)` recomputed from the answer array, so
 * re-releasing a grade can't double-count anything.
 */
export async function PATCH(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const session = await verifyToken(token);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.role !== 'TEACHER' && session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { submissionId, awards, feedback, release, clearFlag } = body ?? {};

    if (!submissionId || typeof submissionId !== 'string') {
      return NextResponse.json({ error: 'A submission id is required.' }, { status: 400 });
    }

    const submission = await prisma.submission.findFirst({
      where: {
        id: submissionId,
        exam: session.role === 'ADMIN' ? {} : { teacherId: session.userId },
      },
      select: {
        id: true,
        status: true,
        answers: true,
        autoScore: true,
        maxScore: true,
        isFlagged: true,
        studentId: true,
        exam: { select: { id: true, title: true, passingPct: true } },
      },
    });

    if (!submission) {
      return NextResponse.json(
        { error: 'Submission not found, or it is not on one of your papers.' },
        { status: 404 }
      );
    }
    if (submission.status === 'IN_PROGRESS') {
      return NextResponse.json(
        { error: 'This attempt has not been submitted yet.' },
        { status: 409 }
      );
    }

    const answers = (submission.answers as unknown as StudentAnswer[]) ?? [];
    const current = Array.isArray(answers) ? answers : [];

    // `awards` is a map of questionId -> { points, feedback }.
    const awardMap = new Map<string, { points?: unknown; feedback?: unknown }>(
      awards && typeof awards === 'object' && !Array.isArray(awards)
        ? Object.entries(awards as Record<string, { points?: unknown; feedback?: unknown }>)
        : []
    );

    const updatedAnswers: StudentAnswer[] = current.map(answer => {
      const award = awardMap.get(answer.questionId);
      if (!award) return answer;

      // Auto-graded questions are the engine's call; a teacher overriding an
      // MCQ mark would desync `autoScore` from the answer array.
      if (answer.autoGraded) return answer;

      const raw = Number(award.points);
      const points = Number.isFinite(raw)
        ? round2(Math.min(Math.max(raw, 0), answer.maxPoints))
        : answer.pointsAwarded;

      return {
        ...answer,
        pointsAwarded: points,
        feedback:
          typeof award.feedback === 'string'
            ? award.feedback.trim().slice(0, 2_000) || null
            : answer.feedback,
      };
    });

    const finalScore = totalAwarded(updatedAnswers);
    const shouldRelease = release === true;
    const now = new Date();

    const updated = await prisma.submission.update({
      where: { id: submission.id },
      data: {
        answers: updatedAnswers as unknown as object[],
        feedback:
          typeof feedback === 'string' ? feedback.trim().slice(0, 5_000) || null : undefined,
        // A score stays invisible to the student until it is released.
        score: shouldRelease ? finalScore : null,
        status: shouldRelease ? 'GRADED' : 'SUBMITTED',
        gradedAt: shouldRelease ? now : null,
        ...(clearFlag === true ? { isFlagged: false } : {}),
      },
      select: {
        id: true,
        status: true,
        score: true,
        maxScore: true,
        gradedAt: true,
        isFlagged: true,
        feedback: true,
      },
    });

    if (shouldRelease) {
      const pct = scorePct(finalScore, submission.maxScore);
      const passed = hasPassed(finalScore, submission.maxScore, submission.exam.passingPct);

      const notification = {
        type: 'GRADE_RELEASED' as const,
        title: 'Your Grade Is Ready',
        message: `"${submission.exam.title}" has been graded: ${finalScore}/${
          submission.maxScore
        } (${pct}%) — ${passed ? 'Passed' : 'Did not pass'}.`,
      };

      await prisma.notification.create({
        data: { userId: submission.studentId, ...notification },
      });

      notifyUser(submission.studentId, { ...notification, createdAt: now.toISOString() });
    }

    return NextResponse.json({
      submission: {
        id: updated.id,
        status: updated.status,
        score: updated.score,
        maxScore: updated.maxScore,
        gradedAt: updated.gradedAt ? updated.gradedAt.toISOString() : null,
        isFlagged: updated.isFlagged,
        feedback: updated.feedback,
      },
      answers: updatedAnswers,
      released: shouldRelease,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save the grade' }, { status: 500 });
  }
}
