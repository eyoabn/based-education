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
  selectedOptionId?: string | null
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
      seeded[answer.questionId] = {
        points: answer.pointsAwarded,
        feedback: answer.feedback ?? "",
        selectedOptionId: answer.selectedOptionId ?? null,
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

  const autoTotal = useMemo(
    () =>
      round2(
        autoAnswers.reduce(
          (sum, a) => sum + (Number(awards[a.questionId]?.points) ?? a.pointsAwarded ?? 0),
          0
        )
      ),
    [autoAnswers, awards]
  )

  const manualTotal = useMemo(
    () =>
      round2(
        manualAnswers.reduce(
          (sum, a) => sum + (Number(awards[a.questionId]?.points) ?? a.pointsAwarded ?? 0),
          0
        )
      ),
    [manualAnswers, awards]
  )

  if (!submission) return null

  const runningScore = round2(autoTotal + manualTotal)
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
              {
                points: draft.points,
                feedback: draft.feedback,
                selectedOptionId: draft.selectedOptionId,
              },
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
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        onClick={onClose}
        aria-hidden
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="grade-drawer-title"
        className="relative w-full max-w-2xl bg-[#0c0c0b] border-l border-white/[0.08] shadow-2xl flex flex-col animate-slide-in-right z-10"
      >
        {/* Header */}
        <header className="shrink-0 bg-[#111110] border-b border-white/[0.08] px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-full bg-[rgba(212,175,55,0.1)] border-2 border-[rgba(212,175,55,0.3)] overflow-hidden shrink-0">
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
                <h2 id="grade-drawer-title" className="font-bold text-[#f7f3e8] truncate">
                  {submission.studentName}
                </h2>
                <p className="text-xs text-[#9d9b95] flex items-center gap-1 truncate">
                  <Mail className="w-3 h-3 shrink-0" />
                  {submission.studentEmail}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              aria-label="Close"
              className="p-1.5 rounded-xl text-[#9d9b95] hover:text-[#f7f3e8] hover:bg-white/[0.06] transition-colors shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className="text-sm font-semibold text-[#f7f3e8]">{submission.examTitle}</span>
            {submission.courseTitle && (
              <span className="text-xs text-[#9d9b95]">· {submission.courseTitle}</span>
            )}
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ring-1 ring-inset ${STATUS_STYLE[submission.status]}`}
            >
              {STATUS_LABEL[submission.status]}
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-[#9d9b95]">
              <Clock className="w-3 h-3" />
              {formatWhen(submission.submittedAt)}
            </span>
          </div>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Score panel */}
          <div className="bg-[#111110] rounded-2xl border border-white/[0.08] shadow-lg p-5">
            <div className="flex items-end justify-between gap-4 mb-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-[#9d9b95] mb-1">
                  Running Score
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-[#f7f3e8] tabular-nums">
                    {runningScore}
                  </span>
                  <span className="text-lg text-[#9d9b95] tabular-nums">
                    / {submission.maxScore}
                  </span>
                  <span
                    className={`text-sm font-bold ${willPass ? "text-[#d4af37]" : "text-rose-400"}`}
                  >
                    {pct}%
                  </span>
                </div>
              </div>

              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ring-1 ring-inset ${
                  willPass
                    ? "bg-[rgba(212,175,55,0.12)] text-[#f5d77f] ring-[rgba(212,175,55,0.3)]"
                    : "bg-rose-500/10 text-rose-400 ring-rose-500/20"
                }`}
              >
                {willPass ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#d4af37]" />
                ) : (
                  <XCircle className="w-3.5 h-3.5" />
                )}
                {willPass ? "Passing" : "Below pass mark"} ({submission.passingPct}%)
              </span>
            </div>

            <div className="h-2 rounded-full bg-[#181817] overflow-hidden mb-4 border border-white/[0.04]">
              <div
                className={`h-full rounded-full transition-all ${willPass ? "bg-gradient-to-r from-[#d4af37] to-[#b38f2a]" : "bg-rose-500"}`}
                style={{ width: `${Math.min(100, pct)}%` }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 px-3 py-2 bg-[#181817] border border-white/[0.06] rounded-xl">
                <Sparkles className="w-4 h-4 text-[#d4af37] shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs text-[#d4af37] font-semibold">Auto-graded</div>
                  <div className="text-[#f7f3e8] tabular-nums text-xs">
                    {submission.autoScore} pts · {correctCount}/{autoAnswers.length} correct
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-[#181817] border border-white/[0.06] rounded-xl">
                <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs text-amber-300 font-semibold">Your award</div>
                  <div className="text-[#f7f3e8] tabular-nums text-xs">
                    {manualTotal} pts · {manualAnswers.length} essay
                    {manualAnswers.length === 1 ? "" : "s"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Integrity log */}
          <div
            className={`rounded-2xl border p-4 ${
              risk === "HIGH" ? "bg-rose-950/20 border-rose-500/30" : "bg-[#111110] border-white/[0.08]"
            }`}
          >
            <div className="flex items-center justify-between gap-3 mb-2">
              <h3 className="text-sm font-bold text-[#f7f3e8] flex items-center gap-2">
                <ShieldAlert
                  className={`w-4 h-4 ${risk === "HIGH" ? "text-rose-400" : "text-[#9d9b95]"}`}
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

            <p className="text-sm text-[#9d9b95]">
              <span className="font-bold text-[#f7f3e8] tabular-nums">{submission.tabSwitches}</span> tab switch
              {submission.tabSwitches === 1 ? "" : "es"} logged, allowance{" "}
              {submission.maxTabSwitches}.
            </p>

            {submission.violations.length > 0 && (
              <ul className="mt-3 space-y-1.5 max-h-44 overflow-y-auto">
                {submission.violations.map((violation, i) => (
                  <li
                    key={`${violation.at}-${i}`}
                    className="flex items-start gap-2 text-xs text-[#9d9b95]"
                  >
                    <span className="font-mono text-white/40 shrink-0 tabular-nums">
                      {new Date(violation.at).toLocaleTimeString(undefined, {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </span>
                    <span className="min-w-0 text-[#f7f3e8]">
                      {VIOLATION_LABEL[violation.type]}
                      {violation.detail && (
                        <span className="text-[#9d9b95]"> — {violation.detail}</span>
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
              <h3 className="text-xs font-bold text-[#f7f3e8] uppercase tracking-wider">
                Written Responses
              </h3>

              {manualAnswers.map(answer => {
                const question = questionById.get(answer.questionId)
                const draft = awards[answer.questionId] ?? { points: 0, feedback: "" }

                return (
                  <div
                    key={answer.questionId}
                    className="bg-[#111110] rounded-2xl border border-white/[0.08] shadow-lg p-4 space-y-3"
                  >
                    <p className="text-sm font-semibold text-[#f7f3e8]">
                      {question?.prompt ?? "Question"}
                    </p>

                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4">
                      {/* Student's answer */}
                      <div className="bg-[#181817] border border-white/[0.06] rounded-xl p-3.5 min-h-[96px]">
                        {answer.text ? (
                          <p className="text-sm text-[#f7f3e8] whitespace-pre-wrap leading-relaxed">
                            {answer.text}
                          </p>
                        ) : (
                          <p className="text-sm text-[#9d9b95] italic">No answer submitted.</p>
                        )}
                      </div>

                      {/* Scoring box */}
                      <div className="lg:w-36 shrink-0">
                        <label
                          htmlFor={`award-${answer.questionId}`}
                          className="block text-xs font-semibold text-[#9d9b95] mb-1.5"
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
                          className="w-full px-3 py-2 bg-[#181817] border border-white/[0.08] rounded-xl text-sm font-bold text-[#f7f3e8] tabular-nums focus:ring-1 focus:ring-[#d4af37]/40 focus:border-[#d4af37] focus:outline-none transition-all"
                        />
                        <div className="flex gap-1.5 mt-2">
                          <button
                            type="button"
                            onClick={() =>
                              setAwards(prev => ({
                                ...prev,
                                [answer.questionId]: { ...draft, points: answer.maxPoints },
                              }))
                            }
                            className="flex-1 px-2 py-1 text-[11px] font-bold text-[#f5d77f] bg-[rgba(212,175,55,0.12)] border border-[rgba(212,175,55,0.25)] hover:bg-[rgba(212,175,55,0.2)] rounded-lg transition-colors"
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
                            className="flex-1 px-2 py-1 text-[11px] font-semibold text-[#9d9b95] bg-white/[0.06] hover:bg-white/[0.1] rounded-lg transition-colors"
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
                      className="w-full px-3.5 py-2.5 bg-[#181817] border border-white/[0.08] rounded-xl text-sm text-[#f7f3e8] placeholder-[#9d9b95]/50 focus:ring-1 focus:ring-[#d4af37]/40 focus:border-[#d4af37] focus:outline-none transition-all"
                    />
                  </div>
                )
              })}
            </div>
          )}

          {/* Auto-graded breakdown */}
          {autoAnswers.length > 0 && (
            <div className="bg-[#111110] rounded-2xl border border-white/[0.08] shadow-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-[#f7f3e8] uppercase tracking-wider">
                  Auto-Graded Questions (MCQ & True/False)
                </h3>
                <span className="text-xs text-[#9d9b95]">
                  Override options below
                </span>
              </div>
              <ul className="space-y-3">
                {autoAnswers.map(answer => {
                  const question = questionById.get(answer.questionId)
                  const correct = question?.options.find(o => o.id === question.correctOptionId)
                  const activeOptId =
                    awards[answer.questionId]?.selectedOptionId !== undefined
                      ? awards[answer.questionId].selectedOptionId
                      : answer.selectedOptionId
                  const isCurrentCorrect = question ? activeOptId === question.correctOptionId : answer.isCorrect
                  const currentAward = awards[answer.questionId]?.points ?? answer.pointsAwarded
                  const isOverridden = activeOptId !== answer.selectedOptionId

                  return (
                    <li
                      key={answer.questionId}
                      className="p-3.5 bg-[#181817] border border-white/[0.06] rounded-xl space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5 min-w-0 flex-1">
                          {isCurrentCorrect ? (
                            <CheckCircle2 className="w-4 h-4 text-[#d4af37] shrink-0 mt-0.5" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#f7f3e8]">
                              {question?.prompt ?? "Question"}
                            </p>
                            <span className="text-[11px] text-[#9d9b95] font-medium">
                              Type: {question?.type === "TRUE_FALSE" ? "True / False" : "Multiple Choice"}
                            </span>
                          </div>
                        </div>

                        {/* Point override */}
                        <div className="flex items-center gap-1.5 shrink-0 bg-[#111110] border border-white/[0.08] px-2.5 py-1 rounded-lg">
                          <label htmlFor={`override-pts-${answer.questionId}`} className="text-[11px] font-semibold text-[#9d9b95]">
                            Pts:
                          </label>
                          <input
                            id={`override-pts-${answer.questionId}`}
                            type="number"
                            min={0}
                            max={answer.maxPoints}
                            step={0.5}
                            value={currentAward}
                            onChange={e =>
                              setAwards(prev => ({
                                ...prev,
                                [answer.questionId]: {
                                  points: Math.min(
                                    Math.max(Number(e.target.value) || 0, 0),
                                    answer.maxPoints
                                  ),
                                  feedback: prev[answer.questionId]?.feedback ?? "",
                                  selectedOptionId: activeOptId,
                                },
                              }))
                            }
                            className="w-12 px-1 py-0.5 text-xs font-bold text-[#f7f3e8] tabular-nums text-center bg-transparent focus:outline-none"
                          />
                          <span className="text-xs text-[#9d9b95] font-medium">/{answer.maxPoints}</span>
                        </div>
                      </div>

                      {/* Teacher editable student answer choice */}
                      <div className="pt-2 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold text-[#9d9b95]">Student Choice:</span>
                          <select
                            value={activeOptId ?? ""}
                            onChange={e => {
                              const newOptId = e.target.value || null
                              const isNowCorrect = question ? newOptId === question.correctOptionId : false
                              const newPoints = isNowCorrect ? answer.maxPoints : 0
                              setAwards(prev => ({
                                ...prev,
                                [answer.questionId]: {
                                  points: newPoints,
                                  feedback: prev[answer.questionId]?.feedback ?? "",
                                  selectedOptionId: newOptId,
                                },
                              }))
                            }}
                            className="px-2.5 py-1 text-xs font-medium bg-[#111110] border border-white/[0.08] rounded-lg text-[#f7f3e8] focus:border-[#d4af37] focus:outline-none cursor-pointer"
                          >
                            <option value="">— No Answer Selected —</option>
                            {question?.options.map(opt => (
                              <option key={opt.id} value={opt.id}>
                                {opt.text} {opt.id === question.correctOptionId ? "✓ (Correct Key)" : ""}
                              </option>
                            ))}
                          </select>

                          {isOverridden && (
                            <span className="text-[10px] font-bold text-[#f5d77f] bg-[rgba(212,175,55,0.12)] px-2 py-0.5 rounded-full border border-[rgba(212,175,55,0.25)]">
                              Modified by teacher
                            </span>
                          )}
                        </div>

                        {correct && (
                          <span className="text-xs text-[#9d9b95]">
                            Key: <span className="font-semibold text-[#d4af37]">{correct.text}</span>
                          </span>
                        )}
                      </div>
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
              className="block text-xs font-bold text-[#f7f3e8] uppercase tracking-wider mb-2"
            >
              Feedback to Student
            </label>
            <textarea
              id="overall-feedback"
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
              rows={4}
              placeholder="Strong grasp of core concepts — tighten the argument in question 3 and revisit the worked example..."
              className="w-full px-3.5 py-2.5 bg-[#181817] border border-white/[0.08] rounded-xl text-sm text-[#f7f3e8] placeholder-[#9d9b95]/50 resize-none focus:ring-1 focus:ring-[#d4af37]/40 focus:border-[#d4af37] focus:outline-none transition-all"
            />
            <p className="text-xs text-[#9d9b95] mt-1.5">
              The student sees this remark in their gradebook upon release.
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 px-3.5 py-2.5 bg-rose-950/30 border border-rose-500/30 rounded-xl text-sm text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="shrink-0 bg-[#111110] border-t border-white/[0.08] px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-[#9d9b95]">
            {submission.status === "GRADED" ? (
              <>
                Saving updates final score to{" "}
                <span className="font-bold text-[#f7f3e8] tabular-nums">
                  {runningScore}/{submission.maxScore}
                </span>
              </>
            ) : (
              <>
                Releasing sends{" "}
                <span className="font-bold text-[#f7f3e8] tabular-nums">
                  {runningScore}/{submission.maxScore}
                </span>{" "}
                to student gradebook.
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void save(false)}
              disabled={saving !== null}
              className="px-4 py-2.5 text-xs font-semibold text-[#9d9b95] hover:text-[#f7f3e8] hover:bg-white/[0.06] rounded-xl transition-colors disabled:opacity-50 min-h-[40px]"
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
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#d4af37] to-[#b38f2a] hover:brightness-110 text-black text-xs font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[rgba(212,175,55,0.15)] min-h-[40px]"
            >
              {saving === "release" ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                  {submission.status === "GRADED" ? "Updating..." : "Releasing..."}
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  {submission.status === "GRADED" ? "Update Grade" : "Release Grade"}
                </>
              )}
            </button>
          </div>
        </footer>
      </aside>
    </div>
  )
}
