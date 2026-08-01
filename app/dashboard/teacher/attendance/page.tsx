"use client"

import { useCallback, useEffect, useState } from "react"
import {
  AlertCircle,
  CalendarDays,
  ChevronDown,
  Clock,
  Eye,
  Radio,
  RefreshCw,
  Timer,
  TrendingUp,
  Users,
} from "lucide-react"
import AttendanceTable from "@/components/attendance/AttendanceTable"
import AttendanceExportButtons from "@/components/attendance/AttendanceExportButtons"
import { formatDuration, type AttendanceReport, type RoomOption } from "@/lib/attendance"

/** Live sessions refresh on their own so the teacher sees people join. */
const LIVE_REFRESH_MS = 15_000

interface OverviewCardProps {
  icon: typeof Users
  label: string
  value: string
  sub?: string
  tone?: "indigo" | "emerald" | "amber" | "slate"
}

const TONES: Record<NonNullable<OverviewCardProps["tone"]>, string> = {
  indigo: "bg-indigo-50 text-indigo-600",
  emerald: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
  slate: "bg-slate-100 text-slate-600",
}

function OverviewCard({ icon: Icon, label, value, sub, tone = "slate" }: OverviewCardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${TONES[tone]}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="text-2xl font-bold text-slate-900 tracking-tight">{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  )
}

