import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin, getPlatformSettings } from '@/lib/adminAuth';
import {
  changePct,
  monthBuckets,
  monthKey,
  type AnalyticsResponse,
  type AuditAction,
  type AuditEntry,
  type GrowthPoint,
  type PlatformMetrics,
  type RevenuePoint,
  type TopTeacher,
} from '@/lib/admin';

/**
 * Phase 6 — platform analytics.
 *
 * GET /api/admin/analytics?months=12
 *
 * One round-trip for the whole executive view: headline counts, a 12-month
 * revenue series, a user-growth series, the audit tail and the teacher
 * leaderboard. The counts run as one `Promise.all` of indexed aggregates; the
 * two series are bucketed in memory from a single date-bounded read each,
 * which keeps this portable across Postgres versions and avoids raw SQL.
 */

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const guard = await requireAdmin(request);
  if (!guard.ok) return guard.response;

  try {
    const { searchParams } = new URL(request.url);
    const months = Math.min(Math.max(Number(searchParams.get('months')) || 12, 3), 24);

    const now = new Date();
    const buckets = monthBuckets(months, now);
    const windowStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1));

    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const prevMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));

    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const [
      totalUsers,
      studentCount,
      teacherCount,
      adminCount,
      bannedCount,
      pendingTeachers,
      approvedTeachers,
      activeLiveRooms,
      scheduledToday,
      totalCourses,
      totalExams,
      totalSubmissions,
      gradedSubmissions,
      newUsersThisMonth,
      payments,
      signups,
      thisMonthRevenue,
      lastMonthRevenue,
      auditRows,
      teacherRows,
      settings,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.user.count({ where: { role: 'TEACHER' } }),
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.user.count({ where: { isBanned: true } }),
      prisma.user.count({ where: { role: 'TEACHER', teacherStatus: 'PENDING' } }),
      prisma.user.count({ where: { role: 'TEACHER', teacherStatus: 'APPROVED' } }),
      prisma.liveRoom.count({ where: { isLive: true } }),
      prisma.liveRoom.count({ where: { scheduledAt: { gte: dayStart, lt: dayEnd } } }),
      prisma.course.count(),
      prisma.exam.count(),
      prisma.submission.count({ where: { status: { not: 'IN_PROGRESS' } } }),
      prisma.submission.count({ where: { status: 'GRADED' } }),
      prisma.user.count({ where: { createdAt: { gte: monthStart } } }),

      // Series inputs — bounded reads, bucketed below.
      prisma.payment.findMany({
        where: { status: 'PAID', createdAt: { gte: windowStart } },
        select: { amountCents: true, commissionCents: true, createdAt: true },
      }),
      prisma.user.findMany({
        where: { createdAt: { gte: windowStart } },
        select: { createdAt: true },
      }),

      prisma.payment.aggregate({
        where: { status: 'PAID', createdAt: { gte: monthStart } },
        _sum: { amountCents: true, commissionCents: true },
      }),
      prisma.payment.aggregate({
        where: { status: 'PAID', createdAt: { gte: prevMonthStart, lt: monthStart } },
        _sum: { amountCents: true },
      }),

      prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 25,
        select: {
          id: true,
          action: true,
          summary: true,
          metadata: true,
          createdAt: true,
          admin: { select: { name: true } },
          target: { select: { name: true } },
        },
      }),

      prisma.user.findMany({
        where: { role: 'TEACHER', teacherStatus: 'APPROVED', isBanned: false },
        take: 25,
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          specialty: true,
          _count: { select: { liveRooms: true } },
          taughtCourses: { select: { _count: { select: { students: true } } } },
        },
      }),

      getPlatformSettings(),
    ]);

    // --- Revenue series ------------------------------------------------------
    const revenueByMonth = new Map<string, RevenuePoint>(
      buckets.map(bucket => [
        bucket.month,
        {
          month: bucket.month,
          label: bucket.label,
          grossCents: 0,
          commissionCents: 0,
          payoutCents: 0,
          paymentCount: 0,
        },
      ])
    );

    for (const payment of payments) {
      const point = revenueByMonth.get(monthKey(payment.createdAt));
      if (!point) continue;
      point.grossCents += payment.amountCents;
      point.commissionCents += payment.commissionCents;
      point.paymentCount += 1;
    }

    const revenue = buckets.map(bucket => {
      const point = revenueByMonth.get(bucket.month)!;
      // The payout is what's left after the platform's cut — derived, never
      // stored, so the two bars of the stack always sum to gross.
      point.payoutCents = point.grossCents - point.commissionCents;
      return point;
    });

    // --- Growth series -------------------------------------------------------
    const signupsByMonth = new Map<string, number>(buckets.map(bucket => [bucket.month, 0]));
    for (const signup of signups) {
      const key = monthKey(signup.createdAt);
      if (signupsByMonth.has(key)) signupsByMonth.set(key, (signupsByMonth.get(key) ?? 0) + 1);
    }
    const growth: GrowthPoint[] = buckets.map(bucket => ({
      month: bucket.month,
      label: bucket.label,
      users: signupsByMonth.get(bucket.month) ?? 0,
    }));

    // --- Headline metrics ----------------------------------------------------
    const metrics: PlatformMetrics = {
      totalUsers,
      studentCount,
      teacherCount,
      adminCount,
      bannedCount,
      pendingTeachers,
      approvedTeachers,
      activeLiveRooms,
      scheduledToday,
      totalCourses,
      totalExams,
      totalSubmissions,
      gradedSubmissions,
      newUsersThisMonth,
      revenueCents: thisMonthRevenue._sum.amountCents ?? 0,
      commissionCents: thisMonthRevenue._sum.commissionCents ?? 0,
      revenueChangePct: changePct(
        thisMonthRevenue._sum.amountCents ?? 0,
        lastMonthRevenue._sum.amountCents ?? 0
      ),
    };

    // --- Audit tail ----------------------------------------------------------
    const auditLog: AuditEntry[] = auditRows.map(row => ({
      id: row.id,
      action: row.action as AuditAction,
      summary: row.summary,
      adminName: row.admin?.name ?? 'System',
      targetName: row.target?.name ?? null,
      metadata:
        row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
          ? (row.metadata as Record<string, unknown>)
          : {},
      createdAt: row.createdAt.toISOString(),
    }));

    // --- Leaderboard ---------------------------------------------------------
    const topTeachers: TopTeacher[] = teacherRows
      .map(row => ({
        id: row.id,
        name: row.name,
        avatarUrl: row.avatarUrl,
        specialty: row.specialty,
        studentCount: row.taughtCourses.reduce((sum, course) => sum + course._count.students, 0),
        courseCount: row.taughtCourses.length,
        sessionCount: row._count.liveRooms,
      }))
      .sort((a, b) => b.studentCount - a.studentCount || b.sessionCount - a.sessionCount)
      .slice(0, 5);

    const payload: AnalyticsResponse = {
      metrics,
      revenue,
      growth,
      auditLog,
      topTeachers,
      settings,
    };

    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load platform analytics' }, { status: 500 });
  }
}
