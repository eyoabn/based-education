import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { PING_INTERVAL_SEC, STALE_AFTER_SEC } from '@/lib/attendance';

/**
 * Phase 4 — attendance heartbeat.
 *
 * POST { roomId, isActive } every PING_INTERVAL_SEC from inside a live room.
 *
 * The first ping creates the Attendance row (joinedAt = now). Subsequent pings
 * credit elapsed time. We credit the *real* gap since the previous ping rather
 * than a flat 30s so that a throttled background tab (browsers clamp timers in
 * hidden tabs) can't silently under- or over-count, and a reconnect after a
 * long gap doesn't award time the student wasn't there for.
 */
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const session = await verifyToken(token);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const roomId: string | undefined = body?.roomId;
    // Default to active: a client that omits the flag is assumed present.
    const isActive: boolean = body?.isActive !== false;

    if (!roomId) {
      return NextResponse.json({ error: 'Missing roomId' }, { status: 400 });
    }

    const room = await prisma.liveRoom.findFirst({
      where: {
        OR: [
          { id: roomId },
          { title: roomId },
        ],
      },
      select: { id: true, isLive: true, endedAt: true },
    });
    if (!room) {
      return NextResponse.json({ error: 'Room not found', sessionEnded: true }, { status: 404 });
    }

    if (!room.isLive || room.endedAt !== null) {
      await prisma.attendance.updateMany({
        where: { roomId: room.id, studentId: session.userId },
        data: { leftAt: new Date(), isActive: false },
      }).catch(() => {});

      return NextResponse.json({
        ok: false,
        isLive: false,
        sessionEnded: true,
        message: 'Live session has ended.',
      });
    }

    const now = new Date();
    const canonicalRoomId = room.id;
    const isClosing = request.nextUrl.searchParams.get('close') === '1' || body?.close === true;
    const effectiveIsActive = isClosing ? false : isActive;

    const existing = await prisma.attendance.findUnique({
      where: { roomId_studentId: { roomId: canonicalRoomId, studentId: session.userId } },
      select: { id: true, durationSec: true, activeSec: true, lastPingAt: true },
    });

    // First ping of the session — open the attendance record.
    if (!existing) {
      const created = await prisma.attendance.create({
        data: {
          roomId: canonicalRoomId,
          studentId: session.userId,
          joinedAt: now,
          leftAt: now,
          lastPingAt: now,
          durationSec: 0,
          activeSec: 0,
          isActive: effectiveIsActive,
        },
        select: { durationSec: true, activeSec: true },
      });

      return NextResponse.json({
        ok: true,
        durationSec: created.durationSec,
        activeSec: created.activeSec,
        nextPingInSec: PING_INTERVAL_SEC,
      });
    }

    // Elapsed since previous ping. If gap is longer than STALE_AFTER_SEC,
    // the student was disconnected/away, so credit 0 for that disconnected window.
    const elapsedSec = existing.lastPingAt
      ? Math.round((now.getTime() - existing.lastPingAt.getTime()) / 1000)
      : PING_INTERVAL_SEC;
    const creditedSec = elapsedSec <= STALE_AFTER_SEC ? Math.max(0, elapsedSec) : 0;

    const updated = await prisma.attendance.update({
      where: { roomId_studentId: { roomId: canonicalRoomId, studentId: session.userId } },
      data: {
        durationSec: existing.durationSec + creditedSec,
        // Attention time only accrues while the tab is actually visible.
        activeSec: existing.activeSec + (effectiveIsActive ? creditedSec : 0),
        leftAt: now,
        lastPingAt: now,
        isActive: effectiveIsActive,
      },
      select: { durationSec: true, activeSec: true },
    });

    return NextResponse.json({
      ok: true,
      durationSec: updated.durationSec,
      activeSec: updated.activeSec,
      nextPingInSec: PING_INTERVAL_SEC,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to record attendance ping' }, { status: 500 });
  }
}

/**
 * Sent on unload (via `navigator.sendBeacon`) or when the student clicks
 * Leave — closes the record immediately with exact leave timestamp.
 */
export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const session = await verifyToken(token);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');
    if (!roomId) return NextResponse.json({ error: 'Missing roomId' }, { status: 400 });

    const room = await prisma.liveRoom.findFirst({
      where: {
        OR: [{ id: roomId }, { title: roomId }],
      },
      select: { id: true },
    });

    const targetRoomId = room?.id ?? roomId;

    await prisma.attendance.updateMany({
      where: { roomId: targetRoomId, studentId: session.userId },
      data: { leftAt: new Date(), isActive: false },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to close attendance record' }, { status: 500 });
  }
}
