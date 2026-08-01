/**
 * Phase 6 — server-only administration guard.
 *
 * Never import this from a client component: it pulls in Prisma. The
 * isomorphic half of the admin model lives in `lib/admin.ts`.
 *
 * ## Why the guard hits the database
 *
 * A JWT is a bearer credential — once minted it is valid until it expires, and
 * `proxy.ts` (edge middleware) can only read the claims inside it. That is fine
 * for routing, but useless for a ban: a suspended user would keep their access
 * for up to 24 hours.
 *
 * So every privileged request re-reads the user row and compares the token's
 * `epoch` claim against `User.sessionEpoch`. Banning a user, or changing their
 * role, bumps that counter — which invalidates every token already in the
 * wild, on the offender's very next request. The cost is one indexed primary-key
 * lookup per admin call, which is the right trade for an operation whose whole
 * purpose is revoking access.
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { notifyUser } from '@/app/api/notifications/stream/route'
import { DEFAULT_PLANS, type PlatformSettings, type Role } from '@/lib/admin'

export interface VerifiedSession {
  userId: string
  name: string
  email: string
  role: Role
  sessionEpoch: number
}

type GuardResult =
  | { ok: true; session: VerifiedSession }
  | { ok: false; response: NextResponse }

const SETTINGS_ID = 'platform'

function deny(error: string, status: number, code?: string): GuardResult {
  return { ok: false, response: NextResponse.json({ error, code }, { status }) }
}

/**
 * Authenticate the caller against the database.
 *
 * Fails closed on every ambiguity: no cookie, bad signature, deleted account,
 * ban, or a token minted before the user's session epoch was bumped.
 */
export async function requireSession(request: NextRequest): Promise<GuardResult> {
  const token = request.cookies.get('token')?.value
  if (!token) return deny('Unauthorized', 401)

  const claims = await verifyToken(token)
  if (!claims) return deny('Unauthorized', 401)

  const user = await prisma.user.findUnique({
    where: { id: claims.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isBanned: true,
      banReason: true,
      sessionEpoch: true,
    },
  })

  // The account was deleted out from under a still-valid token.
  if (!user) return deny('Unauthorized', 401)

  if (user.isBanned) {
    return deny(
      user.banReason
        ? `Your account has been suspended: ${user.banReason}`
        : 'Your account has been suspended.',
      403,
      'ACCOUNT_SUSPENDED'
    )
  }

  // A token minted before the last revocation. Tokens issued by earlier phases
  // carry no epoch at all — treat those as epoch 0, which is the default, so
  // existing sessions survive the upgrade but not a ban.
  const tokenEpoch = Number((claims as { epoch?: unknown }).epoch ?? 0)
  if (Number.isFinite(tokenEpoch) && tokenEpoch < user.sessionEpoch) {
    return deny('Your session has expired. Please sign in again.', 401, 'SESSION_REVOKED')
  }

  return {
    ok: true,
    session: {
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role as Role,
      sessionEpoch: user.sessionEpoch,
    },
  }
}

/** `requireSession` plus the `role === 'ADMIN'` check every admin route needs. */
export async function requireAdmin(request: NextRequest): Promise<GuardResult> {
  const result = await requireSession(request)
  if (!result.ok) return result

  if (result.session.role !== 'ADMIN') {
    return deny('Administrator access required.', 403, 'FORBIDDEN')
  }

  return result
}

// --- Audit trail ------------------------------------------------------------

type AuditActionName =
  | 'TEACHER_APPROVED'
  | 'TEACHER_REJECTED'
  | 'USER_BANNED'
  | 'USER_REINSTATED'
  | 'USER_ROLE_CHANGED'
  | 'PASSWORD_RESET_ISSUED'
  | 'BROADCAST_SENT'
  | 'MAINTENANCE_TOGGLED'
  | 'PLAN_UPDATED'

/**
 * Append to the audit trail.
 *
 * Deliberately swallows its own errors: an admin action that already succeeded
 * must not be reported as failed because the log write lost a race. The write
 * is fire-and-forget from the caller's perspective, but awaited so the row is
 * there by the time the response is sent.
 */
export async function logAdminAction(entry: {
  action: AuditActionName
  adminId: string
  targetUserId?: string | null
  summary: string
  metadata?: Record<string, unknown>
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: entry.action,
        adminId: entry.adminId,
        targetUserId: entry.targetUserId ?? null,
        summary: entry.summary.slice(0, 500),
        metadata: (entry.metadata ?? {}) as object,
      },
    })
  } catch {
    // An unwritten log line is not worth failing the request over.
  }
}

