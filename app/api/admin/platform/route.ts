import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import {
  requireAdmin,
  logAdminAction,
  notifyMany,
  getPlatformSettings,
  updatePlatformSettings,
  ensureDefaultPlans,
} from '@/lib/adminAuth';
import type { BillingInterval, PlanRow, Role } from '@/lib/admin';

/**
 * Phase 6 — platform operations.
 *
 * GET   /api/admin/platform  -> settings + subscription tiers with live totals
 * PATCH /api/admin/platform  -> maintenance mode, commission rate, plan edits
 * POST  /api/admin/platform  -> broadcast a notice to every user (or one role)
 *
 * Split out from `/analytics` because these are writes with side effects on
 * every user of the platform, and they deserve their own audit verbs.
 */

const BROADCAST_CHUNK = 500;

function parseFeatures(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

async function loadPlans(): Promise<PlanRow[]> {
  await ensureDefaultPlans();

  const [plans, totals] = await Promise.all([
    prisma.subscriptionPlan.findMany({ orderBy: [{ sortOrder: 'asc' }, { priceCents: 'asc' }] }),
    prisma.payment.groupBy({
      by: ['planId'],
      where: { status: 'PAID' },
      _sum: { amountCents: true },
      _count: { _all: true },
    }),
  ]);

  const totalsByPlan = new Map(
    totals.map(row => [row.planId, { gross: row._sum.amountCents ?? 0, count: row._count._all }])
  );

  return plans.map(plan => {
    const totals = totalsByPlan.get(plan.id);
    return {
      id: plan.id,
      name: plan.name,
      slug: plan.slug,
      audience: plan.audience as Role,
      priceCents: plan.priceCents,
      interval: plan.interval as BillingInterval,
      features: parseFeatures(plan.features),
      isActive: plan.isActive,
      sortOrder: plan.sortOrder,
      subscriberCount: totals?.count ?? 0,
      grossCents: totals?.gross ?? 0,
    };
  });
}

export async function GET(request: NextRequest) {
  const guard = await requireAdmin(request);
  if (!guard.ok) return guard.response;

  try {
    const [settings, plans] = await Promise.all([getPlatformSettings(), loadPlans()]);
    return NextResponse.json({ settings, plans });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load platform settings' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const guard = await requireAdmin(request);
  if (!guard.ok) return guard.response;

  const admin = guard.session;

  try {
    const body = await request.json().catch(() => ({}));
    const { target } = body ?? {};

    // --- Subscription tier ---------------------------------------------------
    if (target === 'PLAN') {
      const { planId, name, priceCents, interval, features, isActive } = body ?? {};

      if (!planId || typeof planId !== 'string') {
        return NextResponse.json({ error: 'A plan id is required.' }, { status: 400 });
      }

      const existing = await prisma.subscriptionPlan.findUnique({
        where: { id: planId },
        select: { id: true, name: true, priceCents: true, isActive: true },
      });
      if (!existing) {
        return NextResponse.json({ error: 'No plan with that id.' }, { status: 404 });
      }

      const price = Number(priceCents);
      if (priceCents !== undefined && (!Number.isFinite(price) || price < 0 || price > 10_000_00)) {
        return NextResponse.json(
          { error: 'Price must be between $0 and $10,000.' },
          { status: 400 }
        );
      }

      await prisma.subscriptionPlan.update({
        where: { id: planId },
        data: {
          ...(typeof name === 'string' && name.trim() ? { name: name.trim().slice(0, 60) } : {}),
          ...(priceCents !== undefined ? { priceCents: Math.round(price) } : {}),
          ...(interval === 'MONTHLY' || interval === 'YEARLY' ? { interval } : {}),
          ...(features !== undefined ? { features: parseFeatures(features) as object } : {}),
          ...(typeof isActive === 'boolean' ? { isActive } : {}),
        },
      });

      await logAdminAction({
        action: 'PLAN_UPDATED',
        adminId: admin.userId,
        summary: `${admin.name} updated the ${existing.name} plan`,
        metadata: {
          planId,
          previousPriceCents: existing.priceCents,
          ...(priceCents !== undefined ? { priceCents: Math.round(price) } : {}),
          ...(typeof isActive === 'boolean' ? { isActive } : {}),
        },
      });

      return NextResponse.json({ plans: await loadPlans() });
    }

    // --- Platform settings ---------------------------------------------------
    const { maintenanceMode, maintenanceNote, commissionPct, registrationOpen } = body ?? {};
    const patch: Parameters<typeof updatePlatformSettings>[1] = {};

    if (typeof maintenanceMode === 'boolean') patch.maintenanceMode = maintenanceMode;
    if (typeof registrationOpen === 'boolean') patch.registrationOpen = registrationOpen;
    if (maintenanceNote !== undefined) {
      patch.maintenanceNote =
        typeof maintenanceNote === 'string' && maintenanceNote.trim()
          ? maintenanceNote.trim().slice(0, 500)
          : null;
    }
    if (commissionPct !== undefined) {
      const pct = Number(commissionPct);
      if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
        return NextResponse.json(
          { error: 'Commission must be between 0 and 100 percent.' },
          { status: 400 }
        );
      }
      patch.commissionPct = Math.round(pct);
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
    }

    const settings = await updatePlatformSettings(admin.userId, patch);

    if (patch.maintenanceMode !== undefined) {
      await logAdminAction({
        action: 'MAINTENANCE_TOGGLED',
        adminId: admin.userId,
        summary: `${admin.name} turned maintenance mode ${patch.maintenanceMode ? 'on' : 'off'}`,
        metadata: { maintenanceMode: patch.maintenanceMode, note: patch.maintenanceNote ?? null },
      });
    }
    if (patch.commissionPct !== undefined) {
      await logAdminAction({
        action: 'PLAN_UPDATED',
        adminId: admin.userId,
        summary: `${admin.name} set the platform commission to ${patch.commissionPct}%`,
        metadata: { commissionPct: patch.commissionPct },
      });
    }

    return NextResponse.json({ settings });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update the platform' }, { status: 500 });
  }
}

/** Broadcast a notice to the whole platform, or to a single role. */
export async function POST(request: NextRequest) {
  const guard = await requireAdmin(request);
  if (!guard.ok) return guard.response;

  const admin = guard.session;

  try {
    const body = await request.json().catch(() => ({}));
    const { title, message, audience } = body ?? {};

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'Give the broadcast a title.' }, { status: 400 });
    }
    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'Write a message to broadcast.' }, { status: 400 });
    }

    const scope: 'ALL' | Role =
      audience === 'STUDENT' || audience === 'TEACHER' || audience === 'ADMIN' ? audience : 'ALL';

    const recipients = await prisma.user.findMany({
      // A suspended account gets no announcements.
      where: { isBanned: false, ...(scope === 'ALL' ? {} : { role: scope }) },
      select: { id: true },
    });

    const notification = {
      type: 'PLATFORM_BROADCAST' as const,
      title: title.trim().slice(0, 120),
      message: message.trim().slice(0, 1_000),
    };

    // Chunked so a large platform doesn't build one enormous INSERT.
    let sent = 0;
    for (let i = 0; i < recipients.length; i += BROADCAST_CHUNK) {
      const chunk = recipients.slice(i, i + BROADCAST_CHUNK);
      sent += await notifyMany(
        chunk.map(user => user.id),
        notification
      );
    }

    await logAdminAction({
      action: 'BROADCAST_SENT',
      adminId: admin.userId,
      summary: `${admin.name} broadcast "${notification.title}" to ${sent} ${
        scope === 'ALL' ? 'users' : `${scope.toLowerCase()}s`
      }`,
      metadata: { audience: scope, recipientCount: sent, message: notification.message },
    });

    return NextResponse.json({ sent, audience: scope });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to send the broadcast' }, { status: 500 });
  }
}
