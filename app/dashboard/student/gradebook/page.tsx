"use client"

import { useEffect, useMemo, useState } from "react"
import {
  AlertCircle,
  Award,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Hourglass,
  MessageSquare,
  TrendingUp,
  X,
  XCircle,
} from "lucide-react"
import {
  formatWhen,
  hasPassed,
  QUESTION_TYPE_LABEL,
  scorePct,
  STATUS_LABEL,
  STATUS_STYLE,
  type GradebookRow,
  type GradebookSummary,
} from "@/lib/exams"

function OverviewCard({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: typeof Award
  label: string
  value: string
  hint?: string
  tone: "indigo" | "emerald" | "amber" | "slate"
}) {
  const tones = {
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    slate: "bg-slate-100 text-slate-600",
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
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  )
}

/** Released papers only — the modal shows the student their own marked script. */
function DetailsModal({ row, onClose }: { row: GradebookRow; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  const passed =
    row.score !== null && hasPassed(row.score, row.maxScore, row.passingPct)
  const byId = new Map(row.questions.map(q => [q.id, q]))

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-slate-100">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-900 truncate">{row.examTitle}</h2>
            <p className="text-sm text-slate-400 mt-0.5 truncate">
              {row.courseTitle ?? "General"}
              {row.teacherName ? ` · ${row.teacherName}` : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Score band */}
        {row.score !== null && (
          <div
            className={`px-6 py-4 flex items-center justify-between gap-4 ${
              passed ? "bg-emerald-50" : "bg-red-50"
            }`}
          >
            <div className="flex items-center gap-2">
              {passed ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
              <span
                className={`font-bold ${passed ? "text-emerald-700" : "text-red-700"}`}
              >
                {passed ? "Passed" : "Did not pass"}
              </span>
              <span className="text-xs text-slate-500">
                (pass mark {row.passingPct}%)
              </span>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-slate-900 tabular-nums">
                {row.score}
                <span className="text-slate-400 font-normal">/{row.maxScore}</span>
              </div>
              <div className="text-xs text-slate-500 tabular-nums">
                {scorePct(row.score, row.maxScore)}%
              </div>
            </div>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {row.feedback && (
            <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-indigo-700 mb-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                Teacher&apos;s feedback
              </p>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                {row.feedback}
              </p>
            </div>
          )}

          {row.answers.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">
              The marked script is not available for this assessment.
            </p>
          ) : (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Question breakdown
              </h3>

              {row.answers.map((answer, index) => {
                const question = byId.get(answer.questionId)
                const full = answer.pointsAwarded >= answer.maxPoints && answer.maxPoints > 0
                const zero = answer.pointsAwarded === 0

                return (
                  <div
                    key={answer.questionId}
                    className="border border-slate-200 rounded-xl overflow-hidden"
                  >
                    <div className="flex items-start justify-between gap-3 px-4 py-3 bg-slate-50 border-b border-slate-100">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-slate-500 tabular-nums">
                            Q{index + 1}
                          </span>
                          {question && (
                            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                              {QUESTION_TYPE_LABEL[question.type]}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-800 leading-snug">
                          {question?.prompt ?? "Question unavailable"}
                        </p>
                      </div>

                      <span
                        className={`px-2.5 py-1 rounded-md text-xs font-bold tabular-nums whitespace-nowrap shrink-0 ${
                          full
                            ? "bg-emerald-100 text-emerald-700"
                            : zero
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {answer.pointsAwarded}/{answer.maxPoints}
                      </span>
                    </div>

                    <div className="px-4 py-3 space-y-2">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">
                          Your answer
                        </p>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">
                          {answer.text?.trim()
                            ? answer.text
                            : answer.selectedOptionId
                              ? (question?.options.find(o => o.id === answer.selectedOptionId)
                                  ?.text ?? "—")
                              : "Left blank"}
                        </p>
                      </div>

                      {answer.feedback && (
                        <div className="pt-2 border-t border-slate-100">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">
                            Remark
                          </p>
                          <p className="text-sm text-slate-600 whitespace-pre-wrap">
                            {answer.feedback}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default function StudentGradebookPage() {
  const [grades, setGrades] = useState<GradebookRow[]>([])
  const [summary, setSummary] = useState<GradebookSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<GradebookRow | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const res = await fetch("/api/grading")
        const data = await res.json()
        if (cancelled) return
        if (data.error) setError(data.error)
        else {
          setGrades(data.grades ?? [])
          setSummary(data.summary ?? null)
        }
      } catch {
        if (!cancelled) setError("Could not load your gradebook.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const cards = useMemo(() => {
    if (!summary) return []
    return [
      {
        icon: TrendingUp,
        label: "Overall Average",
        value: `${summary.averagePct}%`,
        hint: `Grade ${summary.letter} across ${summary.gradedCount} released result${summary.gradedCount === 1 ? "" : "s"}`,
        tone: "indigo" as const,
      },
      {
        icon: ClipboardList,
        label: "Tests Taken",
        value: String(summary.totalTaken),
        hint: `${summary.gradedCount} graded · ${summary.pendingCount} pending`,
        tone: "slate" as const,
      },
      {
        icon: CheckCircle2,
        label: "Passed",
        value: String(summary.passedCount),
        hint:
          summary.failedCount > 0
            ? `${summary.failedCount} below the pass mark`
            : "Nothing below the pass mark",
        tone: "emerald" as const,
      },
      {
        icon: Hourglass,
        label: "Awaiting Results",
        value: String(summary.pendingCount),
        hint: summary.pendingCount > 0 ? "Your teacher is still marking" : "You're all caught up",
        tone: "amber" as const,
      },
    ]
  }, [summary])

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Gradebook</h1>
        <p className="text-sm text-slate-500 mt-1">
          Every assessment you have sat, with your teacher&apos;s feedback where it has been
          released.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Overview */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="h-28 bg-white rounded-xl border border-slate-200 animate-pulse" />
          ))}
        </div>
      ) : (
        summary && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map(card => (
              <OverviewCard key={card.label} {...card} />
            ))}
          </div>
        )
      )}

      {/* Detailed table */}
      {loading ? (
        <div className="h-64 bg-white rounded-xl border border-slate-200 animate-pulse" />
      ) : grades.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
          <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-4" />
          <p className="font-semibold text-slate-700">No results yet</p>
          <p className="text-sm text-slate-400 mt-1">
            Sit an exam or hand in an assignment and your marks will appear here.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Course
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Assessment
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Score
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Result
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Feedback
                  </th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {grades.map(row => {
                  const released = row.status === "GRADED" && row.score !== null
                  const passed =
                    released && hasPassed(row.score!, row.maxScore, row.passingPct)

                  return (
                    <tr key={row.submissionId} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="font-medium text-slate-700 truncate max-w-[180px]">
                          {row.courseTitle ?? "General"}
                        </div>
                        {row.teacherName && (
                          <div className="text-xs text-slate-400 truncate">{row.teacherName}</div>
                        )}
                      </td>

                      <td className="px-5 py-3">
                        <div className="font-semibold text-slate-800 truncate max-w-[220px]">
                          {row.examTitle}
                        </div>
                        <div className="text-xs text-slate-400">
                          {row.type === "EXAM" ? "Exam" : "Assignment"} ·{" "}
                          {formatWhen(row.submittedAt)}
                        </div>
                      </td>

                      <td className="px-5 py-3 whitespace-nowrap">
                        {released ? (
                          <div className="flex items-baseline gap-2">
                            <span className="font-bold text-slate-900 tabular-nums">
                              {row.score}
                              <span className="text-slate-400 font-normal">/{row.maxScore}</span>
                            </span>
                            <span className="text-xs text-slate-400 tabular-nums">
                              {scorePct(row.score!, row.maxScore)}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      <td className="px-5 py-3">
                        {released ? (
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ring-inset whitespace-nowrap ${
                              passed
                                ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
                                : "bg-red-50 text-red-700 ring-red-600/20"
                            }`}
                          >
                            {passed ? (
                              <CheckCircle2 className="w-3 h-3" />
                            ) : (
                              <XCircle className="w-3 h-3" />
                            )}
                            {passed ? "Pass" : "Fail"}
                          </span>
                        ) : (
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ring-inset whitespace-nowrap ${STATUS_STYLE[row.status]}`}
                          >
                            {STATUS_LABEL[row.status]}
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-3">
                        {row.feedback ? (
                          <p className="text-slate-600 line-clamp-2 max-w-[260px]">
                            {row.feedback}
                          </p>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => setSelected(row)}
                          disabled={!released}
                          className="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
                        >
                          View Details
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

      {selected && <DetailsModal row={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
