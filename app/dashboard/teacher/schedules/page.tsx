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
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Schedules</h1>
          <p className="text-sm text-slate-500 mt-1">
            Plan live classes and notify your students automatically. All times shown in{" "}
            {localTimeZone()}.
          </p>
        </div>

        <button
          onClick={() => {
            setPresetDate(null)
            setModalOpen(true)
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-lg transition-colors shadow-sm"
        >
          <CalendarPlus className="w-4 h-4" />
          Schedule New Live Class
        </button>
      </div>

      {toast && (
        <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800 animate-fade-up">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {toast}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
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
          <p className="text-xs text-slate-400 mt-2 px-1">
            Tip: click any day to schedule a class on that date.
          </p>
        </div>

        {/* Upcoming list */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
            Upcoming Classes
          </h2>

          {loading && (
            <div className="space-y-3">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="h-24 bg-white rounded-xl border border-slate-200 animate-pulse"
                />
              ))}
            </div>
          )}

          {!loading && upcoming.length === 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
              <Video className="w-8 h-8 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 font-semibold text-sm">Nothing scheduled yet</p>
              <p className="text-xs text-slate-400 mt-1">
                Create your first live class to get started.
              </p>
            </div>
          )}

          {upcoming.map(event => {
            const joinable = isJoinable(event, now)
            return (
              <div
                key={event.id}
                className={`bg-white rounded-xl border shadow-sm p-4 transition-all ${
                  joinable
                    ? "border-2 border-emerald-500 animate-live-border"
                    : "border-slate-200"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-bold text-slate-900 text-sm leading-snug">{event.title}</h3>
                  {joinable && (
                    <span className="live-indicator shrink-0">
                      <span className="live-dot" />
                      {event.isLive ? "Live" : "Soon"}
                    </span>
                  )}
                </div>

                {event.description && (
                  <p className="text-xs text-slate-500 mb-3 line-clamp-2">{event.description}</p>
                )}

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 mb-3">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {toLocalDateTime(event.startsAt)}
                    {event.endsAt && ` – ${toLocalTime(event.endsAt)}`}
                  </span>
                  {event.courseTitle && (
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      {event.courseTitle}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-400">
                    {relativeTime(event.startsAt, now)}
                  </span>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/dashboard/teacher/attendance`}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
                    >
                      Attendance
                    </Link>
                    <Link
                      href={`/dashboard/teacher/live/${event.roomId}`}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        joinable
                          ? "bg-red-600 hover:bg-red-700 text-white"
                          : "bg-slate-100 hover:bg-slate-200 text-slate-700"
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
