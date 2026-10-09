"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
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

    // Fullscreen is only for timed exams with fullscreen enabled
    if (exam.type !== "ASSIGNMENT" && exam.config.forceFullscreen) {
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
      <div className="max-w-3xl mx-auto py-20 flex flex-col items-center gap-3 text-[#9d9b95]">
        <Loader2 className="w-8 h-8 animate-spin text-[#d4af37]" />
        <p className="text-sm font-semibold text-[#f7f3e8]">Verifying examination security token…</p>
      </div>
    )
  }

  if (stage === "error" || !exam) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto mb-4">
          <MonitorX className="w-7 h-7 text-rose-400" />
        </div>
        <h1 className="text-xl font-bold text-[#f7f3e8]">This paper is not accessible</h1>
        <p className="text-sm text-[#9d9b95] mt-2">{error ?? "Assessment record not found or expired."}</p>
        <Link
          href="/dashboard/student/exams"
          className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 bg-[#181817] hover:border-[rgba(212,175,55,0.3)] border border-white/[0.08] text-[#f7f3e8] text-sm font-semibold rounded-xl transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Assessment Hall
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
        <div className="bg-[#111110] rounded-2xl border border-white/[0.08] shadow-2xl p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[rgba(212,175,55,0.15)] border border-[rgba(212,175,55,0.3)] flex items-center justify-center mx-auto mb-5 text-[#d4af37]">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <h1 className="text-2xl font-bold text-[#f7f3e8] tracking-tight">
            {autoSubmitted ? "Time expired — paper auto-submitted" : "Assessment Handed In"}
          </h1>
          <p className="text-sm text-[#9d9b95] mt-2 max-w-md mx-auto">
            {autoSubmitted
              ? "The exam clock reached zero; your answers were locked and filed automatically."
              : `"${exam.title}" has been securely recorded and dispatched to ${exam.teacherName ?? "faculty"}.`}
          </p>

          {receipt && (
            <div className="grid grid-cols-3 gap-3 mt-7 mb-6">
              <div className="p-4 bg-[#181817] rounded-xl border border-white/[0.06]">
                <div className="text-xl font-bold text-[#f7f3e8] tabular-nums">
                  {receipt.answeredCount}/{receipt.questionCount}
                </div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#9d9b95] mt-1">
                  Answered
                </div>
              </div>
              <div className="p-4 bg-[#181817] rounded-xl border border-white/[0.06]">
                <div className="text-xl font-bold text-[#d4af37] tabular-nums">
                  {receipt.pendingManualCount}
                </div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#9d9b95] mt-1">
                  Awaiting Review
                </div>
              </div>
              <div className={`p-4 rounded-xl border ${flagged ? "bg-rose-500/10 border-rose-500/30" : "bg-[#181817] border-white/[0.06]"}`}>
                <div
                  className={`text-xl font-bold tabular-nums ${flagged ? "text-rose-400" : "text-[#f7f3e8]"}`}
                >
                  {receipt.tabSwitches}
                </div>
                <div
                  className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${flagged ? "text-rose-300" : "text-[#9d9b95]"}`}
                >
                  Tab Switches
                </div>
              </div>
            </div>
          )}

          {flagged && (
            <div className="flex items-start gap-2 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-left text-sm text-rose-300 mb-6">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>
                Integrity alert: tab defocus limit was flagged during this session. Your instructor will review the telemetry timeline.
              </span>
            </div>
          )}

          <div className="p-4 bg-[#181817] rounded-xl border border-white/[0.06] text-sm text-[#9d9b95] mb-6 text-left leading-relaxed">
            <span className="font-bold text-[#f7f3e8]">Next Steps:</span> Objective questions were processed instantly. Written essay questions are queued for faculty marking. Once published, complete grades and breakdown appear in your Gradebook.
            {attempt?.submittedAt && (
              <span className="block text-xs text-[#9d9b95]/60 mt-2">
                Submitted {formatWhen(receipt?.submittedAt ?? attempt.submittedAt)}
              </span>
            )}
          </div>

          <div className="flex items-center justify-center gap-3">
            <Link
              href="/dashboard/student/exams"
              className="px-5 py-2.5 bg-[#181817] border border-white/[0.08] hover:border-[rgba(212,175,55,0.3)] text-[#f7f3e8] text-sm font-semibold rounded-xl transition-all"
            >
              My Assessments
            </Link>
            <button
              onClick={() => router.push("/dashboard/student/gradebook")}
              className="px-5 py-2.5 bg-gradient-to-r from-[#d4af37] to-[#e6ca65] hover:brightness-110 text-[#050505] text-sm font-bold rounded-xl transition-all shadow-lg shadow-[rgba(212,175,55,0.2)]"
            >
              Open Gradebook
            </button>
          </div>
        </div>
      </div>
    )
  }

  // --- Pre-exam instructions ------------------------------------------------

  if (stage === "instructions") {
    const isAssignment = exam.type === "ASSIGNMENT"
    const rules = isAssignment
      ? ([
          {
            icon: BookOpen,
            title: "Untimed Assignment",
            body: "Work at your own pace. There is no countdown clock, no session limit, and no auto-expiration.",
          },
          {
            icon: FileText,
            title: "Free Open Submission",
            body: "You can consult your course materials, take breaks, and review your answers freely before handing them in.",
          },
          exam.dueAt && {
            icon: Target,
            title: "Submission Deadline",
            body: `Deliver your work before ${formatWhen(exam.dueAt)} to be graded on time.`,
          },
        ].filter(Boolean) as { icon: typeof Timer; title: string; body: string }[])
      : ([
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
        ].filter(Boolean) as { icon: typeof Timer; title: string; body: string }[])

    return (
      <div className="max-w-3xl mx-auto py-8 space-y-6">
        <Link
          href="/dashboard/student/exams"
          className="inline-flex items-center gap-1.5 text-sm text-[#9d9b95] hover:text-[#f7f3e8] font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Assessments
        </Link>

        {/* Paper header */}
        <div className="bg-[#111110] rounded-2xl border border-white/[0.08] shadow-2xl overflow-hidden">
          <div className="bg-[#181817] px-7 py-6 text-white border-b border-white/[0.08]">
            <div className="flex items-center gap-2 mb-3">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border ${
                isAssignment
                  ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                  : "bg-[rgba(212,175,55,0.15)] text-[#d4af37] border-[rgba(212,175,55,0.3)]"
              }`}>
                {isAssignment ? <BookOpen className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
                {isAssignment ? "Open Assignment" : "Proctored Exam"}
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#9d9b95]">
                {isAssignment ? "Assignment" : "Formal Examination"}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#f7f3e8]">{exam.title}</h1>
            {exam.description && (
              <p className="text-sm text-[#9d9b95] mt-2 leading-relaxed">{exam.description}</p>
            )}
            <p className="text-xs text-[#9d9b95]/70 mt-3">
              {exam.courseTitle ?? "General Academic Cohort"}
              {exam.teacherName ? ` · Faculty: ${exam.teacherName}` : ""}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-white/[0.06] border-b border-white/[0.08] bg-[#141413]">
            {[
              { label: "Questions", value: String(exam.questions.length || "—") },
              {
                label: isAssignment ? "Time Limit" : "Duration",
                value: isAssignment ? "Untimed (Open)" : `${exam.durationMins} min`,
              },
              { label: "Total Points", value: String(exam.totalPoints) },
              { label: "Passing Score", value: `${exam.passingPct}%` },
            ].map(stat => (
              <div key={stat.label} className="px-5 py-4">
                <div className="text-lg font-bold text-[#f7f3e8] tabular-nums">{stat.value}</div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#9d9b95] mt-0.5">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          {/* Rules */}
          <div className="p-7">
            <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#d4af37] mb-4">
              {isAssignment ? <BookOpen className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              {isAssignment ? "Assignment Guidelines" : "Before you begin"}
            </h2>

            <div className="space-y-3">
              {rules.map(rule => (
                <div
                  key={rule.title}
                  className="flex items-start gap-3 p-4 bg-[#181817] rounded-xl border border-white/[0.06]"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#141413] border border-white/[0.08] flex items-center justify-center shrink-0 text-[#d4af37]">
                    <rule.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#f7f3e8]">{rule.title}</p>
                    <p className="text-xs sm:text-sm text-[#9d9b95] mt-0.5 leading-relaxed">{rule.body}</p>
                  </div>
                </div>
              ))}
            </div>

            {exam.dueAt && (
              <p className="flex items-center gap-1.5 text-xs text-[#9d9b95] mt-4">
                <Target className="w-3.5 h-3.5 text-[#d4af37]" />
                Final submission deadline: {formatWhen(exam.dueAt)}
              </p>
            )}

            {error && (
              <div className="flex items-center gap-2 mt-5 px-4 py-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-sm text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <button
              onClick={() => void handleStart()}
              disabled={starting}
              className="w-full mt-6 inline-flex min-h-[48px] items-center justify-center gap-2 px-5 py-4 bg-gradient-to-r from-[#d4af37] to-[#e6ca65] hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed text-[#050505] font-bold rounded-xl transition-all shadow-xl shadow-[rgba(212,175,55,0.25)] active:scale-95 cursor-pointer"
            >
              {starting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {isAssignment ? "Opening assignment…" : "Securing examination session…"}
                </>
              ) : (
                <>
                  {isAssignment ? <BookOpen className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                  {isAssignment ? "Open Assignment" : "Start Exam Now"}
                </>
              )}
            </button>
            <p className="text-center text-xs text-[#9d9b95] mt-3">
              {isAssignment
                ? "Untimed open submission. Save draft and submit anytime before the deadline."
                : "You get one attempt. The examination timer cannot be paused once initiated."}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // --- Exam / Assignment surface --------------------------------------------

  const question = questions[current]
  const isAssignment = exam.type === "ASSIGNMENT"
  const overBudget = !isAssignment && exam.config.trackTabSwitches && tabSwitches > exam.config.maxTabSwitches

  return (
    <div className={`fixed inset-0 z-40 bg-[#050505] text-[#f7f3e8] overflow-y-auto ${isAssignment ? "" : "select-none"}`}>
      {!isAssignment && (
        <AntiCheatGuard
          config={exam.config}
          active={stage === "active" && !submitting}
          onViolation={handleViolation}
          tabSwitches={tabSwitches}
        />
      )}

      {/* Header */}
      <header className="sticky top-0 z-20 bg-[#111110] border-b border-white/[0.08] shadow-xl shadow-black/40">
        <div className="max-w-5xl mx-auto px-5 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            {isAssignment ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-bold whitespace-nowrap">
                <BookOpen className="w-3.5 h-3.5" />
                Assignment (Untimed)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[rgba(212,175,55,0.15)] text-[#d4af37] border border-[rgba(212,175,55,0.3)] text-xs font-bold whitespace-nowrap">
                <Lock className="w-3.5 h-3.5" />
                Secure Guard Active
              </span>
            )}
            <div className="min-w-0 hidden sm:block">
              <p className="font-bold text-[#f7f3e8] text-sm truncate">{exam.title}</p>
              <p className="text-xs text-[#9d9b95] truncate">{exam.courseTitle ?? "General"}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!isAssignment && exam.config.trackTabSwitches && (
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border whitespace-nowrap ${
                  overBudget
                    ? "bg-rose-500/15 text-rose-300 border-rose-500/30"
                    : tabSwitches > 0
                      ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                      : "bg-[#181817] text-[#9d9b95] border-white/[0.08]"
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                Tab Switches: {tabSwitches}
                <span className="opacity-60">/ {exam.config.maxTabSwitches}</span>
              </span>
            )}

            {!isAssignment && exam.deadline && (
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
        <div className="h-1 bg-[#181817]">
          <div
            className="h-full bg-gradient-to-r from-[#d4af37] to-[#e6ca65] transition-[width] duration-300 shadow-sm shadow-[rgba(212,175,55,0.5)]"
            style={{ width: `${questions.length ? (answeredCount / questions.length) * 100 : 0}%` }}
          />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-6 grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-6">
        {/* Question surface */}
        <div className="space-y-5">
          {overBudget && (
            <div className="flex items-start gap-2 px-4 py-3 bg-rose-500/15 border border-rose-500/30 text-rose-300 rounded-xl text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>
                Tab-switch threshold exceeded. This session has been tagged in your evaluation audit. You may proceed and complete the examination.
              </span>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 px-4 py-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-sm text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {!question ? (
            <div className="bg-[#111110] rounded-2xl border border-white/[0.08] p-10 text-center text-[#9d9b95]">
              This paper has no questions.
            </div>
          ) : (
            <div className="bg-[#111110] rounded-2xl border border-white/[0.08] shadow-2xl p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#e6ca65] text-[#050505] text-sm font-bold flex items-center justify-center tabular-nums shadow-sm">
                    {current + 1}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#d4af37]">
                    {QUESTION_TYPE_LABEL[question.type]}
                  </span>
                </div>
                <span className="px-3 py-1 rounded-full bg-[#181817] border border-white/[0.08] text-[#d4af37] text-xs font-bold tabular-nums whitespace-nowrap">
                  {question.points} {question.points === 1 ? "pt" : "pts"}
                </span>
              </div>

              <p className="text-lg sm:text-xl text-[#f7f3e8] font-medium leading-relaxed whitespace-pre-wrap mb-6">
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
                    placeholder="Type your essay response here…"
                    className="w-full px-4 py-3 bg-[#141413] border border-white/[0.08] rounded-xl text-sm text-[#f7f3e8] placeholder:text-[#9d9b95]/50 focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] outline-none resize-y select-text"
                  />
                  <p className="text-xs text-[#9d9b95] mt-2 text-right tabular-nums">
                    {(responses[question.id]?.text ?? "").length} / 20000 characters
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {question.options.map((option, index) => {
                    const checked = responses[question.id]?.selectedOptionId === option.id
                    return (
                      <label
                        key={option.id}
                        className={`flex items-center gap-3.5 px-4 py-3.5 rounded-xl border transition-all cursor-pointer ${
                          checked
                            ? "border-[#d4af37] bg-[rgba(212,175,55,0.12)] text-[#f7f3e8] shadow-md shadow-[rgba(212,175,55,0.1)]"
                            : "border-white/[0.08] bg-[#141413] hover:border-[rgba(212,175,55,0.3)] hover:bg-[#181817] text-[#f7f3e8]/90"
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
                          className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                            checked
                              ? "border-[#d4af37] bg-gradient-to-r from-[#d4af37] to-[#e6ca65] text-[#050505]"
                              : "border-white/20 bg-[#1e1e1d] text-[#9d9b95]"
                          }`}
                        >
                          {String.fromCharCode(65 + index)}
                        </span>
                        <span className="text-sm font-medium">{option.text}</span>
                      </label>
                    )
                  })}
                </div>
              )}

              {/* Pager */}
              <div className="flex items-center justify-between gap-3 mt-7 pt-5 border-t border-white/[0.06]">
                <button
                  onClick={() => setCurrent(i => Math.max(0, i - 1))}
                  disabled={current === 0}
                  className="inline-flex min-h-[40px] items-center gap-1.5 px-4 py-2 bg-[#181817] border border-white/[0.08] hover:border-[rgba(212,175,55,0.3)] disabled:opacity-30 disabled:cursor-not-allowed text-[#f7f3e8] text-sm font-semibold rounded-xl transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Previous
                </button>

                {current === questions.length - 1 ? (
                  <button
                    onClick={() => setConfirmOpen(true)}
                    className="inline-flex min-h-[40px] items-center gap-2 px-5 py-2 bg-gradient-to-r from-[#d4af37] to-[#e6ca65] hover:brightness-110 text-[#050505] text-sm font-bold rounded-xl transition-all shadow-lg shadow-[rgba(212,175,55,0.25)] active:scale-95"
                  >
                    <Send className="w-4 h-4" />
                    Submit Paper
                  </button>
                ) : (
                  <button
                    onClick={() => setCurrent(i => Math.min(questions.length - 1, i + 1))}
                    className="inline-flex min-h-[40px] items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-[#d4af37] to-[#e6ca65] hover:brightness-110 text-[#050505] text-sm font-bold rounded-xl transition-all shadow-md shadow-[rgba(212,175,55,0.2)]"
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
          <div className="bg-[#111110] rounded-2xl border border-white/[0.08] shadow-xl p-4">
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#d4af37]">
                Question Index
              </h2>
              <span className="text-xs font-bold text-[#f7f3e8] tabular-nums">
                {answeredCount}/{questions.length} answered
              </span>
            </div>

            <div className="grid grid-cols-6 lg:grid-cols-5 gap-2">
              {questions.map((q, index) => {
                const done = isAnswered(q)
                const active = index === current
                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrent(index)}
                    title={`Question ${index + 1}${done ? " — answered" : ""}`}
                    className={`aspect-square rounded-xl text-xs font-bold tabular-nums transition-all ${
                      active
                        ? "bg-gradient-to-r from-[#d4af37] to-[#e6ca65] text-[#050505] ring-2 ring-[#d4af37] ring-offset-2 ring-offset-[#111110] shadow-md shadow-[rgba(212,175,55,0.3)]"
                        : done
                          ? "bg-[rgba(212,175,55,0.15)] text-[#d4af37] border border-[rgba(212,175,55,0.3)] hover:brightness-110"
                          : "bg-[#181817] text-[#9d9b95] border border-white/[0.06] hover:bg-white/[0.06]"
                    }`}
                  >
                    {index + 1}
                  </button>
                )
              })}
            </div>

            <div className="flex items-center gap-3 mt-4 pt-3 border-t border-white/[0.06] text-[10px] text-[#9d9b95]">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[rgba(212,175,55,0.3)] border border-[#d4af37]" />
                Completed
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#181817] border border-white/[0.08]" />
                Unanswered
              </span>
            </div>
          </div>

          <button
            onClick={() => setConfirmOpen(true)}
            className="w-full inline-flex min-h-[44px] items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-[#d4af37] to-[#e6ca65] hover:brightness-110 text-[#050505] text-sm font-bold rounded-xl transition-all shadow-lg shadow-[rgba(212,175,55,0.25)] active:scale-95 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            Submit Paper
          </button>

          <p className="text-[11px] text-[#9d9b95] leading-relaxed text-center px-2">
            Local drafts persist safely in encrypted browser session memory until final delivery.
          </p>
        </aside>
      </main>

      {/* Submit confirmation */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#111110] border border-white/[0.1] rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="w-12 h-12 rounded-2xl bg-[rgba(212,175,55,0.15)] border border-[rgba(212,175,55,0.3)] flex items-center justify-center mx-auto mb-4 text-[#d4af37]">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h2 className="text-lg font-bold text-[#f7f3e8] text-center">Ready to submit this paper?</h2>
            <p className="text-xs text-[#9d9b95] text-center mt-1.5">
              Once handed in, answers cannot be edited or reopened.
            </p>

            <div className="grid grid-cols-2 gap-3 my-5">
              <div className="p-3 bg-[#181817] border border-white/[0.06] rounded-xl text-center">
                <div className="text-xl font-bold text-[#f7f3e8] tabular-nums">{answeredCount}</div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#9d9b95] mt-0.5">
                  Answered
                </div>
              </div>
              <div
                className={`p-3 rounded-xl border text-center ${
                  questions.length - answeredCount > 0 ? "bg-rose-500/10 border-rose-500/30" : "bg-[#181817] border-white/[0.06]"
                }`}
              >
                <div
                  className={`text-xl font-bold tabular-nums ${
                    questions.length - answeredCount > 0 ? "text-rose-400" : "text-[#f7f3e8]"
                  }`}
                >
                  {questions.length - answeredCount}
                </div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#9d9b95] mt-0.5">
                  Left Blank
                </div>
              </div>
            </div>

            {questions.length - answeredCount > 0 && (
              <p className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-xl px-3.5 py-2.5 mb-4 text-center">
                Warning: Unanswered questions will receive 0 points.
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmOpen(false)}
                disabled={submitting}
                className="flex-1 px-4 py-2.5 bg-[#181817] border border-white/[0.08] hover:border-[rgba(212,175,55,0.3)] disabled:opacity-50 text-[#f7f3e8] text-sm font-semibold rounded-xl transition-all"
              >
                Keep Working
              </button>
              <button
                onClick={() => void submitExam(false)}
                disabled={submitting}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#d4af37] to-[#e6ca65] hover:brightness-110 disabled:opacity-50 text-[#050505] text-sm font-bold rounded-xl transition-all shadow-lg shadow-[rgba(212,175,55,0.25)]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Confirm &amp; Submit
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auto-submit curtain */}
      {submitting && !confirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center gap-3 text-white">
          <Loader2 className="w-8 h-8 animate-spin text-[#d4af37]" />
          <p className="font-bold text-[#f7f3e8]">Time expired — filing your examination paper…</p>
          <p className="text-xs text-[#9d9b95]">Do not close or reload this window.</p>
        </div>
      )}
    </div>
  )
}
