"use client"

import { useCallback, useEffect, useState } from "react"
import { AlertCircle, Check, Inbox, Loader2, ShieldCheck, UserCheck } from "lucide-react"
import TeacherApprovalCard from "@/components/admin/TeacherApprovalCard"
import {
  APPROVAL_TABS,
  type ApprovalFilter,
  type ApprovalQueueCounts,
  type TeacherApplication,
} from "@/lib/admin"

/**
 * Teacher verification queue.
 *
 * The tab counts come back with every fetch rather than being derived from the
 * loaded page, so a decision made here immediately corrects all three numbers —
 * an approval has to leave "Pending" and arrive in "Approved" in one move.
 */
export default function AdminApprovalsPage() {
  const [filter, setFilter] = useState<ApprovalFilter>("PENDING")
  const [applications, setApplications] = useState<TeacherApplication[]>([])
  const [counts, setCounts] = useState<ApprovalQueueCounts>({
    pending: 0,
    approved: 0,
    rejected: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const load = useCallback(async (status: ApprovalFilter) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/approvals?status=${status}`, { cache: "no-store" })
      const payload = await res.json()

      if (!res.ok) {
        setError(payload.error ?? "Could not load the verification queue.")
        return
      }

      setApplications(payload.applications ?? [])
      setCounts(payload.counts ?? { pending: 0, approved: 0, rejected: 0 })
      setError(null)
    } catch {
      setError("Could not reach the server.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(filter)
  }, [filter, load])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 6000)
    return () => clearTimeout(timer)
  }, [toast])

  /**
   * Throws on failure — `TeacherApprovalCard` catches and shows the message
   * inline on the card that was acted on, which is where the operator is
   * looking.
   */
  async function decide(
    application: TeacherApplication,
    status: "APPROVED" | "REJECTED",
    reason?: string
  ) {
    const res = await fetch("/api/admin/approvals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teacherId: application.id, status, reason }),
    })
    const payload = await res.json()

    if (!res.ok) {
      throw new Error(payload.error ?? "The decision could not be saved.")
    }

    const verb = status === "APPROVED" ? "approved" : "rejected"
    const mail = payload.emailDelivered
      ? "A confirmation email was sent."
      : `In-app notification delivered. Email not sent — ${payload.emailNote ?? "no mail provider configured"}.`
    setToast(`${application.name} was ${verb}. ${mail}`)

    // Refetch rather than splice: the row has moved to a different tab and all
    // three counts changed.
    await load(filter)
  }

  const tabCount = (id: ApprovalFilter) =>
    id === "PENDING" ? counts.pending : id === "APPROVED" ? counts.approved : counts.rejected

  const emptyCopy: Record<ApprovalFilter, { title: string; body: string }> = {
    PENDING: {
      title: "The queue is clear",
      body: "Every teacher application has been reviewed. New ones will appear here as they arrive.",
    },
    APPROVED: {
      title: "No approved teachers yet",
      body: "Approve an application and the teacher will be listed here with their footprint.",
    },
    REJECTED: {
      title: "No rejected applications",
      body: "Rejections are kept on record here along with the reason given.",
    },
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 mb-1 flex items-center gap-2">
          <UserCheck className="w-6 h-6 text-slate-400" />
          Teacher Verification
        </h1>
        <p className="text-slate-500">
          Review credentials before granting class hosting and assessment publishing rights.
        </p>
      </div>

      {toast && (
        <div className="flex items-start gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800">
          <Check className="w-4 h-4 shrink-0 mt-0.5" />
          {toast}
        </div>
      )}

      {/* Filter tabs */}
      <div
        role="tablist"
        aria-label="Application status"
        className="flex flex-wrap gap-1 p-1 bg-slate-100 rounded-xl"
      >
        {APPROVAL_TABS.map(tab => {
          const active = filter === tab.id
          const count = tabCount(tab.id)

          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(tab.id)}
              className={`flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                active
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.label}
              <span
                className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold tabular-nums ${
                  tab.id === "PENDING" && count > 0
                    ? "bg-amber-100 text-amber-700"
                    : active
                      ? "bg-slate-100 text-slate-600"
                      : "bg-white/70 text-slate-500"
                }`}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {error && (
        <div className="flex items-start gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-bold text-red-900">{error}</p>
            <button
              onClick={() => void load(filter)}
              className="mt-2 px-3 py-1.5 rounded-lg bg-white border border-red-200 text-red-700 text-xs font-semibold hover:bg-red-50 transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-3 py-16 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading applications…</span>
        </div>
      ) : applications.length === 0 && !error ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-14 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
            {filter === "PENDING" ? (
              <ShieldCheck className="w-6 h-6" />
            ) : (
              <Inbox className="w-6 h-6" />
            )}
          </div>
          <h2 className="font-bold text-slate-900 mb-1">{emptyCopy[filter].title}</h2>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">{emptyCopy[filter].body}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map(application => (
            <TeacherApprovalCard
              key={application.id}
              application={application}
              onDecide={decide}
            />
          ))}
        </div>
      )}
    </div>
  )
}
