"use client"

import { useEffect, useState, useCallback } from "react"
import {
  Database,
  Trash2,
  Users,
  BookOpen,
  AlertCircle,
  Loader2,
  RefreshCw,
  Search,
  Radio,
  FileAudio,
  MessageSquare,
  Clock,
  FileText,
  Shield,
  Eye,
  X,
  HardDrive,
  CheckCircle2,
} from "lucide-react"

type TableTab =
  | "storage"
  | "users"
  | "courses"
  | "liveRooms"
  | "exams"
  | "messages"
  | "attendances"
  | "posts"
  | "auditLogs"

interface StorageData {
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

export default function AdminDatabasePage() {
  const [activeTab, setActiveTab] = useState<TableTab>("storage")
  const [storageData, setStorageData] = useState<StorageData | null>(null)
  const [tableCounts, setTableCounts] = useState<Record<string, number>>({})
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [inspectedRecord, setInspectedRecord] = useState<any | null>(null)

  // Fetch storage overview
  const fetchStorageOverview = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/database?type=storage")
      const json = await res.json()
      if (res.ok) {
        setStorageData(json.storage)
        setTableCounts(json.counts || {})
      } else {
        setError(json.error || "Failed to fetch storage telemetry")
      }
    } catch {
      setError("An unexpected error occurred while loading storage metrics")
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch table records
  const fetchTableRecords = useCallback(async (tab: TableTab, query = "") => {
    setLoading(true)
    setError(null)
    try {
      const qParam = query ? `&q=${encodeURIComponent(query)}` : ""
      const res = await fetch(`/api/admin/database?type=${tab}${qParam}`)
      const json = await res.json()
      if (res.ok) {
        setRecords(json.records || [])
      } else {
        setError(json.error || "Failed to fetch table records")
      }
    } catch {
      setError("An unexpected error occurred while loading table records")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === "storage") {
      void fetchStorageOverview()
    } else {
      void fetchTableRecords(activeTab, searchQuery)
    }
  }, [activeTab, fetchStorageOverview, fetchTableRecords])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (activeTab !== "storage") {
      void fetchTableRecords(activeTab, searchQuery)
    }
  }

  const handleDelete = async (id: string, entityType: string) => {
    if (!confirm(`Are you sure you want to permanently delete this ${entityType} record? This action cannot be undone.`)) {
      return
    }

    try {
      const res = await fetch(`/api/admin/database?id=${encodeURIComponent(id)}&type=${encodeURIComponent(entityType)}`, {
        method: "DELETE",
      })
      if (res.ok) {
        if (activeTab === "storage") {
          void fetchStorageOverview()
        } else {
          void fetchTableRecords(activeTab, searchQuery)
        }
      } else {
        const json = await res.json()
        alert(json.error || "Failed to delete record")
      }
    } catch {
      alert("Error occurred while deleting record")
    }
  }

