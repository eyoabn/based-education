"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  Activity,
  AlertCircle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  ClipboardCheck,
  Loader2,
  Megaphone,
  ServerCog,
  UserCheck,
  Users,
  Wrench,
} from "lucide-react"
import BroadcastModal from "@/components/admin/BroadcastModal"
import {
  compactNumber,
  formatCount,
  formatMoney,
  pctOf,
  type GrowthPoint,
  type PlatformMetrics,
  type PlatformSettings,
} from "@/lib/admin"

interface PlatformAnalyticsGridProps {
  metrics: PlatformMetrics
  growth: GrowthPoint[]
  settings: PlatformSettings
  onSettingsChange?: (settings: PlatformSettings) => void
}

/**
 * The executive bento grid.
 *
 * Four figures the platform is actually run on — headcount, the verification
 * backlog, what is live right now, and the money — plus the two switches an
 * operator reaches for in an incident. Everything else on this page is
 * supporting detail.
 */

// Single-series sparkline: no legend needed, the tile's label names it.
function Sparkline({ points, color = "#4F46E5" }: { points: number[]; color?: string }) {
  const path = useMemo(() => {
    if (points.length < 2) return null

    const max = Math.max(...points, 1)
    const width = 120
    const height = 32
    const step = width / (points.length - 1)

    const coords = points.map((value, index) => ({
      x: index * step,
      y: height - (value / max) * (height - 4) - 2,
    }))

    return {
      line: coords.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" "),
      last: coords[coords.length - 1],
      width,
      height,
    }
  }, [points])

  if (!path) return null

  return (
    <svg
      viewBox={`0 0 ${path.width} ${path.height}`}
      className="w-[120px] h-8 overflow-visible"
      aria-hidden="true"
    >
      <path d={path.line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {/* End marker carries a surface ring so it stays legible over the line */}
      <circle cx={path.last.x} cy={path.last.y} r={4} fill={color} stroke="#FFFFFF" strokeWidth={2} />
    </svg>
  )
}

function Delta({ value }: { value: number }) {
  if (value === 0) {
    return <span className="text-sm font-medium text-slate-400">no change</span>
  }

  const up = value > 0
  const Icon = up ? ArrowUpRight : ArrowDownRight

  return (
    <span
      className={`inline-flex items-center gap-1 text-sm font-semibold ${
        up ? "text-emerald-600" : "text-red-600"
      }`}
    >
      <Icon className="w-4 h-4" />
      {Math.abs(value)}%
    </span>
  )
}

