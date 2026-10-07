"use client"

import { useCallback, useEffect, useState } from "react"
import {
  AlertCircle,
  Bug,
  CheckCircle2,
  Clock,
  Filter,
  Inbox,
  Loader2,
  MessageSquareWarning,
  RefreshCw,
  Search,
  User,
  XCircle,
} from "lucide-react"

interface Submitter {
  id: string
  name: string
  email: string
  role: "STUDENT" | "TEACHER" | "ADMIN"
  avatarUrl: string | null
}

interface BugReportItem {
  id: string
  title: string
  description: string
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED"
  createdAt: string
  updatedAt: string
  user: Submitter
}

const STATUS_CONFIG = {
  OPEN: {
    label: "Open",
    bg: "bg-amber-50 text-amber-700 border-amber-200",
    badge: "bg-amber-500",
    icon: Clock,
  },
  IN_PROGRESS: {
    label: "In Progress",
    bg: "bg-blue-50 text-blue-700 border-blue-200",
    badge: "bg-blue-500",
    icon: RefreshCw,
  },
  RESOLVED: {
    label: "Resolved",
    bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
    badge: "bg-emerald-500",
    icon: CheckCircle2,
  },
  CLOSED: {
    label: "Closed",
    bg: "bg-slate-100 text-slate-700 border-slate-200",
    badge: "bg-slate-500",
    icon: XCircle,
  },
}

export default function AdminFeedbackPage() {
  const [reports, setReports] = useState<BugReportItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>("ALL")
  const [searchQuery, setSearchQuery] = useState("")
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const loadReports = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const url = statusFilter === "ALL" ? "/api/feedback" : `/api/feedback?status=${statusFilter}`
      const res = await fetch(url, { cache: "no-store" })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? "Failed to load reports.")
        return
      }

      setReports(data.reports ?? [])
    } catch {
      setError("Network error — could not load feedback and bug reports.")
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    void loadReports()
  }, [loadReports])

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    setUpdatingId(id)
    try {
      const res = await fetch("/api/feedback", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? "Failed to update report status.")
        return
      }

      setReports(prev => prev.map(r => (r.id === id ? { ...r, status: newStatus as any } : r)))
      setToast(`Report status updated to ${STATUS_CONFIG[newStatus as keyof typeof STATUS_CONFIG]?.label || newStatus}.`)
      setTimeout(() => setToast(null), 4000)
    } catch {
      setError("Network error while updating status.")
    } finally {
      setUpdatingId(null)
    }
  }

  // Filtered list
  const filteredReports = reports.filter(r => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      r.title.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q) ||
      r.user?.name?.toLowerCase().includes(q) ||
      r.user?.email?.toLowerCase().includes(q)
    )
  })

  const openCount = reports.filter(r => r.status === "OPEN").length
  const progressCount = reports.filter(r => r.status === "IN_PROGRESS").length
  const resolvedCount = reports.filter(r => r.status === "RESOLVED").length

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <MessageSquareWarning className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Bug Reports & Feedback</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Inspect and resolve issues reported directly by students and educators.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => void loadReports()}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-lg transition-colors shadow-sm disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {toast && (
        <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-xl animate-fade-in shadow-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          {toast}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 text-red-800 text-sm rounded-xl">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          {error}
        </div>
      )}

      {/* Overview Stat Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Total Reports</span>
            <Bug className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2 tabular-nums">{reports.length}</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wide">Pending / Open</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-600 mt-2 tabular-nums">{openCount}</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">In Progress</span>
            <RefreshCw className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-blue-600 mt-2 tabular-nums">{progressCount}</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">Resolved</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-600 mt-2 tabular-nums">{resolvedCount}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        {/* Status Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          {["ALL", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"].map(st => {
            const active = statusFilter === st
            return (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  active
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {st === "ALL" ? "All Reports" : STATUS_CONFIG[st as keyof typeof STATUS_CONFIG]?.label || st}
              </button>
            )
          })}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by title, name, email..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-shadow"
          />
        </div>
      </div>

      {/* Reports List */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          <p className="text-sm font-medium">Loading reports...</p>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-3 text-slate-400">
            <Inbox className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No reports found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? "No feedback or reports match your current search query."
              : "No feedback submissions match the selected status filter."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReports.map(report => {
            const statusMeta = STATUS_CONFIG[report.status] || STATUS_CONFIG.OPEN
            const StatusIcon = statusMeta.icon

            return (
              <div
                key={report.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:border-slate-300 transition-all space-y-4"
              >
                {/* Header row: Submitter info and Status Control */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                      {report.user?.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={report.user.avatarUrl}
                          alt={report.user.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="font-bold text-xs text-slate-600">
                          {report.user?.name?.slice(0, 2).toUpperCase() || "US"}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 truncate">
                          {report.user?.name || "Unknown Submitter"}
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            report.user?.role === "TEACHER"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {report.user?.role || "USER"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{report.user?.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-slate-400">
                      Submitted {new Date(report.createdAt).toLocaleDateString()} at{" "}
                      {new Date(report.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>

                    {/* Status Changer */}
                    <div className="flex items-center gap-2">
                      <select
                        value={report.status}
                        disabled={updatingId === report.id}
                        onChange={e => void handleUpdateStatus(report.id, e.target.value)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg border focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-colors cursor-pointer ${statusMeta.bg}`}
                      >
                        <option value="OPEN">Open</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="RESOLVED">Resolved</option>
                        <option value="CLOSED">Closed</option>
                      </select>
                      {updatingId === report.id && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}
                    </div>
                  </div>
                </div>

                {/* Report Content */}
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                  <h3 className="font-bold text-sm text-slate-900 mb-1.5 flex items-center gap-2">
                    <Bug className="w-4 h-4 text-indigo-600" />
                    {report.title}
                  </h3>
                  <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">
                    {report.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
