"use client"

import { useMemo, useState } from "react"
import { ArrowUpDown, Search, UserX } from "lucide-react"
import {
  formatClock,
  formatDuration,
  STATUS_LABEL,
  STATUS_STYLE,
  type AttendanceRow,
  type AttendanceStatus,
} from "@/lib/attendance"

interface AttendanceTableProps {
  rows: AttendanceRow[]
  /** Session is live — show the pulsing "in room now" indicator. */
  isLive?: boolean
}

type SortKey = "name" | "joinedAt" | "durationSec" | "attentionPct" | "status"

const STATUS_FILTERS: (AttendanceStatus | "ALL")[] = [
  "ALL",
  "PRESENT",
  "LATE",
  "LEFT_EARLY",
  "ABSENT",
]

/** Green above 75%, amber 40-75%, red below — matches the status palette. */
function attentionBarColor(pct: number): string {
  if (pct >= 75) return "bg-emerald-500"
  if (pct >= 40) return "bg-amber-500"
  return "bg-red-500"
}

export default function AttendanceTable({ rows, isLive = false }: AttendanceTableProps) {
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<AttendanceStatus | "ALL">("ALL")
  const [sortKey, setSortKey] = useState<SortKey>("durationSec")
  const [sortAsc, setSortAsc] = useState(false)

  const visibleRows = useMemo(() => {
    const q = query.trim().toLowerCase()

    const filtered = rows.filter(r => {
      if (statusFilter !== "ALL" && r.status !== statusFilter) return false
      if (!q) return true
      return r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q)
    })

    const direction = sortAsc ? 1 : -1

    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case "name":
          return a.name.localeCompare(b.name) * direction
        case "joinedAt": {
          // Absentees always sink to the bottom regardless of direction.
          if (!a.joinedAt) return 1
          if (!b.joinedAt) return -1
          return (new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime()) * direction
        }
        case "attentionPct":
          return (a.attentionPct - b.attentionPct) * direction
        case "status":
          return STATUS_LABEL[a.status].localeCompare(STATUS_LABEL[b.status]) * direction
        case "durationSec":
        default:
          return (a.durationSec - b.durationSec) * direction
      }
    })
  }, [rows, query, statusFilter, sortKey, sortAsc])

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortAsc(prev => !prev)
    } else {
      setSortKey(key)
      setSortAsc(false)
    }
  }

  const SortHeader = ({ label, sortKeyName, align = "left" }: {
    label: string
    sortKeyName: SortKey
    align?: "left" | "right" | "center"
  }) => (
    <th
      scope="col"
      className={`px-4 py-3 font-semibold text-slate-600 whitespace-nowrap text-${align}`}
    >
      <button
        onClick={() => toggleSort(sortKeyName)}
        className={`inline-flex items-center gap-1.5 hover:text-slate-900 transition-colors ${
          sortKey === sortKeyName ? "text-slate-900" : ""
        }`}
      >
        {label}
        <ArrowUpDown
          className={`w-3 h-3 ${sortKey === sortKeyName ? "text-emerald-600" : "text-slate-300"}`}
        />
      </button>
    </th>
  )

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden print-container">
      {/* Toolbar — hidden when printing the report */}
      <div className="no-print flex flex-wrap items-center gap-3 px-4 py-3 border-b border-slate-200 bg-slate-50/60">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none transition-shadow"
          />
        </div>

        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1">
          {STATUS_FILTERS.map(status => {
            const active = statusFilter === status
            const count =
              status === "ALL" ? rows.length : rows.filter(r => r.status === status).length
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                  active
                    ? "bg-slate-900 text-white"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                }`}
              >
                {status === "ALL" ? "All" : STATUS_LABEL[status]}
                <span className={`ml-1.5 ${active ? "text-slate-300" : "text-slate-400"}`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200 text-left text-xs uppercase tracking-wide">
            <tr>
              <SortHeader label="Student" sortKeyName="name" />
              <SortHeader label="Join Time" sortKeyName="joinedAt" />
              <th scope="col" className="px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">
                Leave Time
              </th>
              <SortHeader label="Duration" sortKeyName="durationSec" />
              <SortHeader label="Active Attention" sortKeyName="attentionPct" />
              <SortHeader label="Status" sortKeyName="status" />
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {visibleRows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-16 text-center">
                  <UserX className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-medium">No students match this view</p>
                  <p className="text-slate-400 text-xs mt-1">
                    Try clearing the search or switching the status filter.
                  </p>
                </td>
              </tr>
            )}

            {visibleRows.map(row => (
              <tr
                key={row.studentId}
                className={`hover:bg-slate-50/70 transition-colors ${
                  row.status === "ABSENT" ? "opacity-60" : ""
                }`}
              >
                {/* Student */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 overflow-hidden">
                        <img
                          src={
                            row.avatarUrl ||
                            `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(row.name)}`
                          }
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                      {isLive && row.isActive && (
                        <span
                          className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white animate-pulse-dot"
                          title="In the room now"
                        />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-800 truncate">{row.name}</div>
                      <div className="text-xs text-slate-500 truncate">{row.email}</div>
                    </div>
                  </div>
                </td>

                {/* Join / Leave */}
                <td className="px-4 py-3 text-slate-600 font-mono text-xs whitespace-nowrap">
                  {formatClock(row.joinedAt)}
                </td>
                <td className="px-4 py-3 text-slate-600 font-mono text-xs whitespace-nowrap">
                  {isLive && row.isActive ? (
                    <span className="text-emerald-600 font-semibold">In room</span>
                  ) : (
                    formatClock(row.leftAt)
                  )}
                </td>

                {/* Duration */}
                <td className="px-4 py-3 text-slate-700 font-medium whitespace-nowrap">
                  {row.joinedAt ? formatDuration(row.durationSec) : "—"}
                </td>

                {/* Attention */}
                <td className="px-4 py-3 min-w-[150px]">
                  {row.joinedAt ? (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden max-w-[90px]">
                        <div
                          className={`h-full rounded-full transition-all ${attentionBarColor(row.attentionPct)}`}
                          style={{ width: `${row.attentionPct}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-slate-600 tabular-nums w-9">
                        {row.attentionPct}%
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>

                {/* Status */}
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ring-inset whitespace-nowrap ${STATUS_STYLE[row.status]}`}
                  >
                    {STATUS_LABEL[row.status]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {visibleRows.length > 0 && (
        <div className="px-4 py-2.5 border-t border-slate-200 bg-slate-50/60 text-xs text-slate-500">
          Showing {visibleRows.length} of {rows.length} students
        </div>
      )}
    </div>
  )
}
