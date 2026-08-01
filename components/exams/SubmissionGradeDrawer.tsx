"use client"

import { useEffect, useMemo, useState } from "react"
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  Mail,
  Send,
  ShieldAlert,
  Sparkles,
  X,
  XCircle,
} from "lucide-react"
import {
  formatWhen,
  hasPassed,
  riskLevel,
  RISK_LABEL,
  RISK_STYLE,
  round2,
  scorePct,
  STATUS_LABEL,
  STATUS_STYLE,
  VIOLATION_LABEL,
  type StudentAnswer,
  type SubmissionRow,
} from "@/lib/exams"

/**
 * Phase 5 — the teacher's review drawer.
 *
 * Auto-graded questions are shown read-only; the editable surface is the essay
 * answers plus the overall remark. The running total mirrors the server's rule
 * — score is the sum of every question's award — so what the teacher sees
 * before releasing is exactly what the student will receive.
 */

interface SubmissionGradeDrawerProps {
  submission: SubmissionRow | null
  onClose: () => void
  /** Hands the saved row back so the table can update in place. */
  onSaved: (submission: SubmissionRow) => void
}

interface AwardDraft {
  points: number
  feedback: string
}

export default function SubmissionGradeDrawer({
  submission,
  onClose,
  onSaved,
}: SubmissionGradeDrawerProps) {
  const [awards, setAwards] = useState<Record<string, AwardDraft>>({})
  const [feedback, setFeedback] = useState("")
  const [saving, setSaving] = useState<"draft" | "release" | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Reseed the form whenever a different paper is opened.
  useEffect(() => {
    if (!submission) return

    const seeded: Record<string, AwardDraft> = {}
    for (const answer of submission.answers) {
      if (answer.autoGraded) continue
      seeded[answer.questionId] = {
        points: answer.pointsAwarded,
        feedback: answer.feedback ?? "",
      }
    }
    setAwards(seeded)
    setFeedback(submission.feedback ?? "")
    setError(null)
    setSaving(null)
  }, [submission])

  // Close on Escape.
  useEffect(() => {
    if (!submission) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [submission, onClose])

  const questionById = useMemo(
    () => new Map((submission?.questions ?? []).map(q => [q.id, q])),
    [submission]
  )

  const manualAnswers = useMemo(
    () => (submission?.answers ?? []).filter(a => !a.autoGraded),
    [submission]
  )
  const autoAnswers = useMemo(
    () => (submission?.answers ?? []).filter(a => a.autoGraded),
    [submission]
  )

  const manualTotal = useMemo(
    () =>
      round2(
        manualAnswers.reduce(
          (sum, a) => sum + (Number(awards[a.questionId]?.points) || 0),
          0
        )
      ),
    [manualAnswers, awards]
  )

  if (!submission) return null

  const runningScore = round2(submission.autoScore + manualTotal)
  const pct = scorePct(runningScore, submission.maxScore)
  const willPass = hasPassed(runningScore, submission.maxScore, submission.passingPct)
  const risk = riskLevel(submission.tabSwitches, submission.maxTabSwitches)
  const correctCount = autoAnswers.filter(a => a.isCorrect).length

  const save = async (release: boolean) => {
    setSaving(release ? "release" : "draft")
    setError(null)

    try {
      const res = await fetch("/api/grading", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId: submission.id,
          awards: Object.fromEntries(
            Object.entries(awards).map(([questionId, draft]) => [
              questionId,
              { points: draft.points, feedback: draft.feedback },
            ])
          ),
          feedback,
          release,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Could not save the grade.")
        return
      }

      onSaved({
        ...submission,
        status: data.submission.status,
        score: data.submission.score,
        gradedAt: data.submission.gradedAt,
        isFlagged: data.submission.isFlagged,
        feedback: data.submission.feedback,
        answers: data.answers as StudentAnswer[],
        pendingManualCount: (data.answers as StudentAnswer[]).filter(
          a => !a.autoGraded && a.feedback === null
        ).length,
      })

      if (release) onClose()
    } catch {
      setError("Network error — please try again.")
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="grade-drawer-title"
        className="relative w-full max-w-2xl bg-slate-50 shadow-2xl flex flex-col animate-slide-in-right"
      >
        {/* Header */}
        <header className="shrink-0 bg-white border-b border-slate-200 px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-full bg-emerald-100 border-2 border-emerald-200 overflow-hidden shrink-0">
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
                <h2 id="grade-drawer-title" className="font-bold text-slate-900 truncate">
                  {submission.studentName}
                </h2>
                <p className="text-xs text-slate-500 flex items-center gap-1 truncate">
                  <Mail className="w-3 h-3 shrink-0" />
                  {submission.studentEmail}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              aria-label="Close"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className="text-sm font-semibold text-slate-700">{submission.examTitle}</span>
            {submission.courseTitle && (
              <span className="text-xs text-slate-400">· {submission.courseTitle}</span>
            )}
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ring-1 ring-inset ${STATUS_STYLE[submission.status]}`}
            >
              {STATUS_LABEL[submission.status]}
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-slate-500">
              <Clock className="w-3 h-3" />
              {formatWhen(submission.submittedAt)}
            </span>
          </div>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Score panel */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-end justify-between gap-4 mb-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                  Running Score
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-slate-900 tabular-nums">
                    {runningScore}
                  </span>
                  <span className="text-lg text-slate-400 tabular-nums">
                    / {submission.maxScore}
                  </span>
                  <span
                    className={`text-sm font-bold ${willPass ? "text-emerald-600" : "text-red-600"}`}
                  >
                    {pct}%
                  </span>
                </div>
              </div>

              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ring-1 ring-inset ${
                  willPass
                    ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
                    : "bg-red-50 text-red-700 ring-red-600/20"
                }`}
              >
                {willPass ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <XCircle className="w-3.5 h-3.5" />
                )}
                {willPass ? "Passing" : "Below pass mark"} ({submission.passingPct}%)
              </span>
            </div>

            <div className="h-2 rounded-full bg-slate-100 overflow-hidden mb-4">
              <div
                className={`h-full rounded-full transition-all ${willPass ? "bg-emerald-500" : "bg-red-500"}`}
                style={{ width: `${Math.min(100, pct)}%` }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 rounded-lg">
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs text-indigo-700 font-semibold">Auto-graded</div>
                  <div className="text-slate-700 tabular-nums">
                    {submission.autoScore} pts · {correctCount}/{autoAnswers.length} correct
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 rounded-lg">
                <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs text-amber-700 font-semibold">Your award</div>
                  <div className="text-slate-700 tabular-nums">
                    {manualTotal} pts · {manualAnswers.length} essay
                    {manualAnswers.length === 1 ? "" : "s"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Integrity log */}
          <div
            className={`rounded-xl border p-4 ${
              risk === "HIGH" ? "bg-red-50 border-red-200" : "bg-white border-slate-200"
            }`}
          >
            <div className="flex items-center justify-between gap-3 mb-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldAlert
                  className={`w-4 h-4 ${risk === "HIGH" ? "text-red-600" : "text-slate-400"}`}
                />
                Integrity Log
              </h3>
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ring-1 ring-inset ${RISK_STYLE[risk]}`}
              >
                {risk === "HIGH" && "⚠️ "}
                {RISK_LABEL[risk]}
              </span>
            </div>

            <p className="text-sm text-slate-600">
              <span className="font-bold tabular-nums">{submission.tabSwitches}</span> tab switch
              {submission.tabSwitches === 1 ? "" : "es"} logged, allowance{" "}
              {submission.maxTabSwitches}.
            </p>

            {submission.violations.length > 0 && (
              <ul className="mt-3 space-y-1.5 max-h-44 overflow-y-auto">
                {submission.violations.map((violation, i) => (
                  <li
                    key={`${violation.at}-${i}`}
                    className="flex items-start gap-2 text-xs text-slate-600"
                  >
                    <span className="font-mono text-slate-400 shrink-0 tabular-nums">
                      {new Date(violation.at).toLocaleTimeString(undefined, {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </span>
                    <span className="min-w-0">
                      {VIOLATION_LABEL[violation.type]}
                      {violation.detail && (
                        <span className="text-slate-400"> — {violation.detail}</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Essay review */}
          {manualAnswers.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Written Responses
              </h3>

              {manualAnswers.map(answer => {
                const question = questionById.get(answer.questionId)
                const draft = awards[answer.questionId] ?? { points: 0, feedback: "" }

                return (
                  <div
                    key={answer.questionId}
                    className="bg-white rounded-xl border border-slate-200 shadow-sm p-4"
                  >
                    <p className="text-sm font-semibold text-slate-800 mb-3">
                      {question?.prompt ?? "Question"}
                    </p>

                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4">
                      {/* Student's answer */}
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 min-h-[96px]">
                        {answer.text ? (
                          <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                            {answer.text}
                          </p>
                        ) : (
                          <p className="text-sm text-slate-400 italic">No answer submitted.</p>
                        )}
                      </div>

                      {/* Scoring box */}
                      <div className="lg:w-36 shrink-0">
                        <label
                          htmlFor={`award-${answer.questionId}`}
                          className="block text-xs font-semibold text-slate-700 mb-1.5"
                        >
                          Points (max {answer.maxPoints})
                        </label>
                        <input
                          id={`award-${answer.questionId}`}
                          type="number"
                          min={0}
                          max={answer.maxPoints}
                          step={0.5}
                          value={draft.points}
                          onChange={e =>
                            setAwards(prev => ({
                              ...prev,
                              [answer.questionId]: {
                                ...draft,
                                points: Math.min(
                                  Math.max(Number(e.target.value) || 0, 0),
                                  answer.maxPoints
                                ),
                              },
                            }))
                          }
                          className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-bold tabular-nums focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none transition-shadow"
                        />
                        <div className="flex gap-1 mt-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              setAwards(prev => ({
                                ...prev,
                                [answer.questionId]: { ...draft, points: answer.maxPoints },
                              }))
                            }
                            className="flex-1 px-2 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded transition-colors"
                          >
                            Full
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setAwards(prev => ({
                                ...prev,
                                [answer.questionId]: { ...draft, points: 0 },
                              }))
                            }
                            className="flex-1 px-2 py-1 text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                          >
                            Zero
                          </button>
                        </div>
                      </div>
                    </div>

                    <input
                      type="text"
                      value={draft.feedback}
                      onChange={e =>
                        setAwards(prev => ({
                          ...prev,
                          [answer.questionId]: { ...draft, feedback: e.target.value },
                        }))
                      }
                      placeholder="Remark on this answer (optional)"
                      className="mt-3 w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none transition-shadow"
                    />
                  </div>
                )
              })}
            </div>
          )}

          {/* Auto-graded breakdown */}
          {autoAnswers.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-3">
                Auto-Graded Questions
              </h3>
              <ul className="space-y-2">
                {autoAnswers.map(answer => {
                  const question = questionById.get(answer.questionId)
                  const chosen = question?.options.find(o => o.id === answer.selectedOptionId)
                  const correct = question?.options.find(o => o.id === question.correctOptionId)

                  return (
                    <li
                      key={answer.questionId}
                      className="flex items-start gap-3 py-2 border-b border-slate-100 last:border-0"
                    >
                      {answer.isCorrect ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-slate-700 truncate">
                          {question?.prompt ?? "Question"}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Answered:{" "}
                          <span
                            className={answer.isCorrect ? "text-emerald-600" : "text-red-600"}
                          >
                            {chosen?.text ?? "— skipped —"}
                          </span>
                          {!answer.isCorrect && correct && (
                            <>
                              {" · "}Correct:{" "}
                              <span className="text-emerald-600">{correct.text}</span>
                            </>
                          )}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-slate-700 tabular-nums shrink-0">
                        {answer.pointsAwarded}/{answer.maxPoints}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          {/* Overall feedback */}
          <div>
            <label
              htmlFor="overall-feedback"
              className="block text-sm font-bold text-slate-900 uppercase tracking-wide mb-2"
            >
              Feedback to Student
            </label>
            <textarea
              id="overall-feedback"
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
              rows={4}
              placeholder="Strong grasp of the core concepts — tighten the argument in question 3 and revisit the worked example from Tuesday's class."
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none transition-shadow"
            />
            <p className="text-xs text-slate-500 mt-1.5">
              The student sees this in their gradebook once you release the grade.
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 px-3.5 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="shrink-0 bg-white border-t border-slate-200 px-6 py-4 flex items-center justify-between gap-3">
          <div className="text-sm text-slate-600">
            Releasing sends{" "}
            <span className="font-bold text-slate-900 tabular-nums">
              {runningScore}/{submission.maxScore}
            </span>{" "}
            and notifies the student.
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void save(false)}
              disabled={saving !== null}
              className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-60"
            >
              {saving === "draft" ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </span>
              ) : (
                "Save Draft"
              )}
            </button>

            <button
              type="button"
              onClick={() => void save(true)}
              disabled={saving !== null}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
            >
              {saving === "release" ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Releasing...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Release Grade
                </>
              )}
            </button>
          </div>
        </footer>
      </aside>
    </div>
  )
}
