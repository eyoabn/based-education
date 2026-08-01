"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Copy,
  Eye,
  FileText,
  Loader2,
  Lock,
  Maximize,
  MonitorX,
  Send,
  ShieldCheck,
  Target,
  Timer,
} from "lucide-react"
import AntiCheatGuard from "@/components/exams/AntiCheatGuard"
import ExamTimer from "@/components/exams/ExamTimer"
import {
  countsAgainstBudget,
  formatWhen,
  QUESTION_TYPE_LABEL,
  type ExamDetail,
  type SafeQuestion,
  type StudentResponse,
  type ViolationEvent,
} from "@/lib/exams"

type Stage = "loading" | "instructions" | "active" | "submitted" | "error"

interface SubmitReceipt {
  answeredCount: number
  questionCount: number
  pendingManualCount: number
  tabSwitches: number
  isFlagged: boolean
  isLate: boolean
  submittedAt: string
}

/** Answers survive an accidental reload; the server clock keeps running regardless. */
const draftKey = (examId: string) => `educonnect:exam-draft:${examId}`

export default function SecureExamPage() {
  const params = useParams<{ examId: string }>()
  const examId = params.examId
  const router = useRouter()

  const [exam, setExam] = useState<ExamDetail | null>(null)
  const [stage, setStage] = useState<Stage>("loading")
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)

  const [responses, setResponses] = useState<Record<string, StudentResponse>>({})
  const [violations, setViolations] = useState<ViolationEvent[]>([])
  const [current, setCurrent] = useState(0)

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [receipt, setReceipt] = useState<SubmitReceipt | null>(null)
  const [autoSubmitted, setAutoSubmitted] = useState(false)

  // Guards against a double-submit race between the timer and the button.
  const submitLock = useRef(false)
  const responsesRef = useRef(responses)
  const violationsRef = useRef(violations)

  useEffect(() => {
    responsesRef.current = responses
  }, [responses])
  useEffect(() => {
    violationsRef.current = violations
  }, [violations])

  const questions: SafeQuestion[] = useMemo(() => exam?.questions ?? [], [exam])
  const tabSwitches = useMemo(
    () => violations.filter(v => countsAgainstBudget(v.type)).length,
    [violations]
  )

  // --- Load -----------------------------------------------------------------

  const loadExam = useCallback(async () => {
    try {
      const res = await fetch(`/api/exams/${examId}`)
      const data = await res.json()

      if (data.error) {
        setError(data.error)
        setStage("error")
        return null
      }

      const detail = data.exam as ExamDetail
      setExam(detail)

      if (!detail.attempt) setStage("instructions")
      else if (detail.attempt.status === "IN_PROGRESS") setStage("active")
      else setStage("submitted")

      return detail
    } catch {
      setError("Could not load this assessment.")
      setStage("error")
      return null
    }
  }, [examId])

  useEffect(() => {
    void loadExam()
  }, [loadExam])

  // Restore any draft once we know we're mid-attempt.
  useEffect(() => {
    if (stage !== "active" || typeof window === "undefined") return
    const raw = window.sessionStorage.getItem(draftKey(examId))
    if (!raw) return
    try {
      const saved = JSON.parse(raw) as Record<string, StudentResponse>
      setResponses(prev => (Object.keys(prev).length > 0 ? prev : saved))
    } catch {
      window.sessionStorage.removeItem(draftKey(examId))
    }
  }, [stage, examId])

  useEffect(() => {
    if (stage !== "active" || typeof window === "undefined") return
    window.sessionStorage.setItem(draftKey(examId), JSON.stringify(responses))
  }, [responses, stage, examId])

  // --- Anti-cheat -----------------------------------------------------------

  const handleViolation = useCallback((event: ViolationEvent) => {
    setViolations(prev => [...prev, event])
  }, [])

  // --- Start ----------------------------------------------------------------

  const handleStart = async () => {
    if (!exam || starting) return
    setStarting(true)
    setError(null)

    // Fullscreen must be requested inside the click handler — browsers reject
    // it from an async continuation, so it happens before the network call.
    if (exam.config.forceFullscreen) {
      try {
        await document.documentElement.requestFullscreen()
      } catch {
        // Denied or unsupported. The attempt still runs; the guard logs the
        // fact that the student never entered full-screen.
      }
    }

    try {
      const res = await fetch(`/api/exams/${examId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      })
      const data = await res.json()

      if (data.error) {
        setError(data.error)
        setStarting(false)
        return
      }

      // Refetch: the paper itself is only released once the attempt is open.
      await loadExam()
      setCurrent(0)
    } catch {
      setError("Could not start the assessment. Check your connection and try again.")
    } finally {
      setStarting(false)
    }
  }

  // --- Submit ---------------------------------------------------------------

  const submitExam = useCallback(
    async (auto: boolean) => {
      if (submitLock.current) return
      submitLock.current = true
      setSubmitting(true)
      setAutoSubmitted(auto)

      const payloadResponses = Object.values(responsesRef.current)
      const payloadViolations = violationsRef.current

      try {
        const res = await fetch(`/api/exams/${examId}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            responses: payloadResponses,
            violations: payloadViolations,
            tabSwitches: payloadViolations.filter(v => countsAgainstBudget(v.type)).length,
          }),
        })
        const data = await res.json()

        if (data.error) {
          setError(data.error)
          submitLock.current = false
          setSubmitting(false)
          return
        }

        if (typeof window !== "undefined") {
          window.sessionStorage.removeItem(draftKey(examId))
        }
        if (document.fullscreenElement) {
          await document.exitFullscreen().catch(() => {})
        }

        setReceipt(data as SubmitReceipt)
        setConfirmOpen(false)
        setStage("submitted")
      } catch {
        setError("Submission failed. Do not close this tab — try again.")
        submitLock.current = false
      } finally {
        setSubmitting(false)
      }
    },
    [examId]
  )

  const handleExpire = useCallback(() => {
    void submitExam(true)
  }, [submitExam])

  // --- Answer helpers -------------------------------------------------------

  const setChoice = (questionId: string, optionId: string) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: { questionId, selectedOptionId: optionId, text: prev[questionId]?.text ?? null },
    }))
  }

  const setText = (questionId: string, text: string) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: {
        questionId,
        selectedOptionId: prev[questionId]?.selectedOptionId ?? null,
        text,
      },
    }))
  }

  const isAnswered = (question: SafeQuestion) => {
    const answer = responses[question.id]
    if (!answer) return false
    return question.type === "ESSAY"
      ? !!answer.text && answer.text.trim().length > 0
      : !!answer.selectedOptionId
  }

  const answeredCount = questions.filter(isAnswered).length

  // ==========================================================================
  // Renders
  // ==========================================================================

  if (stage === "loading") {
    return (
      <div className="max-w-3xl mx-auto py-20 flex flex-col items-center gap-3 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin" />
        <p className="text-sm font-medium">Verifying your access…</p>
      </div>
    )
  }

  if (stage === "error" || !exam) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center">
        <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
          <MonitorX className="w-7 h-7 text-red-500" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">This paper is not open to you</h1>
        <p className="text-sm text-slate-500 mt-2">{error ?? "Assessment not found."}</p>
        <Link
          href="/dashboard/student/exams"
          className="inline-flex items-center gap-2 mt-6 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to my assessments
        </Link>
      </div>
    )
  }

  // --- Post-submission ------------------------------------------------------

  if (stage === "submitted") {
    const attempt = exam.attempt
    const flagged = receipt?.isFlagged ?? false

    return (
      <div className="max-w-2xl mx-auto py-12">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          </div>

          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {autoSubmitted ? "Time expired — paper submitted" : "Your paper is in"}
          </h1>
          <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
            {autoSubmitted
              ? "The clock reached zero, so your answers were submitted automatically."
              : `"${exam.title}" has been handed to ${exam.teacherName ?? "your teacher"}.`}
          </p>

          {receipt && (
            <div className="grid grid-cols-3 gap-3 mt-7 mb-6">
              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="text-xl font-bold text-slate-900 tabular-nums">
                  {receipt.answeredCount}/{receipt.questionCount}
                </div>
                <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mt-1">
                  Answered
                </div>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="text-xl font-bold text-slate-900 tabular-nums">
                  {receipt.pendingManualCount}
                </div>
                <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mt-1">
                  Awaiting Review
                </div>
              </div>
              <div className={`p-4 rounded-xl ${flagged ? "bg-red-50" : "bg-slate-50"}`}>
                <div
                  className={`text-xl font-bold tabular-nums ${flagged ? "text-red-600" : "text-slate-900"}`}
                >
                  {receipt.tabSwitches}
                </div>
                <div
                  className={`text-[10px] font-bold uppercase tracking-wide mt-1 ${flagged ? "text-red-500" : "text-slate-500"}`}
                >
                  Tab Switches
                </div>
              </div>
            </div>
          )}

          {flagged && (
            <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-left text-sm text-red-700 mb-6">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                This attempt was flagged for review. Your teacher will see the integrity log
                alongside your answers.
              </span>
            </div>
          )}

          <div className="p-4 bg-slate-50 rounded-xl text-sm text-slate-600 mb-6">
            <span className="font-semibold text-slate-700">What happens next:</span> your multiple
            choice answers were graded instantly, and any written answers go to your teacher. Your
            result appears in the gradebook once it is released.
            {attempt?.submittedAt && (
              <span className="block text-xs text-slate-400 mt-2">
                Submitted {formatWhen(receipt?.submittedAt ?? attempt.submittedAt)}
              </span>
            )}
          </div>

          <div className="flex items-center justify-center gap-3">
            <Link
              href="/dashboard/student/exams"
              className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-semibold rounded-lg transition-colors"
            >
              My assessments
            </Link>
            <button
              onClick={() => router.push("/dashboard/student/gradebook")}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Open gradebook
            </button>
          </div>
        </div>
      </div>
    )
  }

  // --- Pre-exam instructions ------------------------------------------------

  if (stage === "instructions") {
    const rules = [
      {
        icon: Timer,
        title: `You have ${exam.durationMins} minutes`,
        body: "The clock starts the moment you press begin and keeps running even if you close this tab. At 00:00 your paper is submitted automatically.",
      },
      exam.config.forceFullscreen && {
        icon: Maximize,
        title: "Full-screen is required",
        body: "Your browser will go full-screen. Leaving full-screen is logged and flagged to your teacher.",
      },
      exam.config.trackTabSwitches && {
        icon: Eye,
        title: `Tab switches are counted (limit ${exam.config.maxTabSwitches})`,
        body: "Once started, switching tabs or leaving full-screen will be logged and flagged to your teacher.",
      },
      exam.config.blockCopyPaste && {
        icon: Copy,
        title: "Copy, paste and right-click are disabled",
        body: "Text selection outside the answer boxes, the context menu and developer shortcuts are blocked for the duration.",
      },
      exam.config.randomizeOrder && {
        icon: FileText,
        title: "Your question order is unique",
        body: "Questions and choices are shuffled for you specifically, so comparing with a classmate will not help.",
      },
    ].filter(Boolean) as { icon: typeof Timer; title: string; body: string }[]

    return (
      <div className="max-w-3xl mx-auto py-8 space-y-6">
        <Link
          href="/dashboard/student/exams"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>

        {/* Paper header */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-900 px-7 py-6 text-white">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 text-[11px] font-bold uppercase tracking-wide ring-1 ring-inset ring-emerald-400/30">
                <ShieldCheck className="w-3 h-3" />
                Secure Guard
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                {exam.type === "EXAM" ? "Exam" : "Assignment"}
              </span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight">{exam.title}</h1>
            {exam.description && (
              <p className="text-sm text-slate-300 mt-2 leading-relaxed">{exam.description}</p>
            )}
            <p className="text-xs text-slate-400 mt-3">
              {exam.courseTitle ?? "General"}
              {exam.teacherName ? ` · ${exam.teacherName}` : ""}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-slate-100 border-b border-slate-100">
            {[
              { label: "Questions", value: String(exam.questions.length || "—") },
              { label: "Duration", value: `${exam.durationMins} min` },
              { label: "Total Points", value: String(exam.totalPoints) },
              { label: "Pass Mark", value: `${exam.passingPct}%` },
            ].map(stat => (
              <div key={stat.label} className="px-5 py-4">
                <div className="text-lg font-bold text-slate-900 tabular-nums">{stat.value}</div>
                <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mt-0.5">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          {/* Rules */}
          <div className="p-7">
            <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500 mb-4">
              <Lock className="w-4 h-4" />
              Before you begin
            </h2>

            <div className="space-y-3">
              {rules.map(rule => (
                <div
                  key={rule.title}
                  className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100"
                >
                  <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
                    <rule.icon className="w-4 h-4 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{rule.title}</p>
                    <p className="text-sm text-slate-500 mt-0.5 leading-relaxed">{rule.body}</p>
                  </div>
                </div>
              ))}
            </div>

            {exam.dueAt && (
              <p className="flex items-center gap-1.5 text-xs text-slate-500 mt-4">
                <Target className="w-3.5 h-3.5" />
                Due {formatWhen(exam.dueAt)}
              </p>
            )}

            {error && (
              <div className="flex items-center gap-2 mt-5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <button
              onClick={() => void handleStart()}
              disabled={starting}
              className="w-full mt-6 inline-flex items-center justify-center gap-2 px-5 py-4 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors"
            >
              {starting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Securing your session…
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5" />
                  Start Exam Now
                </>
              )}
            </button>
            <p className="text-center text-xs text-slate-400 mt-3">
              You get one attempt. The timer cannot be paused.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // --- Locked exam surface --------------------------------------------------

  const question = questions[current]
  const overBudget = exam.config.trackTabSwitches && tabSwitches > exam.config.maxTabSwitches

  return (
    <div className="fixed inset-0 z-40 bg-slate-100 overflow-y-auto select-none">
      <AntiCheatGuard
        config={exam.config}
        active={stage === "active" && !submitting}
        onViolation={handleViolation}
        tabSwitches={tabSwitches}
      />

      {/* Locked header */}
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-5 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold ring-1 ring-inset ring-emerald-600/20 whitespace-nowrap">
              <Lock className="w-3.5 h-3.5" />
              Secure Guard Active
            </span>
            <div className="min-w-0 hidden sm:block">
              <p className="font-bold text-slate-900 text-sm truncate">{exam.title}</p>
              <p className="text-xs text-slate-400 truncate">{exam.courseTitle ?? "General"}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {exam.config.trackTabSwitches && (
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ring-1 ring-inset whitespace-nowrap ${
                  overBudget
                    ? "bg-red-50 text-red-700 ring-red-600/20"
                    : tabSwitches > 0
                      ? "bg-amber-50 text-amber-700 ring-amber-600/20"
                      : "bg-slate-50 text-slate-500 ring-slate-500/20"
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                Tab Switches Logged: {tabSwitches}
                <span className="opacity-60">/ {exam.config.maxTabSwitches}</span>
              </span>
            )}

            {exam.deadline && (
              <ExamTimer
                deadline={exam.deadline}
                durationMins={exam.durationMins}
                onExpire={handleExpire}
                paused={submitting || stage !== "active"}
              />
            )}
          </div>
        </div>

        {/* Progress rail */}
        <div className="h-1 bg-slate-100">
          <div
            className="h-full bg-slate-900 transition-[width] duration-300"
            style={{ width: `${questions.length ? (answeredCount / questions.length) * 100 : 0}%` }}
          />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-6 grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-6">
        {/* Question surface */}
        <div className="space-y-5">
          {overBudget && (
            <div className="flex items-start gap-2 px-4 py-3 bg-red-600 text-white rounded-xl text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                You have exceeded the tab-switch allowance for this paper. This attempt is now
                flagged for your teacher, but you may finish it.
              </span>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {!question ? (
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-500">
              This paper has no questions.
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-slate-900 text-white text-sm font-bold flex items-center justify-center tabular-nums">
                    {current + 1}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    {QUESTION_TYPE_LABEL[question.type]}
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-xs font-bold tabular-nums whitespace-nowrap">
                  {question.points} {question.points === 1 ? "pt" : "pts"}
                </span>
              </div>

              <p className="text-lg text-slate-900 font-medium leading-relaxed whitespace-pre-wrap mb-6">
                {question.prompt}
              </p>

              {question.type === "ESSAY" ? (
                <div>
                  <textarea
                    data-exam-input
                    value={responses[question.id]?.text ?? ""}
                    onChange={e => setText(question.id, e.target.value)}
                    rows={10}
                    maxLength={20_000}
                    placeholder="Type your answer here…"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none resize-y select-text"
                  />
                  <p className="text-xs text-slate-400 mt-2 text-right tabular-nums">
                    {(responses[question.id]?.text ?? "").length} / 20000 characters
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {question.options.map((option, index) => {
                    const checked = responses[question.id]?.selectedOptionId === option.id
                    return (
                      <label
                        key={option.id}
                        className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                          checked
                            ? "border-slate-900 bg-slate-50"
                            : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="radio"
                          name={question.id}
                          value={option.id}
                          checked={checked}
                          onChange={() => setChoice(question.id, option.id)}
                          className="sr-only"
                        />
                        <span
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                            checked
                              ? "border-slate-900 bg-slate-900 text-white"
                              : "border-slate-300 text-slate-400"
                          }`}
                        >
                          {String.fromCharCode(65 + index)}
                        </span>
                        <span className="text-sm text-slate-800">{option.text}</span>
                      </label>
                    )
                  })}
                </div>
              )}

              {/* Pager */}
              <div className="flex items-center justify-between gap-3 mt-7 pt-5 border-t border-slate-100">
                <button
                  onClick={() => setCurrent(i => Math.max(0, i - 1))}
                  disabled={current === 0}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 text-sm font-semibold rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Previous
                </button>

                {current === questions.length - 1 ? (
                  <button
                    onClick={() => setConfirmOpen(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg transition-colors"
                  >
                    <Send className="w-4 h-4" />
                    Submit Paper
                  </button>
                ) : (
                  <button
                    onClick={() => setCurrent(i => Math.min(questions.length - 1, i + 1))}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg transition-colors"
                  >
                    Next
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Navigator */}
        <aside className="lg:sticky lg:top-24 self-start space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Navigator
              </h2>
              <span className="text-xs font-bold text-slate-700 tabular-nums">
                {answeredCount}/{questions.length}
              </span>
            </div>

            <div className="grid grid-cols-6 lg:grid-cols-5 gap-1.5">
              {questions.map((q, index) => {
                const done = isAnswered(q)
                const active = index === current
                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrent(index)}
                    title={`Question ${index + 1}${done ? " — answered" : ""}`}
                    className={`aspect-square rounded-lg text-xs font-bold tabular-nums transition-colors ${
                      active
                        ? "bg-slate-900 text-white ring-2 ring-slate-900 ring-offset-1"
                        : done
                          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                          : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                    }`}
                  >
                    {index + 1}
                  </button>
                )
              })}
            </div>

            <div className="flex items-center gap-3 mt-4 pt-3 border-t border-slate-100 text-[10px] text-slate-500">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-emerald-100 ring-1 ring-emerald-300" />
                Answered
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-slate-100 ring-1 ring-slate-300" />
                Blank
              </span>
            </div>
          </div>

          <button
            onClick={() => setConfirmOpen(true)}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-colors"
          >
            <Send className="w-4 h-4" />
            Submit Paper
          </button>

          <p className="text-[11px] text-slate-400 leading-relaxed text-center px-2">
            Your answers are kept on this device until you submit. Do not refresh unnecessarily.
          </p>
        </aside>
      </main>

      {/* Submit confirmation */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
            </div>

            <h2 className="text-lg font-bold text-slate-900 text-center">Submit this paper?</h2>
            <p className="text-sm text-slate-500 text-center mt-2">
              You cannot reopen it or change your answers afterwards.
            </p>

            <div className="grid grid-cols-2 gap-3 my-5">
              <div className="p-3 bg-slate-50 rounded-xl text-center">
                <div className="text-xl font-bold text-slate-900 tabular-nums">{answeredCount}</div>
                <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mt-0.5">
                  Answered
                </div>
              </div>
              <div
                className={`p-3 rounded-xl text-center ${
                  questions.length - answeredCount > 0 ? "bg-amber-50" : "bg-slate-50"
                }`}
              >
                <div
                  className={`text-xl font-bold tabular-nums ${
                    questions.length - answeredCount > 0 ? "text-amber-600" : "text-slate-900"
                  }`}
                >
                  {questions.length - answeredCount}
                </div>
                <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mt-0.5">
                  Left Blank
                </div>
              </div>
            </div>

            {questions.length - answeredCount > 0 && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4 text-center">
                Unanswered questions score zero.
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmOpen(false)}
                disabled={submitting}
                className="flex-1 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-slate-600 text-sm font-semibold rounded-lg transition-colors"
              >
                Keep working
              </button>
              <button
                onClick={() => void submitExam(false)}
                disabled={submitting}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-bold rounded-lg transition-colors"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Submit now
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auto-submit curtain */}
      {submitting && !confirmOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 text-white">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="font-semibold">Time is up — submitting your paper…</p>
          <p className="text-sm text-slate-400">Do not close this window.</p>
        </div>
      )}
    </div>
  )
}
