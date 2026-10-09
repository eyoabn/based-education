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
    indigo: "bg-[rgba(212,175,55,0.12)] text-[#d4af37] border border-[rgba(212,175,55,0.25)]",
    emerald: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    amber: "bg-amber-500/10 text-amber-300 border border-amber-500/20",
    slate: "bg-white/[0.06] text-[#9d9b95] border border-white/[0.08]",
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
      {hint && <p className="text-xs text-[#9d9b95] mt-1">{hint}</p>}
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
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-[#0c0c0b] rounded-3xl border border-white/[0.08] shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-scale-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 sm:px-6 py-4 sm:py-5 border-b border-white/[0.08] bg-[#111110]">
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-bold text-[#f7f3e8] truncate">{row.examTitle}</h2>
            <p className="text-xs sm:text-sm text-[#9d9b95] mt-0.5 truncate">
              {row.courseTitle ?? "General"}
              {row.teacherName ? ` · ${row.teacherName}` : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 hover:bg-white/[0.06] rounded-xl text-[#9d9b95] hover:text-[#f7f3e8] transition-colors shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Score band */}
        {row.score !== null && (
          <div
            className={`px-5 sm:px-6 py-3.5 sm:py-4 flex flex-wrap items-center justify-between gap-3 border-b ${
              passed
                ? "bg-[rgba(212,175,55,0.08)] border-[rgba(212,175,55,0.2)] text-[#f5d77f]"
                : "bg-rose-950/25 border-rose-500/25 text-rose-300"
            }`}
          >
            <div className="flex items-center gap-2">
              {passed ? (
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-[#d4af37] shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-rose-400 shrink-0" />
              )}
              <span
                className={`text-xs sm:text-sm font-black ${passed ? "text-[#f5d77f]" : "text-rose-400"}`}
              >
                {passed ? "Passed" : "Did not pass"}
              </span>
              <span className="text-[11px] sm:text-xs text-[#9d9b95]">
                (pass mark {row.passingPct}%)
              </span>
            </div>
            <div className="text-right">
              <div className="text-lg sm:text-xl font-black text-[#f7f3e8] tabular-nums">
                {row.score}
                <span className="text-[#9d9b95] font-normal">/{row.maxScore}</span>
              </div>
              <div className="text-[11px] sm:text-xs text-[#d4af37] font-semibold tabular-nums">
                {scorePct(row.score, row.maxScore)}%
              </div>
            </div>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 sm:py-5 space-y-4 sm:space-y-5">
          {row.feedback && (
            <div className="p-4 bg-[#181817] border border-white/[0.08] rounded-2xl">
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#d4af37] mb-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                Teacher&apos;s feedback
              </p>
              <p className="text-sm text-[#f7f3e8] leading-relaxed whitespace-pre-wrap">
                {row.feedback}
              </p>
            </div>
          )}

          {row.answers.length === 0 ? (
            <p className="text-sm text-[#9d9b95] text-center py-8">
              The marked script is not available for this assessment.
            </p>
          ) : (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#9d9b95]">
                Question breakdown
              </h3>

              {row.answers.map((answer, index) => {
                const question = byId.get(answer.questionId)
                const full = answer.pointsAwarded >= answer.maxPoints && answer.maxPoints > 0
                const zero = answer.pointsAwarded === 0

                return (
                  <div
                    key={answer.questionId}
                    className="border border-white/[0.08] bg-[#111110] rounded-2xl overflow-hidden shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3 px-4 py-3 bg-[#181817] border-b border-white/[0.06]">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-[#d4af37] tabular-nums">
                            Q{index + 1}
                          </span>
                          {question && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#9d9b95]">
                              {QUESTION_TYPE_LABEL[question.type]}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-[#f7f3e8] leading-snug">
                          {question?.prompt ?? "Question unavailable"}
                        </p>
                      </div>

                      <span
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold tabular-nums whitespace-nowrap shrink-0 ${
                          full
                            ? "bg-[rgba(212,175,55,0.15)] text-[#f5d77f] border border-[rgba(212,175,55,0.25)]"
                            : zero
                              ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                              : "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                        }`}
                      >
                        {answer.pointsAwarded}/{answer.maxPoints}
                      </span>
                    </div>

                    <div className="px-4 py-3 space-y-2">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#9d9b95] mb-1">
                          Your answer
                        </p>
                        <p className="text-sm text-[#f7f3e8] whitespace-pre-wrap">
                          {answer.text?.trim()
                            ? answer.text
                            : answer.selectedOptionId
                              ? (question?.options.find(o => o.id === answer.selectedOptionId)
                                  ?.text ?? "—")
                              : "Left blank"}
                        </p>
                      </div>

                      {answer.feedback && (
                        <div className="pt-2 border-t border-white/[0.06]">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-[#d4af37] mb-1">
                            Remark
                          </p>
                          <p className="text-sm text-[#f5d77f] whitespace-pre-wrap">
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

        <div className="px-6 py-4 border-t border-white/[0.08] bg-[#111110] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-[#181817] hover:bg-[#20201e] border border-white/[0.08] text-[#f7f3e8] text-sm font-semibold rounded-xl transition-colors min-h-[40px]"
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
        <h1 className="text-2xl font-black text-[#f7f3e8] tracking-tight">Gradebook</h1>
        <p className="text-sm text-[#9d9b95] mt-1">
          Every assessment sat, with results and faculty feedback.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-rose-950/25 border border-rose-500/30 rounded-2xl text-sm text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Overview */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="h-28 bg-[#111110] rounded-2xl border border-white/[0.08] animate-pulse" />
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
        <div className="h-64 bg-[#111110] rounded-2xl border border-white/[0.08] animate-pulse" />
      ) : grades.length === 0 ? (
        <div className="bg-[#111110] rounded-2xl border border-white/[0.08] shadow-lg p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[rgba(212,175,55,0.08)] border border-[rgba(212,175,55,0.2)] flex items-center justify-center mx-auto mb-4 text-[#d4af37]">
            <BookOpen className="w-6 h-6" />
          </div>
          <p className="font-bold text-[#f7f3e8]">No results yet</p>
          <p className="text-sm text-[#9d9b95] mt-1">
            Complete an exam or submit an assignment to view marks and feedback here.
          </p>
        </div>
      ) : (
        <div className="bg-[#111110] rounded-2xl border border-white/[0.08] shadow-lg shadow-black/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#181817] border-b border-white/[0.08]">
                  <th className="text-left px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-[#9d9b95]">
                    Course
                  </th>
                  <th className="text-left px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-[#9d9b95]">
                    Assessment
                  </th>
                  <th className="text-left px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-[#9d9b95]">
                    Score
                  </th>
                  <th className="text-left px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-[#9d9b95]">
                    Result
                  </th>
                  <th className="text-left px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-[#9d9b95]">
                    Feedback
                  </th>
                  <th className="px-5 py-3.5" />
                </tr>
              </thead>

              <tbody className="divide-y divide-white/[0.06]">
                {grades.map(row => {
                  const released = row.status === "GRADED" && row.score !== null
                  const passed =
                    released && hasPassed(row.score!, row.maxScore, row.passingPct)

                  return (
                    <tr key={row.submissionId} className="hover:bg-white/[0.03] transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-[#f7f3e8] truncate max-w-[180px]">
                          {row.courseTitle ?? "General"}
                        </div>
                        {row.teacherName && (
                          <div className="text-xs text-[#9d9b95] truncate">{row.teacherName}</div>
                        )}
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="font-bold text-[#f7f3e8] truncate max-w-[220px]">
                          {row.examTitle}
                        </div>
                        <div className="text-xs text-[#9d9b95]">
                          {row.type === "EXAM" ? "Exam" : "Assignment"} ·{" "}
                          {formatWhen(row.submittedAt)}
                        </div>
                      </td>

                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {released ? (
                          <div className="flex items-baseline gap-2">
                            <span className="font-black text-[#f7f3e8] tabular-nums">
                              {row.score}
                              <span className="text-[#9d9b95] font-normal">/{row.maxScore}</span>
                            </span>
                            <span className="text-xs text-[#d4af37] font-semibold tabular-nums">
                              {scorePct(row.score!, row.maxScore)}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-white/20">—</span>
                        )}
                      </td>

                      <td className="px-5 py-3.5">
                        {released ? (
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ring-inset whitespace-nowrap ${
                              passed
                                ? "bg-[rgba(212,175,55,0.12)] text-[#f5d77f] ring-[rgba(212,175,55,0.25)]"
                                : "bg-rose-500/10 text-rose-400 ring-rose-500/20"
                            }`}
                          >
                            {passed ? (
                              <CheckCircle2 className="w-3 h-3 text-[#d4af37]" />
                            ) : (
                              <XCircle className="w-3 h-3 text-rose-400" />
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

                      <td className="px-5 py-3.5">
                        {row.feedback ? (
                          <p className="text-[#9d9b95] line-clamp-2 max-w-[260px]">
                            {row.feedback}
                          </p>
                        ) : (
                          <span className="text-white/20">—</span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => setSelected(row)}
                          disabled={!released}
                          className="px-3.5 py-2 bg-[#181817] border border-white/[0.08] hover:border-[rgba(212,175,55,0.35)] hover:text-[#f7f3e8] disabled:opacity-30 disabled:cursor-not-allowed text-[#9d9b95] text-xs font-semibold rounded-xl transition-all whitespace-nowrap min-h-[36px]"
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
