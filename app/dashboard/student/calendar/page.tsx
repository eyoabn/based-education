"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  AlertCircle,
  CalendarDays,
  Clock,
  FileText,
  Globe,
  GraduationCap,
  Radio,
  Video,
} from "lucide-react"
import ScheduleCalendar from "@/components/calendar/ScheduleCalendar"
import {
  EVENT_STYLES,
  isJoinable,
  JOIN_WINDOW_MIN,
  localTimeZone,
  relativeTime,
  toLocalDateTime,
  toLocalTime,
  type CalendarEvent,
} from "@/lib/calendar"

/** Re-tick often enough that "starts in 15 min" flips to joinable promptly. */
const TICK_MS = 30_000

const TYPE_ICON = {
  LIVE_CLASS: Video,
  EXAM: FileText,
  ASSIGNMENT: GraduationCap,
} as const

/** The prominent card shown for a class that is live or about to start. */
function JoinNowCard({ event, now }: { event: CalendarEvent; now: Date }) {
  return (
    <div className="bg-white rounded-xl border-2 border-emerald-500 animate-live-border shadow-sm p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="live-indicator">
              <span className="live-dot" />
              {event.isLive ? "Live Now" : "Starting Soon"}
            </span>
            {event.courseTitle && (
              <span className="text-xs font-semibold text-slate-400 truncate">
                {event.courseTitle}
              </span>
            )}
          </div>
          <h3 className="font-bold text-slate-900 leading-snug truncate">{event.title}</h3>
          {event.teacherName && (
            <p className="text-xs text-slate-500 mt-0.5">with {event.teacherName}</p>
          )}
        </div>
      </div>

      {event.description && (
        <p className="text-sm text-slate-600 mb-4 line-clamp-2">{event.description}</p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex items-center gap-1.5 text-xs text-slate-500">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          {toLocalTime(event.startsAt)}
          {event.endsAt && ` – ${toLocalTime(event.endsAt)}`}
          <span className="text-slate-300">·</span>
          <span className="font-semibold text-emerald-600">
            {relativeTime(event.startsAt, now)}
          </span>
        </span>

        <Link
          href={`/dashboard/student/live/${event.roomId}`}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-lg transition-colors shadow-sm"
        >
          <Radio className="w-4 h-4 animate-pulse" />
          Join Live Stream Now
        </Link>
      </div>
    </div>
  )
}

export default function StudentCalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<CalendarEvent | null>(null)
  const [now, setNow] = useState(() => new Date())

  const timeZone = localTimeZone()

  const loadSchedule = useCallback(async () => {
    try {
      const res = await fetch("/api/schedules")
      const data = await res.json()
      if (data.error) setError(data.error)
      else {
        setError(null)
        setEvents(data.events ?? [])
      }
    } catch {
      setError("Could not load your calendar.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadSchedule()
  }, [loadSchedule])

  // Keep relative times and the join window fresh without refetching.
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), TICK_MS)
    return () => clearInterval(interval)
  }, [])

  const joinableNow = useMemo(
    () => events.filter(e => isJoinable(e, now)),
    [events, now]
  )

  const upcoming = useMemo(
    () =>
      events
        .filter(e => new Date(e.startsAt).getTime() > now.getTime())
        .filter(e => !joinableNow.some(j => j.id === e.id))
        .slice(0, 8),
    [events, now, joinableNow]
  )

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Calendar</h1>
          <p className="text-sm text-slate-500 mt-1">
            Live classes, exams and assignment deadlines in one place.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-600 shadow-sm">
          <Globe className="w-3.5 h-3.5 text-indigo-500" />
          <span>
            Times shown in <span className="font-semibold text-slate-800">{timeZone}</span>
          </span>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Join-now hero cards */}
      {joinableNow.length > 0 && (
        <div className="space-y-3">
          {joinableNow.map(event => (
            <JoinNowCard key={event.id} event={event} now={now} />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Calendar grid */}
        <div className="xl:col-span-2">
          <ScheduleCalendar
            events={events}
            accent="indigo"
            loading={loading}
            onSelectEvent={setSelected}
          />
        </div>

        {/* Side rail */}
        <div className="space-y-4">
          {/* Selected event detail */}
          {selected && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 animate-fade-up">
              <div className="flex items-start justify-between gap-2 mb-2">
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ring-inset ${EVENT_STYLES[selected.type].chip}`}
                >
                  {EVENT_STYLES[selected.type].label}
                </span>
                <button
                  onClick={() => setSelected(null)}
                  className="text-xs font-semibold text-slate-400 hover:text-slate-700 transition-colors"
                >
                  Clear
                </button>
              </div>

              <h3 className="font-bold text-slate-900 leading-snug">{selected.title}</h3>
              {selected.description && (
                <p className="text-sm text-slate-600 mt-1.5">{selected.description}</p>
              )}

              <div className="mt-3 space-y-1.5 text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {toLocalDateTime(selected.startsAt)}
                  {selected.endsAt && ` – ${toLocalTime(selected.endsAt)}`}
                </div>
                {selected.courseTitle && (
                  <div className="flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                    {selected.courseTitle}
                  </div>
                )}
                {selected.teacherName && (
                  <div className="flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                    {selected.teacherName}
                  </div>
                )}
              </div>

              {selected.type === "LIVE_CLASS" && selected.roomId && (
                <Link
                  href={`/dashboard/student/live/${selected.roomId}`}
                  className={`mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                    isJoinable(selected, now)
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : "bg-slate-100 text-slate-400 pointer-events-none"
                  }`}
                >
                  <Video className="w-4 h-4" />
                  {isJoinable(selected, now)
                    ? "Join Live Stream Now"
                    : `Opens ${JOIN_WINDOW_MIN} min before start`}
                </Link>
              )}
            </div>
          )}

          {/* Upcoming */}
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-3">
              Coming Up
            </h2>

            {loading && (
              <div className="space-y-2">
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    className="h-16 bg-white rounded-xl border border-slate-200 animate-pulse"
                  />
                ))}
              </div>
            )}

            {!loading && upcoming.length === 0 && joinableNow.length === 0 && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
                <CalendarDays className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600 font-semibold text-sm">You are all clear</p>
                <p className="text-xs text-slate-400 mt-1">
                  No classes, exams or deadlines coming up.
                </p>
              </div>
            )}

            <div className="space-y-2">
              {upcoming.map(event => {
                const Icon = TYPE_ICON[event.type]
                const style = EVENT_STYLES[event.type]

                return (
                  <button
                    key={event.id}
                    onClick={() => setSelected(event)}
                    className={`w-full text-left bg-white rounded-xl border border-slate-200 border-l-4 ${style.bar} shadow-sm p-3 hover:shadow-md transition-shadow`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${style.chip}`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-slate-800 text-sm truncate">
                          {event.title}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                          <span>{toLocalDateTime(event.startsAt)}</span>
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-400 whitespace-nowrap shrink-0">
                        {relativeTime(event.startsAt, now)}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
