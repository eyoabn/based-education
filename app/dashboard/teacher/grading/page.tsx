"use client"

import { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Clock,
  Filter,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Users,
} from "lucide-react"
import SubmissionGradeDrawer from "@/components/exams/SubmissionGradeDrawer"
import {
  formatWhen,
  riskLevel,
  RISK_STYLE,
  scorePct,
  STATUS_LABEL,
  STATUS_STYLE,
  type SubmissionRow,
} from "@/lib/exams"

interface Summary {
  total: number
  awaitingReview: number
  graded: number
  flagged: number
}

type FilterMode = "ALL" | "SUBMITTED" | "GRADED" | "FLAGGED"

const FILTERS: { id: FilterMode; label: string }[] = [
  { id: "ALL", label: "All" },
  { id: "SUBMITTED", label: "Awaiting Review" },
  { id: "GRADED", label: "Graded" },
  { id: "FLAGGED", label: "Flagged" },
]

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Users
  label: string
  value: number | string
  tone: "indigo" | "amber" | "emerald" | "red"
}) {
  const tones = {
    indigo: "bg-[rgba(212,175,55,0.12)] text-[#d4af37] border border-[rgba(212,175,55,0.25)]",
    amber: "bg-amber-500/10 text-amber-300 border border-amber-500/20",
    emerald: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    red: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
  }

  return (
    <div className="bg-[#111110] rounded-2xl border border-white/[0.08] shadow-lg shadow-black/20 p-5 hover:border-[rgba(212,175,55,0.3)] transition-all">
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-bold uppercase tracking-wider text-[#9d9b95]">
          {label}
        </span>
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${tones[tone]}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="text-2xl font-black text-[#f7f3e8] tracking-tight tabular-nums">{value}</div>
    </div>
  )
}

function GradingSuite() {
  const searchParams = useSearchParams()
  const examIdFilter = searchParams.get("examId")

  const [submissions, setSubmissions] = useState<SubmissionRow[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterMode>("ALL")
  const [selected, setSelected] = useState<SubmissionRow | null>(null)

  const load = useCallback(async () => {
    try {
      const query = examIdFilter ? `?examId=${encodeURIComponent(examIdFilter)}` : ""
      const res = await fetch(`/api/grading${query}`)
      const data = await res.json()
      if (data.error) setError(data.error)
      else {
        setError(null)
        setSubmissions(data.submissions ?? [])
        setSummary(data.summary ?? null)
      }
    } catch {
      setError("Could not load submissions.")
    } finally {
      setLoading(false)
    }
  }, [examIdFilter])

  useEffect(() => {
    void load()
  }, [load])

  const visible = useMemo(() => {
    switch (filter) {
      case "SUBMITTED":
        return submissions.filter(s => s.status === "SUBMITTED")
      case "GRADED":
        return submissions.filter(s => s.status === "GRADED")
      case "FLAGGED":
        return submissions.filter(s => s.isFlagged)
      default:
        return submissions
    }
  }, [submissions, filter])

  // Keep the table and the open drawer pointing at the same object.
  const handleSaved = useCallback((updated: SubmissionRow) => {
    setSubmissions(prev => {
      // Find the previous version of this submission to compute the correct delta.
      const previous = prev.find(s => s.id === updated.id)
      const wasGraded = previous?.status === "GRADED"
      const isNowGraded = updated.status === "GRADED"
      // Only adjust summary counters when the status actually changes.
      if (!wasGraded && isNowGraded) {
        setSummary(s =>
          s ? { ...s, awaitingReview: s.awaitingReview - 1, graded: s.graded + 1 } : s
        )
      }
      return prev.map(s => (s.id === updated.id ? updated : s))
    })
    setSelected(prev => (prev && prev.id === updated.id ? updated : prev))
  }, [])

  const examTitle = examIdFilter ? submissions[0]?.examTitle : null

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#f7f3e8] tracking-tight">Grading Suite</h1>
          <p className="text-sm text-[#9d9b95] mt-1">
            {examTitle
              ? `Reviewing submissions for "${examTitle}".`
              : "Review written answers, inspect integrity flags and release grades."}
          </p>
        </div>

        <button
          onClick={() => void load()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#181817] border border-white/[0.08] hover:border-[rgba(212,175,55,0.35)] text-[#f7f3e8] text-xs font-semibold rounded-xl transition-all shadow-sm min-h-[38px]"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#d4af37]" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-rose-950/25 border border-rose-500/30 rounded-2xl text-sm text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Stats */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={ClipboardList} tone="indigo" label="Submissions" value={summary.total} />
          <StatCard icon={Clock} tone="amber" label="Awaiting Review" value={summary.awaitingReview} />
          <StatCard icon={CheckCircle2} tone="emerald" label="Graded" value={summary.graded} />
          <StatCard icon={ShieldAlert} tone="red" label="Flagged" value={summary.flagged} />
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-[#9d9b95]" />
        {FILTERS.map(item => {
          const active = filter === item.id
          const count =
            item.id === "ALL"
              ? submissions.length
              : item.id === "FLAGGED"
                ? submissions.filter(s => s.isFlagged).length
                : submissions.filter(s => s.status === item.id).length

          return (
            <button
              key={item.id}
              onClick={() => setFilter(item.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all min-h-[34px] ${
                active
                  ? "bg-gradient-to-r from-[#d4af37] to-[#b38f2a] text-black shadow-md shadow-[rgba(212,175,55,0.15)]"
                  : "bg-[#181817] border border-white/[0.08] text-[#9d9b95] hover:text-[#f7f3e8] hover:border-white/[0.15]"
              }`}
            >
              {item.label}
              <span className={`ml-1.5 tabular-nums ${active ? "text-black/70" : "text-[#9d9b95]"}`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-[#111110] rounded-2xl border border-white/[0.08] animate-pulse" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="bg-[#111110] rounded-2xl border border-white/[0.08] shadow-lg p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[rgba(212,175,55,0.08)] border border-[rgba(212,175,55,0.2)] flex items-center justify-center mx-auto mb-4 text-[#d4af37]">
            <ClipboardList className="w-6 h-6" />
          </div>
          <p className="font-bold text-[#f7f3e8]">Nothing to grade here</p>
          <p className="text-sm text-[#9d9b95] mt-1">
            {submissions.length === 0
              ? "Submissions appear as soon as your students finish an assessment."
              : "No submissions match this filter."}
          </p>
        </div>
      ) : (
        <div className="bg-[#111110] rounded-2xl border border-white/[0.08] shadow-lg shadow-black/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#181817] border-b border-white/[0.08]">
                  <th className="text-left px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-[#9d9b95]">
                    Student
                  </th>
                  <th className="text-left px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-[#9d9b95]">
                    Assessment
                  </th>
                  <th className="text-left px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-[#9d9b95]">
                    Submitted
                  </th>
                  <th className="text-left px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-[#9d9b95]">
                    Auto-Grade
                  </th>
                  <th className="text-left px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-[#9d9b95]">
                    Integrity
                  </th>
                  <th className="text-left px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-[#9d9b95]">
                    Status
                  </th>
                  <th className="px-5 py-3.5" />
                </tr>
              </thead>

              <tbody className="divide-y divide-white/[0.06]">
                {visible.map(submission => {
                  const risk = riskLevel(submission.tabSwitches, submission.maxTabSwitches)
                  const released = submission.status === "GRADED" && submission.score !== null
                  const displayScore = released ? submission.score! : submission.autoScore

                  return (
                    <tr
                      key={submission.id}
                      className={`hover:bg-white/[0.03] transition-colors ${
                        submission.isFlagged ? "bg-rose-950/20" : ""
                      }`}
                    >
                      {/* Student */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.25)] overflow-hidden shrink-0">
                            <img
                              src={
                                submission.avatarUrl ||
                                `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(submission.studentName)}&backgroundColor=0284c7,4f46e5,059669`
                              }
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-[#f7f3e8] truncate">
                              {submission.studentName}
                            </div>
                            <div className="text-xs text-[#9d9b95] truncate">
                              {submission.studentEmail}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Assessment */}
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-[#f7f3e8] truncate max-w-[220px]">
                          {submission.examTitle}
                        </div>
                        {submission.courseTitle && (
                          <div className="text-xs text-[#9d9b95] truncate">
                            {submission.courseTitle}
                          </div>
                        )}
                      </td>

                      {/* Submitted */}
                      <td className="px-5 py-3.5 text-[#9d9b95] whitespace-nowrap">
                        {formatWhen(submission.submittedAt)}
                      </td>

                      {/* Auto-grade */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <Sparkles
                            className={`w-3.5 h-3.5 shrink-0 ${released ? "text-[#d4af37]" : "text-amber-400"}`}
                          />
                          <span className="font-black text-[#f7f3e8] tabular-nums">
                            {displayScore}
                            <span className="text-[#9d9b95] font-normal">
                              /{submission.maxScore}
                            </span>
                          </span>
                          <span className="text-xs text-[#d4af37] font-semibold tabular-nums">
                            {scorePct(displayScore, submission.maxScore)}%
                          </span>
                        </div>
                        {submission.pendingManualCount > 0 && (
                          <div className="text-[11px] text-amber-300 font-semibold mt-0.5">
                            {submission.pendingManualCount} essay
                            {submission.pendingManualCount === 1 ? "" : "s"} to review
                          </div>
                        )}
                      </td>

                      {/* Integrity */}
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ring-inset whitespace-nowrap ${RISK_STYLE[risk]}`}
                        >
                          {risk === "HIGH" && <ShieldAlert className="w-3 h-3" />}
                          {risk === "CLEAN"
                            ? "No violations"
                            : `${risk === "HIGH" ? "⚠️ High risk: " : ""}${submission.tabSwitches} tab switch${
                                submission.tabSwitches === 1 ? "" : "es"
                              }`}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ring-inset whitespace-nowrap ${STATUS_STYLE[submission.status]}`}
                        >
                          {STATUS_LABEL[submission.status]}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => setSelected(submission)}
                          className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap min-h-[36px] ${
                            submission.status === "GRADED"
                              ? "bg-[rgba(212,175,55,0.12)] hover:bg-[rgba(212,175,55,0.2)] text-[#f5d77f] border border-[rgba(212,175,55,0.25)]"
                              : "bg-gradient-to-r from-[#d4af37] to-[#b38f2a] hover:brightness-110 text-black shadow-md shadow-[rgba(212,175,55,0.15)]"
                          }`}
                        >
                          {submission.status === "GRADED" ? "Edit Grade" : "Grade Paper"}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <SubmissionGradeDrawer
        submission={selected}
        onClose={() => setSelected(null)}
        onSaved={handleSaved}
      />
    </div>
  )
}

export default function TeacherGradingPage() {
  // `useSearchParams` needs a Suspense boundary during prerender.
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto space-y-4">
          <div className="h-10 w-64 bg-[#111110] rounded-xl border border-white/[0.08] animate-pulse" />
          <div className="h-64 bg-[#111110] rounded-2xl border border-white/[0.08] animate-pulse" />
        </div>
      }
    >
      <GradingSuite />
    </Suspense>
  )
}
