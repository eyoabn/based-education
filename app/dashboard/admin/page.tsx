"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import {
  AlertCircle,
  ArrowRight,
  Database,
  HardDrive,
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

interface DbStorageData {
  totalUsedBytes: number
  totalUsedFormatted: string
  totalUsedMB: number
  capacityMB: number
  remainingMB: number
  usagePercent: number
  remainingPercent: number
  tableSizes: Array<{
    tableName: string
    totalBytes: number
    totalSizeFormatted: string
    estimatedRowCount: number
  }>
}

/**
 * Super Admin overview.
 *
 * Client-fetched rather than server-rendered because the numbers move while an
 * operator is watching them — a live-room count baked into HTML at request time
 * is stale by the time it paints. One request feeds the whole page.
 */
export default function AdminOverviewPage() {
  const [data, setData] = useState<AnalyticsResponse | null>(null)
  const [dbStorage, setDbStorage] = useState<DbStorageData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true)
    try {
      const [resAnalytics, resDb] = await Promise.all([
        fetch("/api/admin/analytics", { cache: "no-store" }),
        fetch("/api/admin/database?type=storage", { cache: "no-store" }),
      ])

      const payload = await resAnalytics.json()

      if (!resAnalytics.ok) {
        setError(payload.error ?? "Could not load platform analytics.")
        return
      }

      setData(payload as AnalyticsResponse)
      setError(null)

      if (resDb.ok) {
        const dbData = await resDb.json()
        if (dbData.storage) {
          setDbStorage(dbData.storage)
        }
      }
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
          <h1 className="text-2xl font-bold text-[#f7f3e8] mb-1">Platform Analytics</h1>
          <p className="text-[#9d9b95]">
            System health, growth and governance across {formatCount(metrics.totalUsers)} accounts.
          </p>
        </div>

        <button
          onClick={() => void load()}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#111110] border border-white/[0.08] text-[#9d9b95] hover:text-[#f7f3e8] hover:bg-[#181817] text-sm font-semibold transition-colors disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 text-[#d4af37] ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300">
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

      {/* Database Storage Analysis & Quota Card */}
      {dbStorage && (
        <section className="bg-[#111110] rounded-2xl border border-white/[0.08] shadow-[0_10px_30px_rgba(0,0,0,0.5)] p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[rgba(212,175,55,0.12)] border border-[rgba(212,175,55,0.25)] flex items-center justify-center text-[#d4af37]">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#f7f3e8]">Database Storage &amp; Capacity Analytics</h2>
                <p className="text-xs text-[#9d9b95]">Live PostgreSQL allocation, storage consumption, and remaining quota</p>
              </div>
            </div>

            <Link
              href="/dashboard/admin/database"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[rgba(212,175,55,0.12)] hover:bg-[rgba(212,175,55,0.2)] border border-[rgba(212,175,55,0.25)] text-[#d4af37] text-xs font-bold rounded-lg transition-colors shrink-0"
            >
              <span>Explore Raw Database Tables</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* 3 Metric Cards: Used, Remaining, Quota */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-[#181817] border border-white/[0.08]">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#9d9b95]">Space Taken</span>
              <div className="text-2xl font-extrabold text-[#f7f3e8] mt-1">
                {dbStorage.totalUsedFormatted}
              </div>
              <p className="text-[11px] text-[#9d9b95] mt-0.5">
                {dbStorage.totalUsedMB} MB of active data
              </p>
            </div>

            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Space Remaining</span>
              <div className="text-2xl font-extrabold text-emerald-300 mt-1">
                {dbStorage.remainingMB} MB Left
              </div>
              <p className="text-[11px] text-emerald-400/80 font-medium mt-0.5">
                {dbStorage.remainingPercent}% free headroom
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#181817] border border-white/[0.08]">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#9d9b95]">Allocated Quota</span>
              <div className="text-2xl font-extrabold text-[#f7f3e8] mt-1">
                {dbStorage.capacityMB} MB
              </div>
              <p className="text-[11px] text-[#9d9b95] mt-0.5">
                {dbStorage.usagePercent}% capacity consumed
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-[#f7f3e8]">Storage Usage ({dbStorage.usagePercent}%)</span>
              <span className="text-[#9d9b95]">{dbStorage.remainingMB} MB remaining of {dbStorage.capacityMB} MB</span>
            </div>
            <div className="w-full h-3 bg-[#181817] rounded-full overflow-hidden p-0.5 border border-white/[0.08]">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  dbStorage.usagePercent > 85
                    ? "bg-red-500"
                    : dbStorage.usagePercent > 65
                    ? "bg-amber-500"
                    : "bg-gradient-to-r from-emerald-500 to-[#d4af37]"
                }`}
                style={{ width: `${Math.max(2, dbStorage.usagePercent)}%` }}
              />
            </div>
          </div>

          {/* Top Relation Tables Breakdown */}
          {dbStorage.tableSizes && dbStorage.tableSizes.length > 0 && (
            <div>
              <span className="text-xs font-bold text-[#f7f3e8] uppercase tracking-wider block mb-2.5">
                Top Relation Tables by Size
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
                {dbStorage.tableSizes.slice(0, 6).map((table) => (
                  <div
                    key={table.tableName}
                    className="p-2.5 bg-[#181817] border border-white/[0.08] rounded-xl"
                  >
                    <p className="text-xs font-bold text-[#f7f3e8] truncate">{table.tableName}</p>
                    <p className="text-xs font-semibold text-[#d4af37] mt-0.5">{table.totalSizeFormatted}</p>
                    <p className="text-[10px] text-[#9d9b95] mt-0.5">
                      {table.estimatedRowCount >= 0 ? `~${table.estimatedRowCount} rows` : "Relations"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Audit trail */}
        <section className="lg:col-span-3 bg-[#111110] rounded-2xl border border-white/[0.08] shadow-[0_10px_30px_rgba(0,0,0,0.4)] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between gap-3">
            <h2 className="font-bold text-[#f7f3e8] flex items-center gap-2">
              <History className="w-4 h-4 text-[#d4af37]" />
              Recent admin activity
            </h2>
            <Link
              href="/dashboard/admin/monetization"
              className="text-sm font-semibold text-[#d4af37] hover:underline inline-flex items-center gap-1"
            >
              Full log
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {auditLog.length === 0 ? (
            <p className="px-5 py-8 text-sm text-[#9d9b95] text-center">
              No administrative actions recorded yet.
            </p>
          ) : (
            <ul className="divide-y divide-white/[0.06]">
              {auditLog.slice(0, 8).map(entry => (
                <li key={entry.id} className="px-5 py-3 flex items-start gap-3 hover:bg-[#181817] transition-colors">
                  <span
                    className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-semibold ring-1 ring-inset ${
                      AUDIT_STYLE[entry.action]
                    }`}
                  >
                    {AUDIT_LABEL[entry.action]}
                  </span>
                  <p className="flex-1 min-w-0 text-sm text-[#f7f3e8]/90">{entry.summary}</p>
                  <span className="shrink-0 text-xs text-[#9d9b95] tabular-nums">
                    {formatWhen(entry.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Leaderboard */}
        <section className="lg:col-span-2 bg-[#111110] rounded-2xl border border-white/[0.08] shadow-[0_10px_30px_rgba(0,0,0,0.4)] overflow-hidden">
          <div className="px-5 py-4 border-b border-white/[0.06]">
            <h2 className="font-bold text-[#f7f3e8] flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[#d4af37]" />
              Top teachers
            </h2>
            <p className="text-xs text-[#9d9b95] mt-0.5">By enrolled students</p>
          </div>

          {topTeachers.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <Sparkles className="w-5 h-5 text-[#9d9b95]/40 mx-auto mb-2" />
              <p className="text-sm text-[#9d9b95]">
                No approved teachers with enrolments yet.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-white/[0.06]">
              {topTeachers.map((teacher, index) => (
                <li key={teacher.id} className="px-5 py-3 flex items-center gap-3 hover:bg-[#181817] transition-colors">
                  <span className="w-5 shrink-0 text-xs font-bold text-[#9d9b95] tabular-nums">
                    {index + 1}
                  </span>
                  <div className="w-9 h-9 rounded-full bg-[#181817] border border-[rgba(212,175,55,0.3)] overflow-hidden shrink-0">
                    <img
                      src={avatarFor(teacher.name, teacher.avatarUrl)}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#f7f3e8] truncate">{teacher.name}</p>
                    <p className="text-xs text-[#9d9b95] truncate">
                      {teacher.specialty ?? `${teacher.courseCount} course${teacher.courseCount === 1 ? "" : "s"}`}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-bold text-[#d4af37] tabular-nums">
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
