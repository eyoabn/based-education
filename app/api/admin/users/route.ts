import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { requireAdmin, logAdminAction, notifyOne } from '@/lib/adminAuth';
import {
  accountStatusOf,
  USER_PAGE_SIZE,
  type AccountStatus,
  type AdminUserRow,
  type AdminUserListResponse,
  type Role,
  type TeacherStatus,
  type UserSortKey,
} from '@/lib/admin';

/**
 * Phase 6 — user governance.
 *
 * GET   /api/admin/users?q=&role=&status=&page=&sort=  -> paginated directory
 * PATCH /api/admin/users                               -> ban, reinstate,
 *                                                         change role, or mint
 *                                                         a password-reset link
 *
 * Two invariants protect the platform from an admin's own mistake, and both
 * are enforced here rather than in the UI: **you cannot act on yourself**, and
 * **the last active admin cannot be removed** — no ban, no demotion. A portal
 * that can lock every administrator out of it is a broken portal.
 */

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

const ROLES: Role[] = ['STUDENT', 'TEACHER', 'ADMIN'];
const STATUSES: AccountStatus[] = ['ACTIVE', 'PENDING', 'REJECTED', 'BANNED'];

/** Translate the derived `AccountStatus` filter back into column predicates. */
function statusFilter(status: AccountStatus | null): Prisma.UserWhereInput {
  switch (status) {
    case 'BANNED':
      return { isBanned: true };
    case 'PENDING':
      return { isBanned: false, role: 'TEACHER', teacherStatus: 'PENDING' };
    case 'REJECTED':
      return { isBanned: false, role: 'TEACHER', teacherStatus: 'REJECTED' };
    case 'ACTIVE':
      return {
        isBanned: false,
        OR: [
          { role: { in: ['STUDENT', 'ADMIN'] } },
          { role: 'TEACHER', teacherStatus: 'APPROVED' },
        ],
      };
    default:
      return {};
  }
}

function sortClause(sort: UserSortKey, dir: 'asc' | 'desc'): Prisma.UserOrderByWithRelationInput {
  switch (sort) {
    case 'name':
      return { name: dir };
    case 'lastLoginAt':
      return { lastLoginAt: dir };
    default:
      return { createdAt: dir };
  }
}

