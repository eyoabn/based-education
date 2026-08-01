"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import {
  AlertCircle,
  ArrowRight,
  History,
  Loader2,
  RefreshCw,
  Sparkles,
  Trophy,
} from "lucide-react"
import PlatformAnalyticsGrid from "@/components/admin/PlatformAnalyticsGrid"
import {
  AUDIT_LABEL,
  AUDIT_STYLE,
  avatarFor,
  formatCount,
  formatWhen,
  type AnalyticsResponse,
  type PlatformSettings,
} from "@/lib/admin"

/**
 * Super Admin overview.
 *
 * Client-fetched rather than server-rendered because the numbers move while an
 * operator is watching them — a live-room count baked into HTML at request time
 * is stale by the time it paints. One request feeds the whole page.
 */
export default function AdminOverviewPage() {
  const [data, setData] = useState<AnalyticsResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true)
    try {
      const res = await fetch("/api/admin/analytics", { cache: "no-store" })
      const payload = await res.json()

      if (!res.ok) {
        setError(payload.error ?? "Could not load platform analytics.")
        return
      }

      setData(payload as AnalyticsResponse)
      setError(null)
    } catch {
      setError("Could not reach the server.")
    } finally {
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  function applySettings(settings: PlatformSettings) {
    setData(prev => (prev ? { ...prev, settings } : prev))
  }

  if (!data) {
    return (
      <div className="max-w-6xl mx-auto">
        {error ? (
          <div className="flex items-start gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-bold text-red-900">{error}</p>
              <button
                onClick={() => void load()}
                className="mt-2 px-3 py-1.5 rounded-lg bg-white border border-red-200 text-red-700 text-xs font-semibold hover:bg-red-50 transition-colors"
              >
                Try again
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Reading platform metrics…</span>
          </div>
        )}
      </div>
    )
  }

  const { metrics, growth, settings, auditLog, topTeachers } = data

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Platform Analytics</h1>
          <p className="text-slate-500">
            System health, growth and governance across {formatCount(metrics.totalUsers)} accounts.
          </p>
        </div>

        <button
          onClick={() => void load()}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {error} Showing the last figures that loaded.
        </div>
      )}

      <PlatformAnalyticsGrid
        metrics={metrics}
        growth={growth}
        settings={settings}
        onSettingsChange={applySettings}
      />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Audit trail */}
        <section className="lg:col-span-3 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
            <h2 className="font-bold text-slate-900 flex items-center gap-2">
              <History className="w-4 h-4 text-slate-400" />
              Recent admin activity
            </h2>
            <Link
              href="/dashboard/admin/monetization"
              className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1"
            >
              Full log
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {auditLog.length === 0 ? (
            <p className="px-5 py-8 text-sm text-slate-500 text-center">
              No administrative actions recorded yet.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {auditLog.slice(0, 8).map(entry => (
                <li key={entry.id} className="px-5 py-3 flex items-start gap-3">
                  <span
                    className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-semibold ring-1 ring-inset ${
                      AUDIT_STYLE[entry.action]
                    }`}
                  >
                    {AUDIT_LABEL[entry.action]}
                  </span>
                  <p className="flex-1 min-w-0 text-sm text-slate-600">{entry.summary}</p>
                  <span className="shrink-0 text-xs text-slate-400 tabular-nums">
                    {formatWhen(entry.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Leaderboard */}
        <section className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-900 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              Top teachers
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">By enrolled students</p>
          </div>

          {topTeachers.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <Sparkles className="w-5 h-5 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">
                No approved teachers with enrolments yet.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {topTeachers.map((teacher, index) => (
                <li key={teacher.id} className="px-5 py-3 flex items-center gap-3">
                  <span className="w-5 shrink-0 text-xs font-bold text-slate-400 tabular-nums">
                    {index + 1}
                  </span>
                  <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                    <img
                      src={avatarFor(teacher.name, teacher.avatarUrl)}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{teacher.name}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {teacher.specialty ?? `${teacher.courseCount} course${teacher.courseCount === 1 ? "" : "s"}`}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-bold text-slate-700 tabular-nums">
                    {formatCount(teacher.studentCount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