  const TAB_ITEMS: Array<{ id: TableTab; label: string; icon: typeof Database }> = [
    { id: "storage", label: "Storage Analysis", icon: HardDrive },
    { id: "users", label: "Users", icon: Users },
    { id: "courses", label: "Courses", icon: BookOpen },
    { id: "liveRooms", label: "Live Rooms", icon: Radio },
    { id: "exams", label: "Exams & Tasks", icon: FileText },
    { id: "messages", label: "Messages", icon: MessageSquare },
    { id: "attendances", label: "Attendance", icon: Clock },
    { id: "posts", label: "Posts", icon: FileText },
    { id: "auditLogs", label: "Audit Logs", icon: Shield },
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1 flex items-center gap-2.5">
            <Database className="w-6 h-6 text-indigo-600" />
            Database Explorer & Analytics
          </h1>
          <p className="text-sm text-slate-500">
            Real-time storage telemetry, relation table inspection, and deep record management.
          </p>
        </div>
        <button
          onClick={() => {
            if (activeTab === "storage") void fetchStorageOverview()
            else void fetchTableRecords(activeTab, searchQuery)
          }}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 text-xs sm:text-sm font-semibold hover:bg-slate-50 transition-colors disabled:opacity-60 shadow-xs cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh Telemetry
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-slate-100 p-1.5 rounded-2xl overflow-x-auto no-scrollbar">
        {TAB_ITEMS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          const count = tableCounts[tab.id]
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id)
                setSearchQuery("")
              }}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? "text-indigo-600" : "text-slate-400"}`} />
              <span>{tab.label}</span>
              {count !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                    isActive ? "bg-indigo-100 text-indigo-800" : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="text-sm font-semibold">{error}</span>
        </div>
      )}

      {/* TAB 1: Storage Analysis */}
      {activeTab === "storage" && storageData && (
        <div className="space-y-6">
          {/* Top 3 Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Space Taken</span>
              <div className="text-3xl font-extrabold text-slate-900">
                {storageData.totalUsedFormatted}
              </div>
              <p className="text-xs text-slate-500">
                {storageData.totalUsedMB} MB currently consumed by relations & blobs
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-emerald-200 bg-emerald-50/30 shadow-sm space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">Space Remaining</span>
              <div className="text-3xl font-extrabold text-emerald-700">
                {storageData.remainingMB} MB Left
              </div>
              <p className="text-xs text-emerald-600 font-medium">
                {storageData.remainingPercent}% of storage headroom available
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Allocated Quota</span>
              <div className="text-3xl font-extrabold text-slate-900">
                {storageData.capacityMB} MB
              </div>
              <p className="text-xs text-slate-500">
                {storageData.usagePercent}% of standard tier threshold
              </p>
            </div>
          </div>

          {/* Storage Capacity Gauge */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Storage Usage Gauge</h3>
                <p className="text-xs text-slate-500">PostgreSQL relation tables & indexes footprint</p>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700">
                {storageData.usagePercent}% Used
              </span>
            </div>

            <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  storageData.usagePercent > 80
                    ? "bg-red-500"
                    : storageData.usagePercent > 60
                    ? "bg-amber-500"
                    : "bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600"
                }`}
                style={{ width: `${Math.max(2, storageData.usagePercent)}%` }}
              />
            </div>

            <div className="flex justify-between text-[11px] text-slate-400 font-mono">
              <span>0 MB</span>
              <span>250 MB (50%)</span>
              <span>{storageData.capacityMB} MB Limit</span>
            </div>
          </div>

          {/* Relation Tables Breakdown */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">PostgreSQL Relation Tables Breakdown</h3>
                <p className="text-xs text-slate-500">Sizes computed via pg_total_relation_size</p>
              </div>
              <span className="text-xs font-semibold text-slate-400">
                {storageData.tableSizes.length} Tables Registered
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3.5">Table Name</th>
                    <th className="px-6 py-3.5">Size Footprint</th>
                    <th className="px-6 py-3.5">Estimated Rows</th>
                    <th className="px-6 py-3.5">Percent of DB</th>
                    <th className="px-6 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {storageData.tableSizes.map((table) => {
                    const pct =
                      storageData.totalUsedBytes > 0
                        ? ((table.totalBytes / storageData.totalUsedBytes) * 100).toFixed(1)
                        : "0"

                    // Map postgres table name to tabs
                    const tabMap: Record<string, TableTab> = {
                      User: "users",
                      Course: "courses",
                      LiveRoom: "liveRooms",
                      Exam: "exams",
                      ChatMessage: "messages",
                      Attendance: "attendances",
                      Post: "posts",
                      AuditLog: "auditLogs",
                    }
                    const mappedTab = tabMap[table.tableName]

                    return (
                      <tr key={table.tableName} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-6 py-3.5 font-bold text-slate-900 flex items-center gap-2">
                          <Database className="w-3.5 h-3.5 text-slate-400" />
                          <span>{table.tableName}</span>
                        </td>
                        <td className="px-6 py-3.5 font-mono text-xs font-semibold text-indigo-600">
                          {table.totalSizeFormatted}
                        </td>
                        <td className="px-6 py-3.5 font-mono text-xs text-slate-600">
                          {table.estimatedRowCount >= 0 ? table.estimatedRowCount : "Dynamic"}
                        </td>
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-indigo-500 rounded-full"
                                style={{ width: `${Math.max(3, Number(pct))}%` }}
                              />
                            </div>
                            <span className="font-mono text-xs text-slate-500">{pct}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          {mappedTab && (
                            <button
                              onClick={() => setActiveTab(mappedTab)}
                              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                            >
                              Inspect Rows →
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TABLE RECORDS VIEWER (Users, Courses, LiveRooms, etc.) */}
      {activeTab !== "storage" && (
        <div className="space-y-4">
          {/* Search bar inside table view */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-4">
            <form onSubmit={handleSearchSubmit} className="flex-1 relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search records in ${activeTab}...`}
                className="w-full pl-9 pr-4 py-2 bg-slate-100 border-none rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </form>
            <div className="text-xs font-bold text-slate-500 shrink-0">
              {records.length} records shown
            </div>
          </div>

          {loading ? (
            <div className="p-16 flex flex-col items-center justify-center gap-3 bg-white rounded-2xl border border-slate-200">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              <p className="text-xs font-semibold text-slate-500">Querying database rows...</p>
            </div>
          ) : records.length === 0 ? (
            <div className="p-16 text-center bg-white rounded-2xl border border-slate-200">
              <Database className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">No records found</p>
              <p className="text-xs text-slate-400 mt-1">This table is currently empty or matches no filters.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-3.5">ID / Identity</th>
                      <th className="px-5 py-3.5">Key Attributes</th>
                      <th className="px-5 py-3.5">Relationships & State</th>
                      <th className="px-5 py-3.5">Created At</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {records.map((record) => (
                      <tr key={record.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Column 1: Identity */}
                        <td className="px-5 py-3.5 max-w-[220px]">
                          <div className="font-bold text-slate-900 truncate">
                            {record.name || record.title || record.id}
                          </div>
                          <div className="text-[11px] font-mono text-slate-400 truncate">
                            {record.id}
                          </div>
                        </td>

                        {/* Column 2: Key Attributes */}
                        <td className="px-5 py-3.5 max-w-[240px]">
                          {activeTab === "users" && (
                            <div>
                              <span className="text-slate-800 font-medium">{record.email}</span>
                              <div className="text-[11px] text-slate-500">Role: {record.role}</div>
                            </div>
                          )}
                          {activeTab === "courses" && (
                            <div>
                              <span className="text-slate-800 font-bold">{record.code}</span>
                              <div className="text-[11px] text-slate-500">
                                Instructor: {record.teacher?.name || "N/A"}
                              </div>
                            </div>
                          )}
                          {activeTab === "liveRooms" && (
                            <div>
                              <span className="text-slate-800 font-semibold">{record.title}</span>
                              <div className="text-[11px] text-slate-500">
                                {record.course?.title || "Classroom"}
                              </div>
                            </div>
                          )}
                          {activeTab === "exams" && (
                            <div>
                              <span className="text-slate-800 font-semibold">{record.title}</span>
                              <div className="text-[11px] text-slate-500">
                                Course: {record.course?.title || "Classroom"} • Submissions: {record._count?.submissions ?? 0}
                              </div>
                            </div>
                          )}
                          {activeTab === "messages" && (
                            <div>
                              <p className="text-slate-800 truncate">{record.content}</p>
                              <p className="text-[11px] text-slate-400 truncate">
                                By: {record.sender?.name} ({record.sender?.role})
                              </p>
                            </div>
                          )}
                          {activeTab === "attendances" && (
                            <div>
                              <span className="text-slate-800 font-semibold">
                                {record.student?.name}
                              </span>
                              <div className="text-[11px] text-slate-500">
                                Room: {record.room?.title || record.roomId}
                              </div>
                            </div>
                          )}
                          {activeTab === "posts" && (
                            <div>
                              <p className="text-slate-800 font-medium truncate">{record.content}</p>
                              <div className="text-[11px] text-slate-500">
                                Author: {record.author?.name || "Member"}
                              </div>
                            </div>
                          )}
                          {activeTab === "auditLogs" && (
                            <div>
                              <span className="text-slate-800 font-semibold">{record.action}</span>
                              <div className="text-[11px] text-slate-500 truncate">
                                {record.details}
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Column 3: State / Relationships */}
                        <td className="px-5 py-3.5">
                          {activeTab === "users" && (
                            <div className="flex items-center gap-1.5">
                              {record.isBanned ? (
                                <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">
                                  Banned
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                  Active
                                </span>
                              )}
                              <span className="text-slate-400 text-xs">
                                {record._count?.enrolledIn ?? 0} courses
                              </span>
                            </div>
                          )}
                          {activeTab === "courses" && (
                            <span className="text-xs text-slate-600 font-semibold">
                              {record._count?.students ?? 0} students enrolled
                            </span>
                          )}
                          {activeTab === "liveRooms" && (
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                record.isLive
                                  ? "bg-red-100 text-red-700 animate-pulse"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {record.isLive ? "Live Now" : "Inactive"}
                            </span>
                          )}
                          {activeTab === "attendances" && (
                            <div className="text-xs font-mono text-slate-600">
                              Duration: {record.durationSec}s
                            </div>
                          )}
                          {activeTab === "posts" && (
                            <div className="text-xs text-slate-500">
                              {record._count?.likes ?? 0} likes • {record._count?.comments ?? 0} comments
                            </div>
                          )}
                          {activeTab === "auditLogs" && (
                            <span className="text-xs font-bold text-slate-700">
                              Admin: {record.admin?.name || "System"}
                            </span>
                          )}
                        </td>

                        {/* Column 4: Timestamp */}
                        <td className="px-5 py-3.5 text-slate-500 font-mono text-xs whitespace-nowrap">
                          {record.createdAt || record.joinedAt || record.scheduledAt
                            ? new Date(
                                record.createdAt || record.joinedAt || record.scheduledAt
                              ).toLocaleString()
                            : "—"}
                        </td>

                        {/* Column 5: Actions */}
                        <td className="px-5 py-3.5 text-right whitespace-nowrap space-x-2">
                          <button
                            onClick={() => setInspectedRecord(record)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title="Inspect Raw JSON"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              const entityType =
                                activeTab === "users"
                                  ? "user"
                                  : activeTab === "courses"
                                  ? "course"
                                  : activeTab === "liveRooms"
                                  ? "liveRoom"
                                  : activeTab === "exams"
                                  ? "exam"
                                  : activeTab === "messages"
                                  ? "message"
                                  : activeTab === "attendances"
                                  ? "attendance"
                                  : activeTab === "posts"
                                  ? "post"
                                  : "record"
                              handleDelete(record.id, entityType)
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Record Inspector Modal */}
      {inspectedRecord && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#0C0C12] text-white border border-white/15 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-sm">Raw Record Inspector</h3>
              </div>
              <button
                onClick={() => setInspectedRecord(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-black/50 p-4 rounded-2xl border border-white/10 font-mono text-xs text-emerald-400">
              <pre>{JSON.stringify(inspectedRecord, null, 2)}</pre>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setInspectedRecord(null)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