export async function GET(request: NextRequest) {
  const guard = await requireAdmin(request);
  if (!guard.ok) return guard.response;

  try {
    const { searchParams } = new URL(request.url);

    const q = (searchParams.get('q') ?? '').trim();
    const roleParam = (searchParams.get('role') ?? '').toUpperCase();
    const statusParam = (searchParams.get('status') ?? '').toUpperCase();
    const sortParam = searchParams.get('sort') ?? 'joinedAt';
    const dir = searchParams.get('dir') === 'asc' ? 'asc' : 'desc';

    const role = ROLES.includes(roleParam as Role) ? (roleParam as Role) : null;
    const status = STATUSES.includes(statusParam as AccountStatus)
      ? (statusParam as AccountStatus)
      : null;
    const sort: UserSortKey =
      sortParam === 'name' || sortParam === 'lastLoginAt' ? sortParam : 'joinedAt';

    const pageSize = Math.min(
      Math.max(Number(searchParams.get('pageSize')) || USER_PAGE_SIZE, 1),
      100
    );
    const page = Math.max(Number(searchParams.get('page')) || 1, 1);

    const where: Prisma.UserWhereInput = {
      ...(role ? { role } : {}),
      ...statusFilter(status),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' as const } },
              { email: { contains: q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    // A search term and an ACTIVE filter both want the `OR` key. Nest them
    // under AND so neither silently overwrites the other.
    const finalWhere: Prisma.UserWhereInput =
      q && status === 'ACTIVE'
        ? {
            role: role ?? undefined,
            isBanned: false,
            AND: [
              {
                OR: [
                  { role: { in: ['STUDENT', 'ADMIN'] } },
                  { role: 'TEACHER', teacherStatus: 'APPROVED' },
                ],
              },
              {
                OR: [
                  { name: { contains: q, mode: 'insensitive' } },
                  { email: { contains: q, mode: 'insensitive' } },
                ],
              },
            ],
          }
        : where;

    const [total, rows, students, teachers, admins, banned, pending] = await Promise.all([
      prisma.user.count({ where: finalWhere }),
      prisma.user.findMany({
        where: finalWhere,
        orderBy: sortClause(sort, dir),
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          role: true,
          teacherStatus: true,
          isBanned: true,
          banReason: true,
          bannedAt: true,
          createdAt: true,
          lastLoginAt: true,
          _count: { select: { posts: true, submissions: true, liveRooms: true } },
        },
      }),
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.user.count({ where: { role: 'TEACHER' } }),
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.user.count({ where: { isBanned: true } }),
      prisma.user.count({ where: { role: 'TEACHER', teacherStatus: 'PENDING' } }),
    ]);

    const users: AdminUserRow[] = rows.map(row => {
      const role = row.role as Role;
      const teacherStatus = (row.teacherStatus ?? null) as TeacherStatus | null;

      return {
        id: row.id,
        name: row.name,
        email: row.email,
        avatarUrl: row.avatarUrl,
        role,
        teacherStatus,
        status: accountStatusOf({ role, teacherStatus, isBanned: row.isBanned }),
        isBanned: row.isBanned,
        banReason: row.banReason,
        bannedAt: row.bannedAt ? row.bannedAt.toISOString() : null,
        joinedAt: row.createdAt.toISOString(),
        lastLoginAt: row.lastLoginAt ? row.lastLoginAt.toISOString() : null,
        activityCount: row._count.posts + row._count.submissions + row._count.liveRooms,
      };
    });

    const payload: AdminUserListResponse = {
      users,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(Math.ceil(total / pageSize), 1),
      },
      counts: {
        all: students + teachers + admins,
        students,
        teachers,
        admins,
        banned,
        pending,
      },
    };

    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load users' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const guard = await requireAdmin(request);
  if (!guard.ok) return guard.response;

  const admin = guard.session;

  try {
    const body = await request.json().catch(() => ({}));
    const { userId, action, reason, role: nextRole } = body ?? {};

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'A user id is required.' }, { status: 400 });
    }

    // An admin acting on their own account can only end badly: a self-ban
    // locks the portal, a self-demotion is irreversible from inside.
    if (userId === admin.userId) {
      return NextResponse.json(
        { error: 'You cannot apply governance actions to your own account.' },
        { status: 400 }
      );
    }

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        teacherStatus: true,
        isBanned: true,
        sessionEpoch: true,
      },
    });

    if (!target) {
      return NextResponse.json({ error: 'No user with that id.' }, { status: 404 });
    }

    /** Guard the platform against losing its last way in. */
    async function wouldStrandPlatform(): Promise<boolean> {
      if (target!.role !== 'ADMIN') return false;
      const remaining = await prisma.user.count({
        where: { role: 'ADMIN', isBanned: false, id: { not: target!.id } },
      });
      return remaining === 0;
    }

    switch (action) {
      // --- Suspend -----------------------------------------------------------
      case 'BAN': {
        if (target.isBanned) {
          return NextResponse.json({ error: 'That account is already suspended.' }, { status: 409 });
        }
        if (await wouldStrandPlatform()) {
          return NextResponse.json(
            { error: 'This is the last active administrator — suspending them would lock everyone out.' },
            { status: 409 }
          );
        }

        const banReason =
          typeof reason === 'string' && reason.trim() ? reason.trim().slice(0, 1_000) : null;
        if (!banReason) {
          return NextResponse.json(
            { error: 'Give a reason for the suspension.' },
            { status: 400 }
          );
        }

        const updated = await prisma.user.update({
          where: { id: target.id },
          data: {
            isBanned: true,
            banReason,
            bannedAt: new Date(),
            // Revokes every JWT already issued to this user — see lib/adminAuth.
            sessionEpoch: { increment: 1 },
          },
          select: { id: true, isBanned: true, banReason: true, bannedAt: true, sessionEpoch: true },
        });

        await notifyOne(target.id, {
          type: 'ACCOUNT_SUSPENDED',
          title: 'Your account has been suspended',
          message: `An administrator suspended your Educonnect account. Reason: ${banReason}`,
        });

        await logAdminAction({
          action: 'USER_BANNED',
          adminId: admin.userId,
          targetUserId: target.id,
          summary: `${admin.name} suspended ${target.name}`,
          metadata: { reason: banReason, email: target.email, role: target.role },
        });

        return NextResponse.json({
          user: {
            id: updated.id,
            isBanned: updated.isBanned,
            banReason: updated.banReason,
            bannedAt: updated.bannedAt ? updated.bannedAt.toISOString() : null,
          },
          sessionsRevoked: true,
        });
      }

      // --- Reinstate ---------------------------------------------------------
      case 'UNBAN': {
        if (!target.isBanned) {
          return NextResponse.json({ error: 'That account is not suspended.' }, { status: 409 });
        }

        const updated = await prisma.user.update({
          where: { id: target.id },
          data: { isBanned: false, banReason: null, bannedAt: null },
          select: { id: true, isBanned: true },
        });

        await notifyOne(target.id, {
          type: 'ACCOUNT_REINSTATED',
          title: 'Your account has been reinstated',
          message: 'Your Educonnect account is active again. Welcome back.',
        });

        await logAdminAction({
          action: 'USER_REINSTATED',
          adminId: admin.userId,
          targetUserId: target.id,
          summary: `${admin.name} reinstated ${target.name}`,
          metadata: { email: target.email },
        });

        return NextResponse.json({
          user: { id: updated.id, isBanned: updated.isBanned, banReason: null, bannedAt: null },
        });
      }

      // --- Change role -------------------------------------------------------
      case 'CHANGE_ROLE': {
        if (!ROLES.includes(nextRole)) {
          return NextResponse.json(
            { error: 'Role must be STUDENT, TEACHER or ADMIN.' },
            { status: 400 }
          );
        }
        if (nextRole === target.role) {
          return NextResponse.json(
            { error: `That account is already a ${String(nextRole).toLowerCase()}.` },
            { status: 409 }
          );
        }
        if (nextRole !== 'ADMIN' && (await wouldStrandPlatform())) {
          return NextResponse.json(
            { error: 'This is the last active administrator — demoting them would lock everyone out.' },
            { status: 409 }
          );
        }

        // A promoted teacher keeps no dangling application state; a new
        // teacher created by an admin is pre-approved, since the admin *is*
        // the approval step.
        const teacherStatus: TeacherStatus | null = nextRole === 'TEACHER' ? 'APPROVED' : null;

        const updated = await prisma.user.update({
          where: { id: target.id },
          data: {
            role: nextRole,
            teacherStatus,
            rejectionReason: null,
            // The role sits inside the JWT, so the old token now lies about
            // this user's privileges. Force a re-issue.
            sessionEpoch: { increment: 1 },
          },
          select: { id: true, role: true, teacherStatus: true },
        });

        await notifyOne(target.id, {
          type: 'ROLE_CHANGED',
          title: 'Your account role has changed',
          message: `An administrator changed your role to ${String(nextRole).toLowerCase()}. Sign in again to pick up your new permissions.`,
        });

        await logAdminAction({
          action: 'USER_ROLE_CHANGED',
          adminId: admin.userId,
          targetUserId: target.id,
          summary: `${admin.name} changed ${target.name}'s role from ${target.role} to ${nextRole}`,
          metadata: { from: target.role, to: nextRole, email: target.email },
        });

        return NextResponse.json({
          user: {
            id: updated.id,
            role: updated.role,
            teacherStatus: updated.teacherStatus,
          },
          sessionsRevoked: true,
        });
      }

      // --- Password reset link ------------------------------------------------
      case 'RESET_PASSWORD': {
        const token = randomUUID();
        const expires = new Date(Date.now() + RESET_TOKEN_TTL_MS);

        await prisma.user.update({
          where: { id: target.id },
          data: { passwordResetToken: token, passwordResetExpires: expires },
        });

        await logAdminAction({
          action: 'PASSWORD_RESET_ISSUED',
          adminId: admin.userId,
          targetUserId: target.id,
          summary: `${admin.name} issued a password-reset link for ${target.name}`,
          metadata: { email: target.email, expiresAt: expires.toISOString() },
        });

        const origin = new URL(request.url).origin;

        // The raw link goes to the admin, who hands it over out-of-band. The
        // token itself is single-use and expires in an hour.
        return NextResponse.json({
          resetUrl: `${origin}/reset-password?token=${token}`,
          expiresAt: expires.toISOString(),
        });
      }

      default:
        return NextResponse.json(
          { error: 'Action must be BAN, UNBAN, CHANGE_ROLE or RESET_PASSWORD.' },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update the user' }, { status: 500 });
  }
}
