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
    bg: "bg-amber-500/10 text-amber-400 border-amber-500/25",
    badge: "bg-amber-500",
    icon: Clock,
  },
  IN_PROGRESS: {
    label: "In Progress",
    bg: "bg-sky-500/10 text-sky-400 border-sky-500/25",
    badge: "bg-sky-500",
    icon: RefreshCw,
  },
  RESOLVED: {
    label: "Resolved",
    bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",
    badge: "bg-emerald-500",
    icon: CheckCircle2,
  },
  CLOSED: {
    label: "Closed",
    bg: "bg-white/5 text-[#9d9b95] border-white/10",
    badge: "bg-white/20",
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
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.25)] flex items-center justify-center text-[#d4af37] shadow-lg shadow-black/40">
              <MessageSquareWarning className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#f7f3e8] tracking-tight">Bug Reports & Feedback</h1>
              <p className="text-sm text-[#9d9b95] mt-0.5">
                Inspect and resolve issues reported directly by students and educators.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => void loadReports()}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#111110] border border-white/[0.08] hover:border-[rgba(212,175,55,0.3)] hover:text-[#f7f3e8] text-[#9d9b95] text-sm font-semibold rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[#d4af37]" : ""}`} />
          Refresh
        </button>
      </div>

      {toast && (
        <div className="flex items-center gap-2 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm rounded-xl animate-fade-in shadow-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          {toast}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          {error}
        </div>
      )}

      {/* Overview Stat Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-[#111110] rounded-2xl border border-white/[0.08] p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#9d9b95] uppercase tracking-wider">Total Reports</span>
            <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-[#d4af37]">
              <Bug className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#f7f3e8] mt-3 tabular-nums">{reports.length}</p>
        </div>

        <div className="bg-[#111110] rounded-2xl border border-white/[0.08] p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Pending / Open</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-amber-400 mt-3 tabular-nums">{openCount}</p>
        </div>

        <div className="bg-[#111110] rounded-2xl border border-white/[0.08] p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">In Progress</span>
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <RefreshCw className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-sky-400 mt-3 tabular-nums">{progressCount}</p>
        </div>

        <div className="bg-[#111110] rounded-2xl border border-white/[0.08] p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Resolved</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-400 mt-3 tabular-nums">{resolvedCount}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#111110] p-3 rounded-2xl border border-white/[0.08] shadow-lg">
        {/* Status Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          {["ALL", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"].map(st => {
            const active = statusFilter === st
            return (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all ${
                  active
                    ? "bg-[rgba(212,175,55,0.15)] text-[#d4af37] border border-[rgba(212,175,55,0.35)] shadow-sm"
                    : "text-[#9d9b95] hover:text-[#f7f3e8] hover:bg-white/[0.04] border border-transparent"
                }`}
              >
                {st === "ALL" ? "All Reports" : STATUS_CONFIG[st as keyof typeof STATUS_CONFIG]?.label || st}
              </button>
            )
          })}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[260px] flex-1 sm:flex-initial">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9d9b95]" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by title, name, email..."
            className="w-full pl-9 pr-3 py-2 bg-[#181817] border border-white/[0.08] rounded-xl text-xs text-[#f7f3e8] placeholder-[#9d9b95]/60 focus:ring-2 focus:ring-[#d4af37]/30 focus:border-[#d4af37] focus:outline-none transition-all"
          />
        </div>
      </div>

      {/* Reports List */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-[#9d9b95] bg-[#111110] rounded-2xl border border-white/[0.08] shadow-lg">
          <Loader2 className="w-6 h-6 animate-spin text-[#d4af37]" />
          <p className="text-sm font-medium">Loading reports...</p>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="py-16 text-center bg-[#111110] rounded-2xl border border-white/[0.08] shadow-lg p-8">
          <div className="w-12 h-12 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mx-auto mb-3 text-[#9d9b95]">
            <Inbox className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-[#f7f3e8]">No reports found</h3>
          <p className="text-xs text-[#9d9b95] mt-1 max-w-sm mx-auto">
            {searchQuery
              ? "No feedback or reports match your current search query."
              : "No feedback submissions match the selected status filter."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReports.map(report => {
            const statusMeta = STATUS_CONFIG[report.status] || STATUS_CONFIG.OPEN

            return (
              <div
                key={report.id}
                className="bg-[#111110] rounded-2xl border border-white/[0.08] hover:border-[rgba(212,175,55,0.25)] shadow-lg p-5 transition-all space-y-4"
              >
                {/* Header row: Submitter info and Status Control */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-[#181817] border border-white/[0.08] flex items-center justify-center overflow-hidden shrink-0">
                      {report.user?.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={report.user.avatarUrl}
                          alt={report.user.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="font-bold text-xs text-[#f7f3e8]">
                          {report.user?.name?.slice(0, 2).toUpperCase() || "US"}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#f7f3e8] truncate">
                          {report.user?.name || "Unknown Submitter"}
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                            report.user?.role === "TEACHER"
                              ? "bg-purple-500/10 text-purple-300 border-purple-500/20"
                              : report.user?.role === "ADMIN"
                              ? "bg-[rgba(212,175,55,0.15)] text-[#d4af37] border-[rgba(212,175,55,0.3)]"
                              : "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                          }`}
                        >
                          {report.user?.role || "USER"}
                        </span>
                      </div>
                      <p className="text-xs text-[#9d9b95] mt-0.5">{report.user?.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-[#9d9b95]">
                      Submitted {new Date(report.createdAt).toLocaleDateString()} at{" "}
                      {new Date(report.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>

                    {/* Status Changer */}
                    <div className="flex items-center gap-2">
                      <select
                        value={report.status}
                        disabled={updatingId === report.id}
                        onChange={e => void handleUpdateStatus(report.id, e.target.value)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-xl border focus:ring-2 focus:ring-[#d4af37]/30 focus:outline-none transition-colors cursor-pointer bg-[#181817] text-[#f7f3e8] ${statusMeta.bg}`}
                      >
                        <option value="OPEN" className="bg-[#181817] text-amber-400">Open</option>
                        <option value="IN_PROGRESS" className="bg-[#181817] text-sky-400">In Progress</option>
                        <option value="RESOLVED" className="bg-[#181817] text-emerald-400">Resolved</option>
                        <option value="CLOSED" className="bg-[#181817] text-[#9d9b95]">Closed</option>
                      </select>
                      {updatingId === report.id && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#d4af37]" />}
                    </div>
                  </div>
                </div>

                {/* Report Content */}
                <div className="bg-[#0c0c0b] border border-white/[0.06] rounded-xl p-4">
                  <h3 className="font-bold text-sm text-[#f7f3e8] mb-1.5 flex items-center gap-2">
                    <Bug className="w-4 h-4 text-[#d4af37]" />
                    {report.title}
                  </h3>
                  <p className="text-xs text-[#9d9b95] whitespace-pre-wrap leading-relaxed">
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
