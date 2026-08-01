import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import {
  attentionPct,
  deriveStatus,
  isPresenceFresh,
  LATE_GRACE_MIN,
  type AttendanceReport,
  type AttendanceRow,
  type AttendanceStatus,
  type RoomOption,
} from '@/lib/attendance';

/**
 * Phase 4 — attendance analytics.
 *
 * GET /api/attendance/report              -> list of the teacher's rooms (for the picker)
 * GET /api/attendance/report?roomId=<id>  -> full report for one room
 *
 * Teacher-only, and scoped to rooms the requesting teacher owns.
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const session = await verifyToken(token);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.role !== 'TEACHER' && session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');

    // --- Room picker: recent + past sessions for this teacher -----------------
    if (!roomId) {
      const rooms = await prisma.liveRoom.findMany({
        where: session.role === 'ADMIN' ? {} : { teacherId: session.userId },
        orderBy: { scheduledAt: 'desc' },
        take: 50,
        select: {
          id: true,
          title: true,
          scheduledAt: true,
          isLive: true,
          course: { select: { title: true } },
          _count: { select: { attendances: true } },
        },
      });

      const options: RoomOption[] = rooms.map(r => ({
        id: r.id,
        title: r.title,
        scheduledAt: r.scheduledAt.toISOString(),
        isLive: r.isLive,
        courseTitle: r.course?.title ?? null,
        attendeeCount: r._count.attendances,
      }));

      return NextResponse.json({ rooms: options });
    }

    // --- Full report for one room --------------------------------------------
    const room = await prisma.liveRoom.findUnique({
      where: { id: roomId },
      select: {
        id: true,
        title: true,
        teacherId: true,
        scheduledAt: true,
        endsAt: true,
        isLive: true,
        courseId: true,
        course: {
          select: {
            title: true,
            students: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
        },
        attendances: {
          select: {
            id: true,
            studentId: true,
            joinedAt: true,
            leftAt: true,
            durationSec: true,
            activeSec: true,
            lastPingAt: true,
            student: { select: { id: true, name: true, email: true, avatarUrl: true } },
          },
        },
      },
    });

    if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    if (session.role !== 'ADMIN' && room.teacherId !== session.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const now = new Date();
    // A session that is still running is measured against "now"; a finished one
    // against its scheduled end (falling back to the last recorded departure).
    const lastLeft = room.attendances.reduce<Date | null>((latest, a) => {
      if (!a.leftAt) return latest;
      return !latest || a.leftAt > latest ? a.leftAt : latest;
    }, null);
    const sessionEndsAt = room.isLive
      ? now
      : (room.endsAt ?? lastLeft ?? room.scheduledAt);

    const attendedByStudent = new Map(room.attendances.map(a => [a.studentId, a]));

    // The roster is the enrolled cohort. Anyone who attended without being
    // enrolled (guest, late enrolment) is appended so they are never dropped.
    const roster = room.course?.students ?? [];
    const rosterIds = new Set(roster.map(s => s.id));
    const extras = room.attendances
      .filter(a => !rosterIds.has(a.studentId))
      .map(a => a.student);
    const allStudents = [...roster, ...extras];

    const rows: AttendanceRow[] = allStudents.map(student => {
      const record = attendedByStudent.get(student.id);

      if (!record) {
        return {
          attendanceId: null,
          studentId: student.id,
          name: student.name,
          email: student.email,
          avatarUrl: student.avatarUrl,
          joinedAt: null,
          leftAt: null,
          durationSec: 0,
          activeSec: 0,
          attentionPct: 0,
          isActive: false,
          status: 'ABSENT' as AttendanceStatus,
        };
      }

      // Derive "currently connected" from the last ping rather than trusting
      // the stored flag — a student whose browser died never sends a close.
      const stillConnected = room.isLive && isPresenceFresh(record.lastPingAt, now);

      return {
        attendanceId: record.id,
        studentId: student.id,
        name: student.name,
        email: student.email,
        avatarUrl: student.avatarUrl,
        joinedAt: record.joinedAt.toISOString(),
        leftAt: record.leftAt ? record.leftAt.toISOString() : null,
        durationSec: record.durationSec,
        activeSec: record.activeSec,
        attentionPct: attentionPct(record.activeSec, record.durationSec),
        isActive: stillConnected,
        status: deriveStatus({
          joinedAt: record.joinedAt,
          leftAt: record.leftAt,
          durationSec: record.durationSec,
          scheduledAt: room.scheduledAt,
          sessionEndsAt,
          stillConnected,
        }),
      };
    });

    // Sort: attendees first (longest first), absentees last, then by name.
    rows.sort((a, b) => {
      if (!!a.joinedAt !== !!b.joinedAt) return a.joinedAt ? -1 : 1;
      if (b.durationSec !== a.durationSec) return b.durationSec - a.durationSec;
      return a.name.localeCompare(b.name);
    });

    const attended = rows.filter(r => r.joinedAt);
    const totalEnrolled = roster.length || allStudents.length;
    const totalAttended = attended.length;

    const onTimeCount = attended.filter(r => {
      const joined = new Date(r.joinedAt as string).getTime();
      return joined - room.scheduledAt.getTime() <= LATE_GRACE_MIN * 60 * 1000;
    }).length;

    const sumDuration = attended.reduce((sum, r) => sum + r.durationSec, 0);
    const sumAttention = attended.reduce((sum, r) => sum + r.attentionPct, 0);

    const sessionDurationSec = Math.max(
      0,
      Math.round((sessionEndsAt.getTime() - room.scheduledAt.getTime()) / 1000)
    );

    const report: AttendanceReport = {
      room: {
        id: room.id,
        title: room.title,
        scheduledAt: room.scheduledAt.toISOString(),
        endsAt: room.endsAt ? room.endsAt.toISOString() : null,
        isLive: room.isLive,
        courseTitle: room.course?.title ?? null,
      },
      summary: {
        totalEnrolled,
        totalAttended,
        attendanceRatePct: totalEnrolled ? Math.round((totalAttended / totalEnrolled) * 100) : 0,
        avgDurationSec: totalAttended ? Math.round(sumDuration / totalAttended) : 0,
        sessionDurationSec,
        onTimeRatePct: totalAttended ? Math.round((onTimeCount / totalAttended) * 100) : 0,
        presentCount: rows.filter(r => r.status === 'PRESENT').length,
        lateCount: rows.filter(r => r.status === 'LATE').length,
        leftEarlyCount: rows.filter(r => r.status === 'LEFT_EARLY').length,
        absentCount: rows.filter(r => r.status === 'ABSENT').length,
        liveNowCount: rows.filter(r => r.isActive).length,
        avgAttentionPct: totalAttended ? Math.round(sumAttention / totalAttended) : 0,
      },
      rows,
    };

    return NextResponse.json(report);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to build attendance report' }, { status: 500 });
  }
}
