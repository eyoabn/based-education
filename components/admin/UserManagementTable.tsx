"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  AlertCircle,
  ArrowUpDown,
  Ban,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  KeyRound,
  Loader2,
  Mail,
  MoreHorizontal,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCog,
  Users,
  X,
} from "lucide-react"
import {
  ACCOUNT_STATUS_LABEL,
  ACCOUNT_STATUS_STYLE,
  ROLE_LABEL,
  ROLE_STYLE,
  USER_PAGE_SIZE,
  avatarFor,
  formatCount,
  formatDate,
  formatWhen,
  type AccountStatus,
  type AdminUserListResponse,
  type AdminUserRow,
  type Role,
  type UserSortKey,
} from "@/lib/admin"

type RoleFilter = "ALL" | Role
type StatusFilter = "ALL" | AccountStatus | "RESET_REQUESTED"

const ROLE_OPTIONS: { id: RoleFilter; label: string }[] = [
  { id: "ALL", label: "All Roles" },
  { id: "STUDENT", label: "Students" },
  { id: "TEACHER", label: "Teachers" },
  { id: "ADMIN", label: "Admins" },
]

const STATUS_OPTIONS: { id: StatusFilter; label: string }[] = [
  { id: "ALL", label: "All Statuses" },
  { id: "RESET_REQUESTED", label: "🔑 Reset Requested" },
  { id: "ACTIVE", label: "Active" },
  { id: "PENDING", label: "Pending" },
  { id: "REJECTED", label: "Rejected" },
  { id: "BANNED", label: "Suspended" },
]

/** Pending mutation, held while its confirmation dialog is open. */
type PendingAction =
  | { kind: "BAN"; user: AdminUserRow }
  | { kind: "UNBAN"; user: AdminUserRow }
  | { kind: "CHANGE_ROLE"; user: AdminUserRow; role: Role }
  | { kind: "RESET_PASSWORD"; user: AdminUserRow }

interface UserManagementTableProps {
  /** Rendered above the controls — lets the page own its heading. */
  onCountsChange?: (counts: AdminUserListResponse["counts"]) => void
}

/**
 * The governance table.
 *
 * Owns its own querying: search, filters, sort and pagination all live in the
 * URL-less local state and round-trip to `/api/admin/users`, because the result
 * set is server-paginated — filtering a page of twelve on the client would lie
 * about the totals.
 *
 * Every destructive action goes through a confirmation dialog, and suspensions
 * additionally require a written reason: the user is told why, and the audit
 * log keeps it.
 */