export default function TeacherAttendancePage() {
  const [rooms, setRooms] = useState<RoomOption[]>([])
  const [selectedRoomId, setSelectedRoomId] = useState<string>("")
  const [report, setReport] = useState<AttendanceReport | null>(null)
  const [loadingRooms, setLoadingRooms] = useState(true)
  const [loadingReport, setLoadingReport] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load the room picker once.
  useEffect(() => {
    let cancelled = false

    fetch("/api/attendance/report")
      .then(res => res.json())
      .then((data: { rooms?: RoomOption[]; error?: string }) => {
        if (cancelled) return
        if (data.error) {
          setError(data.error)
          return
        }
        const list = data.rooms ?? []
        setRooms(list)
        // Prefer a session that is live right now, else the most recent.
        const preferred = list.find(r => r.isLive) ?? list[0]
        if (preferred) setSelectedRoomId(preferred.id)
      })
      .catch(() => !cancelled && setError("Could not load your live sessions."))
      .finally(() => !cancelled && setLoadingRooms(false))

    return () => {
      cancelled = true
    }
  }, [])

  const loadReport = useCallback(async (roomId: string, showSpinner = true) => {
    if (!roomId) return
    if (showSpinner) setLoadingReport(true)

    try {
      const res = await fetch(`/api/attendance/report?roomId=${encodeURIComponent(roomId)}`)
      const data = await res.json()
      if (data.error) {
        setError(data.error)
        setReport(null)
      } else {
        setError(null)
        setReport(data as AttendanceReport)
      }
    } catch {
      setError("Could not load the attendance report.")
    } finally {
      setLoadingReport(false)
    }
  }, [])

  useEffect(() => {
    if (selectedRoomId) void loadReport(selectedRoomId)
  }, [selectedRoomId, loadReport])

  // Poll while the selected session is live.
  useEffect(() => {
    if (!report?.room.isLive || !selectedRoomId) return
    const interval = setInterval(() => void loadReport(selectedRoomId, false), LIVE_REFRESH_MS)
    return () => clearInterval(interval)
  }, [report?.room.isLive, selectedRoomId, loadReport])

  const summary = report?.summary

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page header */}
      <div className="no-print flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Student Attendance</h1>
          <p className="text-sm text-slate-500 mt-1">
            Automated presence tracking, attention analytics and exportable reports.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedRoomId && (
            <button
              onClick={() => void loadReport(selectedRoomId)}
              className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-semibold rounded-lg transition-colors shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${loadingReport ? "animate-spin" : ""}`} />
              Refresh
            </button>
          )}
          {report && <AttendanceExportButtons report={report} />}
        </div>
      </div>

      {/* Room selector */}
      <div className="no-print bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <label
          htmlFor="room-select"
          className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2"
        >
          Live Session
        </label>

        {loadingRooms ? (
          <div className="h-10 bg-slate-100 rounded-lg animate-pulse" />
        ) : rooms.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-slate-500 py-2">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            No live sessions yet — schedule one from the Schedules page to start tracking
            attendance.
          </div>
        ) : (
          <div className="relative max-w-xl">
            <select
              id="room-select"
              value={selectedRoomId}
              onChange={e => setSelectedRoomId(e.target.value)}
              className="w-full appearance-none pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none transition-shadow cursor-pointer"
            >
              {rooms.map(room => (
                <option key={room.id} value={room.id}>
                  {room.isLive ? "🔴 LIVE — " : ""}
                  {room.title}
                  {room.courseTitle ? ` (${room.courseTitle})` : ""}
                  {" — "}
                  {new Date(room.scheduledAt).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {` · ${room.attendeeCount} attended`}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {loadingReport && !report && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="h-28 bg-white rounded-xl border border-slate-200 animate-pulse" />
          ))}
        </div>
      )}

      {report && summary && (
        <>
          {/* Printed report header — hidden on screen */}
          <div className="print-only mb-4">
            <h2 className="text-xl font-bold">EduConnect — Attendance Report</h2>
            <p className="text-sm">
              {report.room.title}
              {report.room.courseTitle ? ` · ${report.room.courseTitle}` : ""}
            </p>
            <p className="text-xs">
              Scheduled {new Date(report.room.scheduledAt).toLocaleString()} · Generated{" "}
              {new Date().toLocaleString()}
            </p>
          </div>

          {/* Session banner */}
          <div className="no-print flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <CalendarDays className="w-4 h-4 text-slate-400" />
              <span className="font-semibold text-slate-800">{report.room.title}</span>
              <span className="text-slate-400">·</span>
              <span>{new Date(report.room.scheduledAt).toLocaleString()}</span>
            </div>
            {report.room.isLive && (
              <span className="live-indicator">
                <span className="live-dot" />
                Live now · {summary.liveNowCount} in room
              </span>
            )}
          </div>

          {/* Overview cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <OverviewCard
              icon={Users}
              tone="indigo"
              label="Attended"
              value={`${summary.totalAttended} / ${summary.totalEnrolled}`}
              sub={`${summary.attendanceRatePct}% of enrolled students joined`}
            />
            <OverviewCard
              icon={Timer}
              tone="emerald"
              label="Avg. Duration"
              value={formatDuration(summary.avgDurationSec)}
              sub={`of ${formatDuration(summary.sessionDurationSec)} session length`}
            />
            <OverviewCard
              icon={Clock}
              tone="amber"
              label="On-Time Rate"
              value={`${summary.onTimeRatePct}%`}
              sub={`${summary.lateCount} student${summary.lateCount === 1 ? "" : "s"} joined late`}
            />
            <OverviewCard
              icon={Eye}
              tone="slate"
              label="Avg. Attention"
              value={`${summary.avgAttentionPct}%`}
              sub="Time with the class tab in focus"
            />
          </div>

          {/* Status breakdown */}
          <div className="no-print flex flex-wrap items-center gap-4 px-5 py-3 bg-white rounded-xl border border-slate-200 shadow-sm text-sm">
            <TrendingUp className="w-4 h-4 text-slate-400" />
            {[
              { label: "Present", count: summary.presentCount, dot: "bg-emerald-500" },
              { label: "Late", count: summary.lateCount, dot: "bg-amber-500" },
              { label: "Left Early", count: summary.leftEarlyCount, dot: "bg-orange-500" },
              { label: "Absent", count: summary.absentCount, dot: "bg-red-500" },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${item.dot}`} />
                <span className="text-slate-600">{item.label}</span>
                <span className="font-bold text-slate-900 tabular-nums">{item.count}</span>
              </div>
            ))}
            {report.room.isLive && (
              <div className="flex items-center gap-1.5 ml-auto text-xs text-slate-400">
                <Radio className="w-3 h-3 animate-pulse text-emerald-500" />
                Auto-refreshing every {LIVE_REFRESH_MS / 1000}s
              </div>
            )}
          </div>

          <AttendanceTable rows={report.rows} isLive={report.room.isLive} />
        </>
      )}
    </div>
  )
}
