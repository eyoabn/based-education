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
    indigo: "bg-indigo-50 text-indigo-600",
    amber: "bg-amber-50 text-amber-600",
    emerald: "bg-emerald-50 text-emerald-600",
    red: "bg-red-50 text-red-600",
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tones[tone]}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="text-2xl font-bold text-slate-900 tracking-tight tabular-nums">{value}</div>
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
    setSubmissions(prev => prev.map(s => (s.id === updated.id ? updated : s)))
    setSelected(prev => (prev && prev.id === updated.id ? updated : prev))
    setSummary(prev =>
      prev
        ? {
            ...prev,
            awaitingReview: prev.awaitingReview + (updated.status === "GRADED" ? -1 : 0),
            graded: prev.graded + (updated.status === "GRADED" ? 1 : 0),
          }
        : prev
    )
  }, [])

  const examTitle = examIdFilter ? submissions[0]?.examTitle : null

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Grading Suite</h1>
          <p className="text-sm text-slate-500 mt-1">
            {examTitle
              ? `Reviewing submissions for "${examTitle}".`
              : "Review written answers, inspect integrity flags and release grades."}
          </p>
        </div>

        <button
          onClick={() => void load()}
          className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-semibold rounded-lg transition-colors shadow-sm"
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
        <Filter className="w-4 h-4 text-slate-400" />
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
              className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                active
                  ? "bg-slate-900 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {item.label}
              <span className={`ml-1.5 tabular-nums ${active ? "text-slate-400" : "text-slate-400"}`}>
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
            <div key={i} className="h-16 bg-white rounded-xl border border-slate-200 animate-pulse" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
          <ClipboardList className="w-10 h-10 text-slate-300 mx-auto mb-4" />
          <p className="font-semibold text-slate-700">Nothing to grade here</p>
          <p className="text-sm text-slate-400 mt-1">
            {submissions.length === 0
              ? "Submissions appear as soon as your students finish a paper."
              : "No submissions match this filter."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Student
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Assessment
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Submitted
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Auto-Grade
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Integrity
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Status
                  </th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {visible.map(submission => {
                  const risk = riskLevel(submission.tabSwitches, submission.maxTabSwitches)
                  const released = submission.status === "GRADED" && submission.score !== null
                  const displayScore = released ? submission.score! : submission.autoScore

                  return (
                    <tr
                      key={submission.id}
                      className={`hover:bg-slate-50 transition-colors ${
                        submission.isFlagged ? "bg-red-50/40" : ""
                      }`}
                    >
                      {/* Student */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                            <img
                              src={
                                submission.avatarUrl ||
                                `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(submission.studentName)}`
                              }
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-800 truncate">
                              {submission.studentName}
                            </div>
                            <div className="text-xs text-slate-400 truncate">
                              {submission.studentEmail}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Assessment */}
                      <td className="px-5 py-3">
                        <div className="font-medium text-slate-700 truncate max-w-[220px]">
                          {submission.examTitle}
                        </div>
                        {submission.courseTitle && (
                          <div className="text-xs text-slate-400 truncate">
                            {submission.courseTitle}
                          </div>
                        )}
                      </td>

                      {/* Submitted */}
                      <td className="px-5 py-3 text-slate-600 whitespace-nowrap">
                        {formatWhen(submission.submittedAt)}
                      </td>

                      {/* Auto-grade */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <Sparkles
                            className={`w-3.5 h-3.5 shrink-0 ${released ? "text-emerald-500" : "text-indigo-400"}`}
                          />
                          <span className="font-bold text-slate-800 tabular-nums">
                            {displayScore}
                            <span className="text-slate-400 font-normal">
                              /{submission.maxScore}
                            </span>
                          </span>
                          <span className="text-xs text-slate-400 tabular-nums">
                            {scorePct(displayScore, submission.maxScore)}%
                          </span>
                        </div>
                        {submission.pendingManualCount > 0 && (
                          <div className="text-[11px] text-amber-600 font-semibold mt-0.5">
                            {submission.pendingManualCount} essay
                            {submission.pendingManualCount === 1 ? "" : "s"} to review
                          </div>
                        )}
                      </td>

                      {/* Integrity */}
                      <td className="px-5 py-3">
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
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ring-inset whitespace-nowrap ${STATUS_STYLE[submission.status]}`}
                        >
                          {STATUS_LABEL[submission.status]}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => setSelected(submission)}
                          className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
                        >
                          {submission.status === "GRADED" ? "Review" : "Grade"}
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
          <div className="h-10 w-64 bg-white rounded-lg border border-slate-200 animate-pulse" />
          <div className="h-64 bg-white rounded-xl border border-slate-200 animate-pulse" />
        </div>
      }
    >
      <GradingSuite />
    </Suspense>
  )
}
