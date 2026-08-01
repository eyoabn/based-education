import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import {
  requireAdmin,
  logAdminAction,
  notifyOne,
  sendTransactionalEmail,
} from '@/lib/adminAuth';
import {
  normalizeCredentials,
  type ApprovalQueueCounts,
  type TeacherApplication,
  type TeacherStatus,
} from '@/lib/admin';

/**
 * Phase 6 — the teacher verification pipeline.
 *
 * GET   /api/admin/approvals?status=PENDING  -> the review queue
 * PATCH /api/admin/approvals                 -> approve or reject an applicant
 *
 * A rejection always carries a reason: the applicant is told why, verbatim, in
 * the notification and the email, and the reason is kept on the user row so a
 * second reviewer can see the history rather than re-litigating it.
 */

const VALID_STATUSES: TeacherStatus[] = ['PENDING', 'APPROVED', 'REJECTED'];

export async function GET(request: NextRequest) {
  const guard = await requireAdmin(request);
  if (!guard.ok) return guard.response;

  try {
    const { searchParams } = new URL(request.url);
    const requested = (searchParams.get('status') ?? 'PENDING').toUpperCase();
    const status: TeacherStatus = VALID_STATUSES.includes(requested as TeacherStatus)
      ? (requested as TeacherStatus)
      : 'PENDING';

    const [rows, pending, approved, rejected] = await Promise.all([
      prisma.user.findMany({
        where: { role: 'TEACHER', teacherStatus: status },
        // Oldest application first: a verification queue is a queue.
        orderBy: status === 'PENDING' ? { createdAt: 'asc' } : { reviewedAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          bio: true,
          specialty: true,
          teacherStatus: true,
          credentials: true,
          rejectionReason: true,
          createdAt: true,
          reviewedAt: true,
          reviewedBy: { select: { name: true } },
          taughtCourses: { select: { _count: { select: { students: true } } } },
        },
      }),
      prisma.user.count({ where: { role: 'TEACHER', teacherStatus: 'PENDING' } }),
      prisma.user.count({ where: { role: 'TEACHER', teacherStatus: 'APPROVED' } }),
      prisma.user.count({ where: { role: 'TEACHER', teacherStatus: 'REJECTED' } }),
    ]);

    const applications: TeacherApplication[] = rows.map(row => ({
      id: row.id,
      name: row.name,
      email: row.email,
      avatarUrl: row.avatarUrl,
      bio: row.bio,
      specialty: row.specialty,
      teacherStatus: (row.teacherStatus ?? 'PENDING') as TeacherStatus,
      credentials: normalizeCredentials(row.credentials),
      rejectionReason: row.rejectionReason,
      registeredAt: row.createdAt.toISOString(),
      reviewedAt: row.reviewedAt ? row.reviewedAt.toISOString() : null,
      reviewedByName: row.reviewedBy?.name ?? null,
      courseCount: row.taughtCourses.length,
      studentCount: row.taughtCourses.reduce((sum, course) => sum + course._count.students, 0),
    }));

    const counts: ApprovalQueueCounts = { pending, approved, rejected };

    return NextResponse.json({ applications, counts });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load the approval queue' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const guard = await requireAdmin(request);
  if (!guard.ok) return guard.response;

  const admin = guard.session;

  try {
    const body = await request.json().catch(() => ({}));
    const { userId, status, reason } = body ?? {};

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'A user id is required.' }, { status: 400 });
    }
    if (status !== 'APPROVED' && status !== 'REJECTED') {
      return NextResponse.json(
        { error: 'Status must be APPROVED or REJECTED.' },
        { status: 400 }
      );
    }

    const rejectionReason =
      typeof reason === 'string' && reason.trim() ? reason.trim().slice(0, 1_000) : null;

    if (status === 'REJECTED' && !rejectionReason) {
      return NextResponse.json(
        { error: 'Give the applicant a reason for the rejection.' },
        { status: 400 }
      );
    }

    const applicant = await prisma.user.findFirst({
      where: { id: userId, role: 'TEACHER' },
      select: { id: true, name: true, email: true, teacherStatus: true, specialty: true },
    });

    if (!applicant) {
      return NextResponse.json({ error: 'No teacher account with that id.' }, { status: 404 });
    }
    if (applicant.teacherStatus === status) {
      return NextResponse.json(
        { error: `This application is already ${status.toLowerCase()}.` },
        { status: 409 }
      );
    }

    const now = new Date();
    const approved = status === 'APPROVED';

    const updated = await prisma.user.update({
      where: { id: applicant.id },
      data: {
        teacherStatus: status,
        // A fresh ruling clears the previous one's reason.
        rejectionReason: approved ? null : rejectionReason,
        reviewedAt: now,
        reviewedById: admin.userId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        bio: true,
        specialty: true,
        teacherStatus: true,
        credentials: true,
        rejectionReason: true,
        createdAt: true,
        reviewedAt: true,
      },
    });

    // Tell the teacher — in-app first (guaranteed), then email (best effort).
    await notifyOne(applicant.id, {
      type: approved ? 'ACCOUNT_APPROVED' : 'ACCOUNT_REJECTED',
      title: approved ? 'Your teacher account is approved' : 'Update on your application',
      message: approved
        ? 'Welcome aboard. You can now schedule live classes, publish assessments and enrol students.'
        : `Your teacher application was not approved. Reason: ${rejectionReason}`,
    });

    const email = await sendTransactionalEmail({
      to: applicant.email,
      subject: approved
        ? 'Welcome to Educonnect — your teacher account is live'
        : 'Your Educonnect teacher application',
      body: approved
        ? `Hi ${applicant.name},\n\nYour teacher account has been verified and approved. Sign in to set up your first class.\n\n— The Educonnect team`
        : `Hi ${applicant.name},\n\nAfter reviewing your application we are unable to approve it at this time.\n\nReason: ${rejectionReason}\n\nYou are welcome to reapply with updated credentials.\n\n— The Educonnect team`,
    });

    await logAdminAction({
      action: approved ? 'TEACHER_APPROVED' : 'TEACHER_REJECTED',
      adminId: admin.userId,
      targetUserId: applicant.id,
      summary: approved
        ? `${admin.name} approved teacher ${applicant.name}`
        : `${admin.name} rejected ${applicant.name}'s application`,
      metadata: {
        email: applicant.email,
        specialty: applicant.specialty,
        previousStatus: applicant.teacherStatus,
        ...(rejectionReason ? { reason: rejectionReason } : {}),
      },
    });

    const application: TeacherApplication = {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      avatarUrl: updated.avatarUrl,
      bio: updated.bio,
      specialty: updated.specialty,
      teacherStatus: (updated.teacherStatus ?? status) as TeacherStatus,
      credentials: normalizeCredentials(updated.credentials),
      rejectionReason: updated.rejectionReason,
      registeredAt: updated.createdAt.toISOString(),
      reviewedAt: updated.reviewedAt ? updated.reviewedAt.toISOString() : null,
      reviewedByName: admin.name,
      courseCount: 0,
      studentCount: 0,
    };

    return NextResponse.json({
      application,
      notified: true,
      emailDelivered: email.delivered,
      emailNote: email.reason ?? null,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to record the decision' }, { status: 500 });
  }
}
