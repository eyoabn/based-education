import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { notifyUser } from '@/app/api/notifications/stream/route';
import {
  countsAgainstBudget,
  deadlineFor,
  gradeSubmission,
  SUBMIT_GRACE_SEC,
  type ExamQuestion,
  type StudentResponse,
  type ViolationEvent,
  type ViolationType,
} from '@/lib/exams';

/**
 * Phase 5 — POST /api/exams/[id]/submit
 *
 * Closes an attempt: auto-grades the closed-form questions, persists the
 * anti-cheat log, and pings the teacher.
 *
 * Everything the client sends is treated as a claim, not a fact. The score is
 * computed here from the stored answer key, the deadline is checked against
 * the server's `startedAt`, and the tab-switch count is reconciled against the
 * violation log rather than taken at face value.
 */

const VALID_VIOLATIONS: ViolationType[] = [
  'TAB_SWITCH',
  'WINDOW_BLUR',
  'FULLSCREEN_EXIT',
  'COPY',
  'PASTE',
  'CONTEXT_MENU',
  'DEVTOOLS',
  'LATE_SUBMIT',
];

/** Keeps one pathological session from writing an unbounded JSON blob. */
const MAX_VIOLATION_ENTRIES = 200;

function sanitizeViolations(raw: unknown): ViolationEvent[] {
  if (!Array.isArray(raw)) return [];

  const events: ViolationEvent[] = [];
  for (const item of raw.slice(0, MAX_VIOLATION_ENTRIES)) {
    if (!item || typeof item !== 'object') continue;
    const candidate = item as Partial<ViolationEvent>;
    if (!candidate.type || !VALID_VIOLATIONS.includes(candidate.type)) continue;

    const at = candidate.at ? new Date(candidate.at) : new Date();
    events.push({
      type: candidate.type,
      at: Number.isNaN(at.getTime()) ? new Date().toISOString() : at.toISOString(),
      detail:
        typeof candidate.detail === 'string' ? candidate.detail.slice(0, 200) : undefined,
    });
  }
  return events;
}

function sanitizeResponses(raw: unknown): StudentResponse[] {
  if (!Array.isArray(raw)) return [];

  const responses: StudentResponse[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const candidate = item as Partial<StudentResponse>;
    if (typeof candidate.questionId !== 'string' || !candidate.questionId) continue;

    responses.push({
      questionId: candidate.questionId,
      selectedOptionId:
        typeof candidate.selectedOptionId === 'string' ? candidate.selectedOptionId : null,
      // Essays are capped rather than rejected — losing a long answer to a
      // validation error would be worse than truncating it.
      text: typeof candidate.text === 'string' ? candidate.text.slice(0, 20_000) : null,
    });
  }
  return responses;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const session = await verifyToken(token);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Only students can submit an exam.' }, { status: 403 });
    }

    const exam = await prisma.exam.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        durationMins: true,
        maxTabSwitches: true,
        teacherId: true,
        questions: true,
        course: { select: { title: true } },
      },
    });
    if (!exam) return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });

    const attempt = await prisma.submission.findUnique({
      where: { examId_studentId: { examId: exam.id, studentId: session.userId } },
      select: { id: true, status: true, startedAt: true, violations: true },
    });

    // No open attempt means the paper was never legitimately started.
    if (!attempt) {
      return NextResponse.json(
        { error: 'Start the assessment before submitting it.' },
        { status: 409 }
      );
    }
    if (attempt.status !== 'IN_PROGRESS') {
      return NextResponse.json(
        { error: 'You have already submitted this assessment.' },
        { status: 409 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const responses = sanitizeResponses(body?.responses);
    const clientViolations = sanitizeViolations(body?.violations);

    // --- Deadline check, server-side --------------------------------------
    const now = new Date();
    const deadline = deadlineFor(attempt.startedAt, exam.durationMins);
    const isLate = now.getTime() > deadline.getTime() + SUBMIT_GRACE_SEC * 1000;

    // Merge with anything already logged (a resumed attempt keeps its history).
    const priorViolations = (attempt.violations as unknown as ViolationEvent[]) ?? [];
    const violations: ViolationEvent[] = [
      ...(Array.isArray(priorViolations) ? priorViolations : []),
      ...clientViolations,
    ].slice(-MAX_VIOLATION_ENTRIES);

    if (isLate) {
      violations.push({
        type: 'LATE_SUBMIT',
        at: now.toISOString(),
        detail: `Landed ${Math.round(
          (now.getTime() - deadline.getTime()) / 1000
        )}s after the deadline.`,
      });
    }

    // --- Anti-cheat tally --------------------------------------------------
    // Recount from the log rather than trusting the client's number, then keep
    // whichever is higher: a tampered client can inflate its own count but
    // can't talk its way below what the log shows.
    const loggedSwitches = violations.filter(v => countsAgainstBudget(v.type)).length;
    const claimedSwitches = Number(body?.tabSwitches);
    const tabSwitches = Math.max(
      loggedSwitches,
      Number.isFinite(claimedSwitches) && claimedSwitches > 0 ? Math.floor(claimedSwitches) : 0
    );

    // --- Auto-grading ------------------------------------------------------
    const questions = (exam.questions as unknown as ExamQuestion[]) ?? [];
    const grading = gradeSubmission(Array.isArray(questions) ? questions : [], responses);

    const isFlagged = isLate || tabSwitches > exam.maxTabSwitches;

    // Status stays SUBMITTED even when nothing needs a human — a score is
    // only visible to the student once the teacher releases it.
    const submission = await prisma.submission.update({
      where: { id: attempt.id },
      data: {
        answers: grading.answers as unknown as object[],
        autoScore: grading.autoScore,
        maxScore: grading.maxScore,
        tabSwitches,
        violations: violations as unknown as object[],
        isFlagged,
        status: 'SUBMITTED',
        submittedAt: now,
      },
      select: { id: true, submittedAt: true },
    });

    // --- Notify the teacher ------------------------------------------------
    if (exam.teacherId) {
      const flagSuffix = isFlagged
        ? ` ⚠️ Flagged: ${tabSwitches} tab switch${tabSwitches === 1 ? '' : 'es'}${
            isLate ? ', submitted late' : ''
          }.`
        : '';

      const notification = {
        type: 'EXAM_SUBMITTED' as const,
        title: 'New Exam Submission',
        message: `${session.name} submitted "${exam.title}"${
          exam.course?.title ? ` (${exam.course.title})` : ''
        }. Auto-graded ${grading.autoScore}/${grading.maxScore}.${flagSuffix}`,
      };

      await prisma.notification.create({
        data: { userId: exam.teacherId, ...notification },
      });

      notifyUser(exam.teacherId, { ...notification, createdAt: now.toISOString() });
    }

    // The student learns their paper landed — not what it scored. Releasing
    // the auto-score here would leak the answer key one retake at a time.
    return NextResponse.json({
      submitted: true,
      submissionId: submission.id,
      submittedAt: submission.submittedAt?.toISOString() ?? now.toISOString(),
      answeredCount: responses.filter(r => r.selectedOptionId || r.text).length,
      questionCount: grading.answers.length,
      pendingManualCount: grading.manualCount,
      tabSwitches,
      isFlagged,
      isLate,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to submit the assessment' }, { status: 500 });
  }
}
