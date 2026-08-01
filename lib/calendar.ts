/**
 * Phase 4 — shared calendar/scheduling logic.
 *
 * All timestamps cross the wire as UTC ISO strings; every conversion to a
 * wall-clock time happens here on the client, so a student in Lagos and a
 * teacher in Toronto each see the same class in their own local time.
 */

export type CalendarEventType = 'LIVE_CLASS' | 'EXAM' | 'ASSIGNMENT'

export interface CalendarEvent {
  id: string
  type: CalendarEventType
  title: string
  description: string | null
  /** UTC ISO string. */
  startsAt: string
  /** UTC ISO string; null for deadline-style events. */
  endsAt: string | null
  courseTitle: string | null
  teacherName: string | null
  /** Live-class only — the room to join. */
  roomId: string | null
  isLive: boolean
}

/** A class becomes joinable this many minutes before its start time. */
export const JOIN_WINDOW_MIN = 15

export const EVENT_STYLES: Record<
  CalendarEventType,
  { dot: string; chip: string; bar: string; label: string }
> = {
  LIVE_CLASS: {
    dot: 'bg-indigo-500',
    chip: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
    bar: 'border-l-indigo-500 bg-indigo-50/60',
    label: 'Live Class',
  },
  EXAM: {
    dot: 'bg-red-500',
    chip: 'bg-red-50 text-red-700 ring-red-600/20',
    bar: 'border-l-red-500 bg-red-50/60',
    label: 'Exam',
  },
  ASSIGNMENT: {
    dot: 'bg-amber-500',
    chip: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    bar: 'border-l-amber-500 bg-amber-50/60',
    label: 'Assignment',
  },
}

/** The viewer's IANA zone, e.g. `"Africa/Lagos"`. Falls back to UTC. */
export function localTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

/** `"09:30 AM"` in the viewer's zone. */
export function toLocalTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

/** `"Mon, Aug 3 · 09:30 AM"` in the viewer's zone. */
export function toLocalDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** `"in 12 min"`, `"in 3 h"`, `"2 days ago"`. */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const diffMs = new Date(iso).getTime() - now.getTime()
  const past = diffMs < 0
  const mins = Math.round(Math.abs(diffMs) / 60000)

  if (mins < 1) return past ? 'just now' : 'now'
  if (mins < 60) return past ? `${mins} min ago` : `in ${mins} min`

  const hours = Math.round(mins / 60)
  if (hours < 24) return past ? `${hours} h ago` : `in ${hours} h`

  const days = Math.round(hours / 24)
  return past ? `${days} day${days === 1 ? '' : 's'} ago` : `in ${days} day${days === 1 ? '' : 's'}`
}

/**
 * Joinable when the room is flagged live, or it starts within the join window
 * and hasn't ended yet. `endsAt` defaults to start + 1h when unset so a class
 * doesn't stay "joinable" forever.
 */
export function isJoinable(event: CalendarEvent, now: Date = new Date()): boolean {
  if (event.type !== 'LIVE_CLASS' || !event.roomId) return false
  if (event.isLive) return true

  const start = new Date(event.startsAt).getTime()
  const end = event.endsAt ? new Date(event.endsAt).getTime() : start + 60 * 60 * 1000

  return now.getTime() >= start - JOIN_WINDOW_MIN * 60 * 1000 && now.getTime() <= end
}

// --- Month grid ------------------------------------------------------------

export interface CalendarCell {
  date: Date
  inCurrentMonth: boolean
  isToday: boolean
}

function startOfDay(d: Date): Date {
  const copy = new Date(d)
  copy.setHours(0, 0, 0, 0)
  return copy
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

/**
 * Six full Sunday-start weeks covering `anchor`'s month. A fixed 42 cells keeps
 * the grid from reflowing as the user pages between months.
 */
export function buildMonthGrid(anchor: Date, now: Date = new Date()): CalendarCell[] {
  const firstOfMonth = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  const gridStart = startOfDay(firstOfMonth)
  gridStart.setDate(gridStart.getDate() - gridStart.getDay())

  const today = startOfDay(now)

  return Array.from({ length: 42 }, (_, i) => {
    const date = new Date(gridStart)
    date.setDate(gridStart.getDate() + i)
    return {
      date,
      inCurrentMonth: date.getMonth() === anchor.getMonth(),
      isToday: isSameDay(date, today),
    }
  })
}

/** The Sunday-start week containing `anchor`. */
export function buildWeekGrid(anchor: Date, now: Date = new Date()): CalendarCell[] {
  const weekStart = startOfDay(anchor)
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())

  const today = startOfDay(now)

  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart)
    date.setDate(weekStart.getDate() + i)
    return { date, inCurrentMonth: true, isToday: isSameDay(date, today) }
  })
}

/** Bucket events by local `YYYY-MM-DD` so the grid can look them up per cell. */
export function groupEventsByDay(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const map = new Map<string, CalendarEvent[]>()

  for (const event of events) {
    const key = dayKey(new Date(event.startsAt))
    const bucket = map.get(key)
    if (bucket) bucket.push(event)
    else map.set(key, [event])
  }

  for (const bucket of map.values()) {
    bucket.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
  }

  return map
}

/** Local-date key. Built from local parts, not `toISOString()`, which is UTC. */
export function dayKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** `"August 2026"` for the header. */
export function monthLabel(date: Date): string {
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
