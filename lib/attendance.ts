/**
 * Phase 4 — shared attendance domain logic.
 *
 * Imported by both the API routes (server) and the dashboard components
 * (client), so everything in here must stay free of Node/browser globals.
 */

/** How often the in-room heartbeat fires. Must match AttendanceHeartbeat.tsx. */
export const PING_INTERVAL_SEC = 30

/**
 * A student is considered disconnected once we have not heard a ping for
 * longer than this. Four missed pings' worth of slack keeps a brief network
 * blip from flipping someone to "offline".
 */
export const STALE_AFTER_SEC = 120

/** Joining later than this many minutes after the scheduled start is "Late". */
export const LATE_GRACE_MIN = 5

/** Leaving with more than this share of the class remaining is "Left Early". */
export const LEFT_EARLY_RATIO = 0.8

export type AttendanceStatus = 'PRESENT' | 'LATE' | 'LEFT_EARLY' | 'ABSENT'

export interface AttendanceRow {
  attendanceId: string | null
  studentId: string
  name: string
  email: string
  avatarUrl: string | null
  /** ISO strings — serialised over JSON, converted to local time in the UI. */
  joinedAt: string | null
  leftAt: string | null
  durationSec: number
  activeSec: number
  /** activeSec / durationSec, 0-100, rounded. */
  attentionPct: number
  /** Currently connected (pinged within STALE_AFTER_SEC). */
  isActive: boolean
  status: AttendanceStatus
}

export interface AttendanceSummary {
  totalEnrolled: number
  totalAttended: number
  attendanceRatePct: number
  avgDurationSec: number
  sessionDurationSec: number
  onTimeRatePct: number
  presentCount: number
  lateCount: number
  leftEarlyCount: number
  absentCount: number
  liveNowCount: number
  avgAttentionPct: number
}

export interface AttendanceReport {
  room: {
    id: string
    title: string
    scheduledAt: string
    endsAt: string | null
    isLive: boolean
    courseTitle: string | null
  }
  summary: AttendanceSummary
  rows: AttendanceRow[]
}

export interface RoomOption {
  id: string
  title: string
  scheduledAt: string
  isLive: boolean
  courseTitle: string | null
  attendeeCount: number
}

/** True when the last heartbeat is recent enough to count as connected. */
export function isPresenceFresh(lastPingAt: Date | string | null, now: Date = new Date()): boolean {
  if (!lastPingAt) return false
  const last = typeof lastPingAt === 'string' ? new Date(lastPingAt) : lastPingAt
  return now.getTime() - last.getTime() <= STALE_AFTER_SEC * 1000
}

export function attentionPct(activeSec: number, durationSec: number): number {
  if (durationSec <= 0) return 0
  return Math.min(100, Math.round((activeSec / durationSec) * 100))
}

/**
 * Classify one student's participation in a session.
 *
 * `sessionEndsAt` is the scheduled end when known, otherwise "now" for a
 * session that is still running — a student in a live class can't be judged
 * against an end time that hasn't happened yet.
 */
export function deriveStatus(params: {
  joinedAt: Date | null
  leftAt: Date | null
  durationSec: number
  scheduledAt: Date
  sessionEndsAt: Date
  stillConnected: boolean
}): AttendanceStatus {
  const { joinedAt, leftAt, durationSec, scheduledAt, sessionEndsAt, stillConnected } = params

  if (!joinedAt) return 'ABSENT'

  const lateByMs = joinedAt.getTime() - scheduledAt.getTime()
  if (lateByMs > LATE_GRACE_MIN * 60 * 1000) return 'LATE'

  // Someone still in the room can't have left early.
  if (!stillConnected) {
    const sessionSec = Math.max(1, (sessionEndsAt.getTime() - scheduledAt.getTime()) / 1000)
    const leftBeforeEnd = leftAt ? leftAt.getTime() < sessionEndsAt.getTime() - 60 * 1000 : false
    if (leftBeforeEnd && durationSec < sessionSec * LEFT_EARLY_RATIO) return 'LEFT_EARLY'
  }

  return 'PRESENT'
}

export const STATUS_LABEL: Record<AttendanceStatus, string> = {
  PRESENT: 'Present',
  LATE: 'Late',
  LEFT_EARLY: 'Left Early',
  ABSENT: 'Absent',
}

export const STATUS_STYLE: Record<AttendanceStatus, string> = {
  PRESENT: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  LATE: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  LEFT_EARLY: 'bg-orange-50 text-orange-700 ring-orange-600/20',
  ABSENT: 'bg-red-50 text-red-700 ring-red-600/20',
}

/** `3720` -> `"1h 02m"`, `2700` -> `"45m 00s"`. */
export function formatDuration(totalSec: number): string {
  if (!totalSec || totalSec < 0) return '—'
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = Math.floor(totalSec % 60)
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`
  return `${m}m ${String(s).padStart(2, '0')}s`
}

/** Local-time clock, e.g. `"09:04 AM"`. Returns an em dash for null. */
export function formatClock(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** RFC 4180 escaping — quotes doubled, field wrapped when it contains a delimiter. */
function csvCell(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value)
  if (/[",\r\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`
  return str
}

export function buildAttendanceCsv(report: AttendanceReport): string {
  const { room, summary, rows } = report

  const meta: string[][] = [
    ['EduConnect Attendance Report'],
    ['Class', room.title],
    ['Course', room.courseTitle ?? 'General'],
    ['Scheduled', new Date(room.scheduledAt).toLocaleString()],
    ['Generated', new Date().toLocaleString()],
    ['Enrolled', String(summary.totalEnrolled)],
    ['Attended', String(summary.totalAttended)],
    ['Attendance Rate', `${summary.attendanceRatePct}%`],
    ['Average Duration', formatDuration(summary.avgDurationSec)],
    ['On-Time Rate', `${summary.onTimeRatePct}%`],
    [],
  ]

  const header = [
    'Student Name',
    'Email',
    'Join Time',
    'Leave Time',
    'Total Duration',
    'Duration (seconds)',
    'Active Attention %',
    'Status',
  ]

  const body = rows.map(r => [
    r.name,
    r.email,
    r.joinedAt ? new Date(r.joinedAt).toLocaleString() : '',
    r.leftAt ? new Date(r.leftAt).toLocaleString() : '',
    formatDuration(r.durationSec),
    String(r.durationSec),
    r.joinedAt ? `${r.attentionPct}%` : '',
    STATUS_LABEL[r.status],
  ])

  return [...meta, header, ...body]
    .map(row => row.map(csvCell).join(','))
    .join('\r\n')
}
