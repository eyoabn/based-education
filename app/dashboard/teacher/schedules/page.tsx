"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import {
  AlertCircle,
  CalendarPlus,
  CheckCircle2,
  Clock,
  Radio,
  Users,
  Video,
} from "lucide-react"
import ScheduleCalendar from "@/components/calendar/ScheduleCalendar"
import ScheduleModal from "@/components/calendar/ScheduleModal"
import {
  isJoinable,
  localTimeZone,
  relativeTime,
  toLocalDateTime,
  toLocalTime,
  type CalendarEvent,
} from "@/lib/calendar"

export default function TeacherSchedulesPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [presetDate, setPresetDate] = useState<Date | null>(null)
  const [toast, setToast] = useState<string | null>(null)

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
      setError("Could not load your timetable.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadSchedule()
  }, [loadSchedule])

  const handleCreated = (event: CalendarEvent, notifiedCount: number) => {
    setEvents(prev =>
      [...prev, event].sort(
        (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
      )
    )
    setToast(
      `"${event.title}" scheduled — ${notifiedCount} student${notifiedCount === 1 ? "" : "s"} notified.`
    )
    setTimeout(() => setToast(null), 5000)
  }

  const now = new Date()
  const upcoming = events
    .filter(e => new Date(e.startsAt).getTime() >= now.getTime() - 60 * 60 * 1000)
    .slice(0, 6)

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.25)] text-[#d4af37] text-xs font-semibold tracking-wider uppercase mb-2">
            Faculty Scheduling Console
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#f7f3e8] tracking-tight">Live Schedules</h1>
          <p className="text-sm text-[#9d9b95] mt-1">
            Plan live studio sessions, dispatch syllabus deadlines, and notify students in {localTimeZone()}.
          </p>
        </div>

        <button
          onClick={() => {
            setPresetDate(null)
            setModalOpen(true)
          }}
          className="inline-flex min-h-[44px] items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#d4af37] to-[#e6ca65] hover:brightness-110 text-[#050505] font-bold text-xs sm:text-sm rounded-xl transition-all shadow-lg shadow-[rgba(212,175,55,0.25)] active:scale-95"
        >
          <CalendarPlus className="w-4 h-4" />
          Schedule New Live Class
        </button>
      </div>

      {toast && (
        <div className="flex items-center gap-2 px-4 py-3 bg-[rgba(212,175,55,0.15)] border border-[rgba(212,175,55,0.3)] rounded-xl text-sm text-[#d4af37] font-semibold animate-fade-up">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-[#d4af37]" />
          {toast}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-sm text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="xl:col-span-2">
          <ScheduleCalendar
            events={events}
            accent="emerald"
            loading={loading}
            onSelectDate={date => {
              setPresetDate(date)
              setModalOpen(true)
            }}
          />
          <p className="text-xs text-[#9d9b95] mt-2 px-1">
            Tip: click any day on the calendar grid to pre-select that date for a new class.
          </p>
        </div>

        {/* Upcoming list */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-[#d4af37] uppercase tracking-wider">
            Upcoming Faculty Sessions
          </h2>

          {loading && (
            <div className="space-y-3">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="h-24 bg-[#111110] rounded-xl border border-white/[0.08] animate-pulse"
                />
              ))}
            </div>
          )}

          {!loading && upcoming.length === 0 && (
            <div className="bg-[#111110] rounded-2xl border border-white/[0.08] shadow-xl p-8 text-center">
              <Video className="w-8 h-8 text-[#d4af37]/40 mx-auto mb-3" />
              <p className="text-[#f7f3e8] font-bold text-sm">Nothing scheduled yet</p>
              <p className="text-xs text-[#9d9b95] mt-1">
                Schedule your first live class above to notify enrolled students.
              </p>
            </div>
          )}

          {upcoming.map(event => {
            const joinable = isJoinable(event, now)
            return (
              <div
                key={event.id}
                className={`bg-[#111110] rounded-2xl border shadow-xl p-4 sm:p-5 transition-all ${
                  joinable
                    ? "border-2 border-[#d4af37] shadow-[rgba(212,175,55,0.15)] animate-live-border"
                    : "border-white/[0.08] hover:border-[rgba(212,175,55,0.3)]"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-bold text-[#f7f3e8] text-sm leading-snug">{event.title}</h3>
                  {joinable && (
                    <span className="live-indicator shrink-0">
                      <span className="live-dot" />
                      {event.isLive ? "Live" : "Soon"}
                    </span>
                  )}
                </div>

                {event.description && (
                  <p className="text-xs text-[#9d9b95] mb-3 line-clamp-2">{event.description}</p>
                )}

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[#9d9b95] mb-3">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#d4af37]" />
                    {toLocalDateTime(event.startsAt)}
                    {event.endsAt && ` – ${toLocalTime(event.endsAt)}`}
                  </span>
                  {event.courseTitle && (
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-[#d4af37]" />
                      {event.courseTitle}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-white/[0.06]">
                  <span className="text-xs font-semibold text-[#d4af37]">
                    {relativeTime(event.startsAt, now)}
                  </span>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/dashboard/teacher/attendance`}
                      className="text-xs font-semibold text-[#9d9b95] hover:text-[#f7f3e8] px-2.5 py-1.5 rounded-lg hover:bg-white/[0.06] transition-colors"
                    >
                      Attendance
                    </Link>
                    <Link
                      href={`/dashboard/teacher/live/${event.roomId}`}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        joinable
                          ? "bg-gradient-to-r from-rose-600 to-rose-500 hover:brightness-110 text-white shadow-md shadow-rose-900/30"
                          : "bg-gradient-to-r from-[#d4af37] to-[#e6ca65] hover:brightness-110 text-[#050505] shadow-sm"
                      }`}
                    >
                      <Radio className={`w-3 h-3 ${joinable ? "animate-pulse" : ""}`} />
                      {joinable ? "Go Live" : "Open Studio"}
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <ScheduleModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={handleCreated}
        defaultDate={presetDate}
      />
    </div>
  )
}