export default function UserManagementTable({ onCountsChange }: UserManagementTableProps) {
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [role, setRole] = useState<RoleFilter>("ALL")
  const [status, setStatus] = useState<StatusFilter>("ALL")
  const [sort, setSort] = useState<UserSortKey>("joinedAt")
  const [dir, setDir] = useState<"asc" | "desc">("desc")
  const [page, setPage] = useState(1)

  const [data, setData] = useState<AdminUserListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [menuFor, setMenuFor] = useState<string | null>(null)
  const [pending, setPending] = useState<PendingAction | null>(null)
  const [reason, setReason] = useState("")
  const [working, setWorking] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [resetLink, setResetLink] = useState<{ url: string; name: string; email?: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const tableRef = useRef<HTMLDivElement>(null)

  // Debounce the search box so typing doesn't fire a query per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(USER_PAGE_SIZE),
        sort,
        dir,
      })
      if (debouncedQuery) params.set("q", debouncedQuery)
      if (role !== "ALL") params.set("role", role)
      if (status !== "ALL") params.set("status", status)

      const res = await fetch(`/api/admin/users?${params.toString()}`)
      const payload = await res.json()

      if (!res.ok) {
        setError(payload.error ?? "Could not load users.")
        return
      }

      setError(null)
      setData(payload as AdminUserListResponse)
      onCountsChange?.((payload as AdminUserListResponse).counts)
    } catch {
      setError("Could not reach the server.")
    } finally {
      setLoading(false)
    }
  }, [page, sort, dir, debouncedQuery, role, status, onCountsChange])

  useEffect(() => {
    void load()
  }, [load])

  // Any click outside an open row menu dismisses it.
  useEffect(() => {
    if (!menuFor) return
    const onClick = () => setMenuFor(null)
    document.addEventListener("click", onClick)
    return () => document.removeEventListener("click", onClick)
  }, [menuFor])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(timer)
  }, [toast])

  const users = data?.users ?? []
  const pagination = data?.pagination

  const toggleSort = (key: UserSortKey) => {
    if (sort === key) setDir(prev => (prev === "asc" ? "desc" : "asc"))
    else {
      setSort(key)
      setDir(key === "name" ? "asc" : "desc")
    }
    setPage(1)
  }

  const confirmLabel = useMemo(() => {
    if (!pending) return "Confirm"

    switch (pending.kind) {
      case "BAN":
        return "Suspend account"
      case "UNBAN":
        return "Reinstate account"
      case "CHANGE_ROLE":
        return `Make ${ROLE_LABEL[pending.role].toLowerCase()}`
      case "RESET_PASSWORD":
        return pending.user.hasPendingReset ? "Approve & Send Reset Link" : "Generate reset link"
      default:
        return "Confirm"
    }
  }, [pending])

  async function runPending() {
    if (!pending) return

    setWorking(true)
    setActionError(null)

    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: pending.user.id,
          action: pending.kind,
          ...(pending.kind === "BAN" ? { reason: reason.trim() } : {}),
          ...(pending.kind === "CHANGE_ROLE" ? { role: pending.role } : {}),
        }),
      })
      const payload = await res.json()

      if (!res.ok) {
        setActionError(payload.error ?? "The action could not be completed.")
        return
      }

      switch (pending.kind) {
        case "RESET_PASSWORD":
          setResetLink({ url: payload.resetUrl, name: pending.user.name, email: payload.email || pending.user.email })
          break
        case "BAN":
          setToast(`${pending.user.name} suspended — active sessions revoked.`)
          break
        case "UNBAN":
          setToast(`${pending.user.name} reinstated.`)
          break
        case "CHANGE_ROLE":
          setToast(
            `${pending.user.name} is now ${ROLE_LABEL[pending.role].toLowerCase()}. Their sessions were revoked.`
          )
          break
      }

      setPending(null)
      setReason("")
      await load()
    } catch {
      setActionError("Could not reach the server.")
    } finally {
      setWorking(false)
    }
  }

  return (
    <div className="space-y-4" ref={tableRef}>
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Search by name or email…"
            className="w-full pl-9 pr-9 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <select
          value={role}
          onChange={event => {
            setRole(event.target.value as RoleFilter)
            setPage(1)
          }}
          className="w-full sm:w-auto px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {ROLE_OPTIONS.map(option => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          value={status}
          onChange={event => {
            setStatus(event.target.value as StatusFilter)
            setPage(1)
          }}
          className="w-full sm:w-auto px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {STATUS_OPTIONS.map(option => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>

        {Boolean(data?.counts?.resetRequests && data.counts.resetRequests > 0) && (
          <button
            type="button"
            onClick={() => {
              setStatus(prev => (prev === "RESET_REQUESTED" ? "ALL" : "RESET_REQUESTED"))
              setPage(1)
            }}
            className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              status === "RESET_REQUESTED"
                ? "bg-amber-600 text-white shadow-xs ring-2 ring-amber-500/20"
                : "bg-amber-50 border border-amber-300 text-amber-900 hover:bg-amber-100"
            }`}
            title="Filter by users with pending password reset requests"
          >
            <KeyRound className="w-4 h-4 text-amber-500" />
            <span>Reset Requests</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-xs font-bold ${
                status === "RESET_REQUESTED" ? "bg-amber-700 text-white" : "bg-amber-200 text-amber-900"
              }`}
            >
              {data?.counts?.resetRequests}
            </span>
          </button>
        )}

        <button
          onClick={() => void load()}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-semibold rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {toast && (
        <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800">
          <Check className="w-4 h-4 shrink-0" />
          {toast}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                  <button
                    onClick={() => toggleSort("name")}
                    className="inline-flex items-center gap-1.5 hover:text-slate-700"
                  >
                    User
                    <ArrowUpDown className={`w-3 h-3 ${sort === "name" ? "text-indigo-600" : ""}`} />
                  </button>
                </th>
                <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                  Role
                </th>
                <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                  Status
                </th>
                <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                  <button
                    onClick={() => toggleSort("joinedAt")}
                    className="inline-flex items-center gap-1.5 hover:text-slate-700"
                  >
                    Joined
                    <ArrowUpDown
                      className={`w-3 h-3 ${sort === "joinedAt" ? "text-indigo-600" : ""}`}
                    />
                  </button>
                </th>
                <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                  <button
                    onClick={() => toggleSort("lastLoginAt")}
                    className="inline-flex items-center gap-1.5 hover:text-slate-700"
                  >
                    Last Seen
                    <ArrowUpDown
                      className={`w-3 h-3 ${sort === "lastLoginAt" ? "text-indigo-600" : ""}`}
                    />
                  </button>
                </th>
                <th className="px-5 py-3 w-12" />
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading && users.length === 0 ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <tr key={index}>
                    <td colSpan={6} className="px-5 py-4">
                      <div className="h-8 bg-slate-100 rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="font-semibold text-slate-700">No users match these filters</p>
                    <p className="text-sm text-slate-400 mt-1">
                      Try a different search term, role or status.
                    </p>
                  </td>
                </tr>
              ) : (
                users.map(user => (
                  <tr
                    key={user.id}
                    className={`hover:bg-slate-50 transition-colors ${
                      user.isBanned ? "bg-red-50/40" : ""
                    }`}
                  >
                    {/* User */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                          <img
                            src={avatarFor(user.name, user.avatarUrl)}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-800 truncate">{user.name}</div>
                          <div className="text-xs text-slate-400 truncate">{user.email}</div>
                          {user.hasPendingReset && (
                            <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-[10px] font-bold text-amber-800">
                              <KeyRound className="w-3 h-3 text-amber-600" />
                              Reset Requested
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ring-inset whitespace-nowrap ${ROLE_STYLE[user.role]}`}
                      >
                        {ROLE_LABEL[user.role]}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ring-inset whitespace-nowrap ${ACCOUNT_STATUS_STYLE[user.status]}`}
                        title={user.banReason ?? undefined}
                      >
                        {ACCOUNT_STATUS_LABEL[user.status]}
                      </span>
                      {user.isBanned && user.banReason && (
                        <div className="text-[11px] text-red-600/80 mt-0.5 max-w-[180px] truncate">
                          {user.banReason}
                        </div>
                      )}
                    </td>

                    {/* Joined */}
                    <td className="px-5 py-3 text-slate-600 whitespace-nowrap">
                      {formatDate(user.joinedAt)}
                    </td>

                    {/* Last seen */}
                    <td className="px-5 py-3 text-slate-500 whitespace-nowrap">
                      {formatWhen(user.lastLoginAt)}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3 text-right relative">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        {user.hasPendingReset && (
                          <button
                            onClick={() => {
                              setActionError(null)
                              setPending({ kind: "RESET_PASSWORD", user })
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-xs transition-colors"
                            title="Generate and send reset link"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            <span>Send Link</span>
                          </button>
                        )}
                        <button
                          onClick={event => {
                            event.stopPropagation()
                            setMenuFor(prev => (prev === user.id ? null : user.id))
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                          aria-label={`Actions for ${user.name}`}
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>

                      {menuFor === user.id && (
                        <div
                          onClick={event => event.stopPropagation()}
                          className="absolute right-4 top-12 z-20 w-60 bg-white rounded-xl border border-slate-200 shadow-lg py-1.5 text-left animate-fade-up"
                        >
                          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                            Change role
                          </div>
                          {(["STUDENT", "TEACHER", "ADMIN"] as Role[])
                            .filter(option => option !== user.role)
                            .map(option => (
                              <button
                                key={option}
                                onClick={() => {
                                  setMenuFor(null)
                                  setActionError(null)
                                  setPending({ kind: "CHANGE_ROLE", user, role: option })
                                }}
                                className="w-full px-3 py-2 flex items-center gap-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                              >
                                <UserCog className="w-4 h-4 text-slate-400" />
                                Make {ROLE_LABEL[option].toLowerCase()}
                              </button>
                            ))}

                          <div className="my-1.5 border-t border-slate-100" />

                          <button
                            onClick={() => {
                              setMenuFor(null)
                              setActionError(null)
                              setPending({ kind: "RESET_PASSWORD", user })
                            }}
                            className="w-full px-3 py-2 flex items-center gap-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                          >
                            <KeyRound className="w-4 h-4 text-slate-400" />
                            Generate reset link
                          </button>

                          {user.isBanned ? (
                            <button
                              onClick={() => {
                                setMenuFor(null)
                                setActionError(null)
                                setPending({ kind: "UNBAN", user })
                              }}
                              className="w-full px-3 py-2 flex items-center gap-2.5 text-sm text-emerald-700 hover:bg-emerald-50 transition-colors"
                            >
                              <ShieldCheck className="w-4 h-4" />
                              Reinstate account
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setMenuFor(null)
                                setActionError(null)
                                setReason("")
                                setPending({ kind: "BAN", user })
                              }}
                              className="w-full px-3 py-2 flex items-center gap-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <Ban className="w-4 h-4" />
                              Suspend account
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.total > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between text-sm">
            <span className="text-slate-500">
              Showing{" "}
              <span className="font-semibold text-slate-700 tabular-nums">
                {(pagination.page - 1) * pagination.pageSize + 1}–
                {Math.min(pagination.page * pagination.pageSize, pagination.total)}
              </span>{" "}
              of <span className="font-semibold text-slate-700">{formatCount(pagination.total)}</span>
            </span>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                disabled={pagination.page <= 1}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 text-slate-600 tabular-nums">
                {pagination.page} / {pagination.totalPages}
              </span>
              <button
                onClick={() => setPage(prev => Math.min(prev + 1, pagination.totalPages))}
                disabled={pagination.page >= pagination.totalPages}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation dialog */}
      {pending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => !working && setPending(null)}
          />

          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 animate-fade-up">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                pending.kind === "BAN"
                  ? "bg-red-50 text-red-600"
                  : pending.kind === "UNBAN"
                    ? "bg-emerald-50 text-emerald-600"
                    : pending.kind === "RESET_PASSWORD"
                      ? "bg-sky-50 text-sky-600"
                      : "bg-indigo-50 text-indigo-600"
              }`}
            >
              {pending.kind === "BAN" ? (
                <Ban className="w-6 h-6" />
              ) : pending.kind === "UNBAN" ? (
                <ShieldCheck className="w-6 h-6" />
              ) : pending.kind === "RESET_PASSWORD" ? (
                <KeyRound className="w-6 h-6" />
              ) : (
                <UserCog className="w-6 h-6" />
              )}
            </div>

            <h2 className="text-lg font-bold text-slate-900 mb-1.5">
              {pending.kind === "BAN" && `Suspend ${pending.user.name}?`}
              {pending.kind === "UNBAN" && `Reinstate ${pending.user.name}?`}
              {pending.kind === "RESET_PASSWORD" && `Reset ${pending.user.name}'s password?`}
              {pending.kind === "CHANGE_ROLE" &&
                `Make ${pending.user.name} a ${ROLE_LABEL[pending.role].toLowerCase()}?`}
            </h2>

            <p className="text-sm text-slate-500 leading-relaxed mb-5">
              {pending.kind === "BAN" &&
                "They will be signed out everywhere immediately and blocked from signing back in until reinstated."}
              {pending.kind === "UNBAN" &&
                "Their account becomes active again and they can sign in straight away."}
              {pending.kind === "RESET_PASSWORD" &&
                (pending.user.hasPendingReset
                  ? `They requested a password reset. Approving will generate a 1-hour secure link, notify them in the portal, and give you a direct email shortcut to send it to ${pending.user.email}.`
                  : "This generates a single-use link valid for one hour. Their current password keeps working until they use it.")}
              {pending.kind === "CHANGE_ROLE" &&
                `Their permissions change immediately and their current sessions are revoked, so they will need to sign in again.${
                  pending.role === "ADMIN" ? " Admins have full access to this portal." : ""
                }`}
            </p>

            {pending.kind === "BAN" && (
              <div className="mb-5">
                <label
                  htmlFor="ban-reason"
                  className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-2"
                >
                  Reason (shown to the user)
                </label>
                <textarea
                  id="ban-reason"
                  value={reason}
                  onChange={event => setReason(event.target.value)}
                  rows={3}
                  autoFocus
                  placeholder="e.g. Repeated academic-integrity violations across three exams."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>
            )}

            {actionError && (
              <div className="flex items-start gap-2 px-3 py-2 mb-4 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                {actionError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setPending(null)
                  setActionError(null)
                }}
                disabled={working}
                className="flex-1 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => void runPending()}
                disabled={working || (pending.kind === "BAN" && reason.trim().length < 10)}
                className={`flex-1 py-2.5 rounded-lg text-white font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 ${
                  pending.kind === "BAN"
                    ? "bg-red-600 hover:bg-red-700"
                    : pending.kind === "UNBAN"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-slate-900 hover:bg-slate-800"
                }`}
              >
                {working && <Loader2 className="w-4 h-4 animate-spin" />}
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset link hand-off */}
      {resetLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setResetLink(null)}
          />

          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 animate-fade-up">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
              <KeyRound className="w-6 h-6" />
            </div>

            <h2 className="text-lg font-bold text-slate-900 mb-1.5">Reset link for {resetLink.name}</h2>
            <p className="text-sm text-slate-500 leading-relaxed mb-4">
              Valid for one hour and single-use. Send it to{" "}
              <span className="font-semibold text-slate-700">{resetLink.email || "the user"}</span>{" "}
              via email or copy the link below.
            </p>

            <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg mb-4">
              <code className="flex-1 text-xs text-slate-600 break-all font-mono">
                {resetLink.url}
              </code>
              <button
                onClick={() => {
                  void navigator.clipboard?.writeText(resetLink.url)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                }}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>

            {resetLink.email && (
              <a
                href={`mailto:${encodeURIComponent(resetLink.email)}?subject=${encodeURIComponent("Your Password Reset Link - Based Education")}&body=${encodeURIComponent(
                  `Hello ${resetLink.name},\n\nAn administrator has approved your password reset request. Please click or open the link below to set your new password:\n\n${resetLink.url}\n\nThis link is valid for 1 hour.\n\nBest regards,\nBased Education Team`
                )}`}
                className="w-full mb-3 py-2.5 px-4 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm transition-colors inline-flex items-center justify-center gap-2"
              >
                <Mail className="w-4 h-4" />
                <span>Open Email Client to Send Link to {resetLink.email}</span>
              </a>
            )}

            <button
              onClick={() => setResetLink(null)}
              className="w-full py-2.5 rounded-lg bg-white border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