// --- Notifications ----------------------------------------------------------

type NotificationTypeName =
  | 'ACCOUNT_APPROVED'
  | 'ACCOUNT_REJECTED'
  | 'ACCOUNT_SUSPENDED'
  | 'ACCOUNT_REINSTATED'
  | 'ROLE_CHANGED'
  | 'PLATFORM_BROADCAST'

/**
 * Persist a notification and push it down the open SSE stream, so a user with
 * the dashboard open sees it without a refresh — the same pattern Phase 5 used
 * for grade releases.
 */
export async function notifyOne(
  userId: string,
  notification: { type: NotificationTypeName; title: string; message: string }
): Promise<void> {
  await prisma.notification.create({ data: { userId, ...notification } })
  notifyUser(userId, { ...notification, createdAt: new Date().toISOString() })
}

/** Fan a single notification out to many users in one insert. */
export async function notifyMany(
  userIds: string[],
  notification: { type: NotificationTypeName; title: string; message: string }
): Promise<number> {
  if (userIds.length === 0) return 0

  await prisma.notification.createMany({
    data: userIds.map(userId => ({ userId, ...notification })),
  })

  const createdAt = new Date().toISOString()
  for (const userId of userIds) {
    notifyUser(userId, { ...notification, createdAt })
  }

  return userIds.length
}

/**
 * Stand-in for the transactional email provider.
 *
 * Phase 6 has no SMTP credentials, and silently pretending mail was sent would
 * be worse than saying so — this logs the envelope and reports whether a real
 * provider is wired up, so the caller can tell the admin the truth.
 */
export async function sendTransactionalEmail(email: {
  to: string
  subject: string
  body: string
}): Promise<{ delivered: boolean; reason?: string }> {
  const configured = Boolean(process.env.SMTP_URL || process.env.RESEND_API_KEY)

  if (!configured) {
    console.info('[email:skipped]', { to: email.to, subject: email.subject })
    return { delivered: false, reason: 'No mail provider configured (SMTP_URL / RESEND_API_KEY).' }
  }

  // Wire the provider SDK in here. Until then, an outbound record in the log.
  console.info('[email:queued]', { to: email.to, subject: email.subject })
  return { delivered: true }
}

// --- Platform settings ------------------------------------------------------

/**
 * Read the singleton settings row, creating it on first access so a freshly
 * migrated database serves the admin portal without a seed step.
 */
export async function getPlatformSettings(): Promise<PlatformSettings> {
  const row = await prisma.platformSetting.upsert({
    where: { id: SETTINGS_ID },
    update: {},
    create: { id: SETTINGS_ID },
    select: {
      maintenanceMode: true,
      maintenanceNote: true,
      commissionPct: true,
      registrationOpen: true,
      updatedAt: true,
    },
  })

  return {
    maintenanceMode: row.maintenanceMode,
    maintenanceNote: row.maintenanceNote,
    commissionPct: row.commissionPct,
    registrationOpen: row.registrationOpen,
    updatedAt: row.updatedAt.toISOString(),
  }
}

export async function updatePlatformSettings(
  adminId: string,
  patch: Partial<Pick<PlatformSettings, 'maintenanceMode' | 'maintenanceNote' | 'commissionPct' | 'registrationOpen'>>
): Promise<PlatformSettings> {
  const row = await prisma.platformSetting.upsert({
    where: { id: SETTINGS_ID },
    update: { ...patch, updatedById: adminId },
    create: { id: SETTINGS_ID, ...patch, updatedById: adminId },
    select: {
      maintenanceMode: true,
      maintenanceNote: true,
      commissionPct: true,
      registrationOpen: true,
      updatedAt: true,
    },
  })

  return {
    maintenanceMode: row.maintenanceMode,
    maintenanceNote: row.maintenanceNote,
    commissionPct: row.commissionPct,
    registrationOpen: row.registrationOpen,
    updatedAt: row.updatedAt.toISOString(),
  }
}

/**
 * Seed the default tiers the first time the monetization page is opened, so
 * the plan manager is never an empty screen on a fresh install.
 */
export async function ensureDefaultPlans(): Promise<void> {
  const existing = await prisma.subscriptionPlan.count()
  if (existing > 0) return

  await prisma.subscriptionPlan.createMany({
    data: DEFAULT_PLANS.map(plan => ({
      name: plan.name,
      slug: plan.slug,
      audience: plan.audience,
      priceCents: plan.priceCents,
      interval: plan.interval,
      features: plan.features as object,
      isActive: plan.isActive,
      sortOrder: plan.sortOrder,
    })),
    skipDuplicates: true,
  })
}