export default function PlatformAnalyticsGrid({
  metrics,
  growth,
  settings,
  onSettingsChange,
}: PlatformAnalyticsGridProps) {
  const [config, setConfig] = useState(settings)
  const [toggling, setToggling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [broadcastOpen, setBroadcastOpen] = useState(false)
  const [broadcastNote, setBroadcastNote] = useState<string | null>(null)

  const studentPct = pctOf(metrics.studentCount, metrics.totalUsers)
  const teacherPct = pctOf(metrics.teacherCount, metrics.totalUsers)

  async function toggleMaintenance() {
    setToggling(true)
    setError(null)

    try {
      const res = await fetch("/api/admin/platform", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maintenanceMode: !config.maintenanceMode }),
      })
      const payload = await res.json()

      if (!res.ok) {
        setError(payload.error ?? "Could not change maintenance mode.")
        return
      }

      setConfig(payload.settings)
      onSettingsChange?.(payload.settings)
    } catch {
      setError("Could not reach the server.")
    } finally {
      setToggling(false)
    }
  }

  return (
    <div className="space-y-6">
      {config.maintenanceMode && (
        <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
          <Wrench className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-bold text-amber-900">Maintenance mode is on</p>
            <p className="text-amber-800/90">
              {config.maintenanceNote ||
                "Non-admin users see a maintenance notice instead of the platform."}
            </p>
          </div>
        </div>
      )}

      {/* Bento grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Headcount — the hero figure, spanning two columns */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Total platform users
              </h3>
              <div className="flex items-end gap-3 mt-2">
                <span className="text-5xl font-bold text-slate-900 tracking-tight leading-none">
                  {compactNumber(metrics.totalUsers)}
                </span>
                <span className="flex items-center gap-2 mb-1">
                  <Delta value={pctOf(metrics.newUsersThisMonth, Math.max(metrics.totalUsers - metrics.newUsersThisMonth, 1))} />
                  <span className="text-sm text-slate-400">this month</span>
                </span>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Users className="w-5 h-5" />
              </div>
              <Sparkline points={growth.map(point => point.users)} />
            </div>
          </div>

          {/* Composition meter — 2px surface gaps do the separating */}
          <div className="flex h-2.5 rounded-full overflow-hidden bg-slate-100 gap-[2px]">
            <div
              style={{ width: `${studentPct}%`, backgroundColor: "#4F46E5" }}
              className="rounded-full"
            />
            <div
              style={{ width: `${teacherPct}%`, backgroundColor: "#0D9488" }}
              className="rounded-full"
            />
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-3 text-sm">
            <span className="inline-flex items-center gap-2 text-slate-600">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: "#4F46E5" }} />
              {formatCount(metrics.studentCount)} students
              <span className="text-slate-400 tabular-nums">{studentPct}%</span>
            </span>
            <span className="inline-flex items-center gap-2 text-slate-600">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: "#0D9488" }} />
              {formatCount(metrics.teacherCount)} teachers
              <span className="text-slate-400 tabular-nums">{teacherPct}%</span>
            </span>
            <span className="inline-flex items-center gap-2 text-slate-500">
              <span className="w-2.5 h-2.5 rounded-sm bg-slate-300" />
              {formatCount(metrics.adminCount)} admins
            </span>
            {metrics.bannedCount > 0 && (
              <span className="inline-flex items-center gap-1.5 text-red-600 font-medium">
                {formatCount(metrics.bannedCount)} suspended
              </span>
            )}
          </div>
        </div>

        {/* Verification backlog */}
        <div
          className={`rounded-xl border shadow-sm p-6 flex flex-col ${
            metrics.pendingTeachers > 0
              ? "bg-amber-50 border-amber-200"
              : "bg-white border-slate-200"
          }`}
        >
          <div className="flex items-start justify-between mb-3">
            <h3
              className={`text-xs font-bold uppercase tracking-wide ${
                metrics.pendingTeachers > 0 ? "text-amber-700" : "text-slate-500"
              }`}
            >
              Pending applications
            </h3>
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                metrics.pendingTeachers > 0
                  ? "bg-amber-100 text-amber-700"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              <UserCheck className="w-5 h-5" />
            </div>
          </div>

          <div className="text-4xl font-bold text-slate-900 tracking-tight">
            {metrics.pendingTeachers}
          </div>
          <p
            className={`text-sm mt-1 mb-4 ${
              metrics.pendingTeachers > 0 ? "text-amber-800/90" : "text-slate-500"
            }`}
          >
            {metrics.pendingTeachers > 0
              ? `${metrics.pendingTeachers === 1 ? "A teacher is" : "Teachers are"} waiting on verification.`
              : "The verification queue is clear."}
          </p>

          <Link
            href="/dashboard/admin/approvals"
            className={`mt-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
              metrics.pendingTeachers > 0
                ? "bg-amber-600 hover:bg-amber-700 text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {metrics.pendingTeachers > 0 ? "Review now" : "Open the queue"}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Second row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Live now */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">Live now</h3>
            <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center text-red-600">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 tracking-tight">
              {metrics.activeLiveRooms}
            </span>
            {metrics.activeLiveRooms > 0 && (
              <span className="live-indicator">
                <span className="live-dot" />
                On air
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {metrics.scheduledToday} class{metrics.scheduledToday === 1 ? "" : "es"} scheduled today
          </p>
        </div>

        {/* Revenue */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Revenue this month
            </h3>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900 tracking-tight">
            {formatMoney(metrics.revenueCents, { compact: true })}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Delta value={metrics.revenueChangePct} />
            <span className="text-sm text-slate-400">vs last month</span>
          </div>
        </div>

        {/* Commission */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Commission earned
            </h3>
            <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900 tracking-tight">
            {formatMoney(metrics.commissionCents, { compact: true })}
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {config.commissionPct}% platform rate · {formatCount(metrics.totalCourses)} courses
          </p>
        </div>

        {/* Assessment throughput */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Papers submitted
            </h3>
            <div className="w-9 h-9 rounded-lg bg-sky-50 flex items-center justify-center text-sky-600">
              <ClipboardCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900 tracking-tight">
            {compactNumber(metrics.totalSubmissions)}
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {pctOf(metrics.gradedSubmissions, metrics.totalSubmissions)}% graded across{" "}
            {formatCount(metrics.totalExams)} papers
          </p>
        </div>
      </div>

      {/* Quick system actions */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <ServerCog className="w-4 h-4 text-slate-400" />
          <h2 className="font-bold text-slate-900">System actions</h2>
        </div>

        {error && (
          <div className="mx-5 mt-4 flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {error}
          </div>
        )}
        {broadcastNote && (
          <div className="mx-5 mt-4 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800">
            {broadcastNote}
          </div>
        )}

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Maintenance */}
          <div className="flex items-start justify-between gap-4 p-4 rounded-xl border border-slate-200">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-slate-400" />
                <span className="font-semibold text-slate-800">Maintenance mode</span>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Freezes the platform for everyone except administrators.
              </p>
            </div>

            <button
              onClick={() => void toggleMaintenance()}
              disabled={toggling}
              role="switch"
              aria-checked={config.maintenanceMode}
              aria-label="Maintenance mode"
              className={`relative shrink-0 w-12 h-7 rounded-full transition-colors disabled:opacity-60 ${
                config.maintenanceMode ? "bg-amber-500" : "bg-slate-200"
              }`}
            >
              <span
                className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform flex items-center justify-center ${
                  config.maintenanceMode ? "translate-x-6" : "translate-x-1"
                }`}
              >
                {toggling && <Loader2 className="w-3 h-3 animate-spin text-slate-400" />}
              </span>
            </button>
          </div>

          {/* Broadcast */}
          <div className="flex items-start justify-between gap-4 p-4 rounded-xl border border-slate-200">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-slate-400" />
                <span className="font-semibold text-slate-800">Platform broadcast</span>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Push a notice to every active user's notification tray.
              </p>
            </div>

            <button
              onClick={() => setBroadcastOpen(true)}
              className="shrink-0 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold transition-colors"
            >
              Compose
            </button>
          </div>
        </div>
      </div>

      {broadcastOpen && (
        <BroadcastModal
          metrics={metrics}
          onClose={() => setBroadcastOpen(false)}
          onSent={count => setBroadcastNote(`Broadcast delivered to ${formatCount(count)} users.`)}
        />
      )}
    </div>
  )
}
