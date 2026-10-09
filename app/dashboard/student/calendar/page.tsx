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
    <div className="bg-[#111110] rounded-2xl border-2 border-[#d4af37] shadow-xl shadow-[rgba(212,175,55,0.15)] p-5 animate-live-border">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="live-indicator">
              <span className="live-dot" />
              {event.isLive ? "Live Now" : "Starting Soon"}
            </span>
            {event.courseTitle && (
              <span className="text-xs font-semibold text-[#9d9b95] truncate">
                {event.courseTitle}
              </span>
            )}
          </div>
          <h3 className="font-bold text-[#f7f3e8] text-base sm:text-lg leading-snug truncate">{event.title}</h3>
          {event.teacherName && (
            <p className="text-xs text-[#9d9b95] mt-0.5">Faculty: {event.teacherName}</p>
          )}
        </div>
      </div>

      {event.description && (
        <p className="text-sm text-[#9d9b95] mb-4 line-clamp-2">{event.description}</p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex items-center gap-1.5 text-xs text-[#9d9b95]">
          <Clock className="w-3.5 h-3.5 text-[#d4af37]" />
          {toLocalTime(event.startsAt)}
          {event.endsAt && ` – ${toLocalTime(event.endsAt)}`}
          <span className="text-white/20">·</span>
          <span className="font-semibold text-emerald-400">
            {relativeTime(event.startsAt, now)}
          </span>
        </span>

        <Link
          href={`/dashboard/student/live/${event.roomId}`}
          className="inline-flex min-h-[44px] items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#d4af37] to-[#e6ca65] hover:brightness-110 text-[#050505] font-bold text-xs sm:text-sm rounded-xl transition-all shadow-lg shadow-[rgba(212,175,55,0.25)] active:scale-95"
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.25)] text-[#d4af37] text-xs font-semibold tracking-wider uppercase mb-2">
            Academic Schedule
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#f7f3e8] tracking-tight">My Calendar</h1>
          <p className="text-sm text-[#9d9b95] mt-1">
            Live classes, examinations, and project milestones in one synchronized timetable.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3.5 py-2 bg-[#111110] border border-white/[0.08] rounded-xl text-xs text-[#9d9b95] shadow-sm">
          <Globe className="w-3.5 h-3.5 text-[#d4af37]" />
          <span>
            Times in <span className="font-semibold text-[#f7f3e8]">{timeZone}</span>
          </span>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-sm text-rose-300">
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
            <div className="bg-[#111110] rounded-2xl border border-white/[0.08] shadow-xl shadow-black/40 p-5 animate-fade-up">
              <div className="flex items-start justify-between gap-2 mb-2">
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ring-1 ring-inset ${EVENT_STYLES[selected.type].chip}`}
                >
                  {EVENT_STYLES[selected.type].label}
                </span>
                <button
                  onClick={() => setSelected(null)}
                  className="text-xs font-semibold text-[#9d9b95] hover:text-[#f7f3e8] transition-colors"
                >
                  Clear
                </button>
              </div>

              <h3 className="font-bold text-[#f7f3e8] text-base leading-snug">{selected.title}</h3>
              {selected.description && (
                <p className="text-sm text-[#9d9b95] mt-1.5">{selected.description}</p>
              )}

              <div className="mt-4 space-y-2 text-xs text-[#9d9b95]">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#d4af37]" />
                  <span>
                    {toLocalDateTime(selected.startsAt)}
                    {selected.endsAt && ` – ${toLocalTime(selected.endsAt)}`}
                  </span>
                </div>
                {selected.courseTitle && (
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-[#d4af37]" />
                    <span>{selected.courseTitle}</span>
                  </div>
                )}
                {selected.teacherName && (
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-[#d4af37]" />
                    <span>{selected.teacherName}</span>
                  </div>
                )}
              </div>

              {selected.type === "LIVE_CLASS" && selected.roomId && (
                selected.isLive ? (
                  <Link
                    href={`/dashboard/student/live/${selected.roomId}`}
                    className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all bg-gradient-to-r from-[#d4af37] to-[#e6ca65] hover:brightness-110 text-[#050505] shadow-lg shadow-[rgba(212,175,55,0.25)]"
                  >
                    <Radio className="w-4 h-4 animate-pulse" />
                    Join Live Stream Now
                  </Link>
                ) : (
                  <div className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#181817] text-[#9d9b95] border border-white/[0.08]">
                    <Clock className="w-3.5 h-3.5 text-[#d4af37]" />
                    Scheduled · Waiting for instructor to start stream
                  </div>
                )
              )}
            </div>
          )}

          {/* Upcoming */}
          <div>
            <h2 className="text-xs font-bold text-[#d4af37] uppercase tracking-wider mb-3">
              Upcoming Schedule
            </h2>

            {loading && (
              <div className="space-y-2">
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    className="h-16 bg-[#111110] rounded-xl border border-white/[0.08] animate-pulse"
                  />
                ))}
              </div>
            )}

            {!loading && upcoming.length === 0 && joinableNow.length === 0 && (
              <div className="bg-[#111110] rounded-2xl border border-white/[0.08] shadow-xl p-8 text-center">
                <CalendarDays className="w-8 h-8 text-[#d4af37]/40 mx-auto mb-3" />
                <p className="text-[#f7f3e8] font-bold text-sm">Schedule is all clear</p>
                <p className="text-xs text-[#9d9b95] mt-1">
                  No upcoming classes, examinations or submission deadlines.
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
                    className={`w-full text-left bg-[#111110] rounded-xl border border-white/[0.08] border-l-4 ${style.bar} p-3.5 hover:border-[rgba(212,175,55,0.3)] hover:bg-[#181817] transition-all cursor-pointer`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${style.chip}`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-[#f7f3e8] text-sm truncate">
                          {event.title}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-[#9d9b95] mt-0.5">
                          <span>{toLocalDateTime(event.startsAt)}</span>
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold text-[#d4af37] whitespace-nowrap shrink-0">
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
