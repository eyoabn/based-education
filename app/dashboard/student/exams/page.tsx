"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  FileText,
  Hourglass,
  Lock,
  ShieldCheck,
  Target,
} from "lucide-react"
import { formatWhen, hasPassed, scorePct, type ExamSummary } from "@/lib/exams"

type Bucket = "AVAILABLE" | "IN_PROGRESS" | "DONE"

function bucketOf(exam: ExamSummary): Bucket {
  if (!exam.attempt) return "AVAILABLE"
  if (exam.attempt.status === "IN_PROGRESS") return "IN_PROGRESS"
  return "DONE"
}

function isOverdue(exam: ExamSummary): boolean {
  return !!exam.dueAt && new Date(exam.dueAt).getTime() < Date.now()
}

function ExamCard({ exam }: { exam: ExamSummary }) {
  const bucket = bucketOf(exam)
  const overdue = isOverdue(exam)
  const attempt = exam.attempt
  const released = attempt?.status === "GRADED" && attempt.score !== null

  return (
    <div className="bg-[#111110] rounded-2xl border border-white/[0.08] shadow-xl shadow-black/40 p-5 hover:border-[rgba(212,175,55,0.3)] transition-all flex flex-col group">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                exam.type === "EXAM"
                  ? "bg-[rgba(212,175,55,0.15)] text-[#d4af37] border-[rgba(212,175,55,0.3)]"
                  : "bg-sky-500/15 text-sky-300 border-sky-500/30"
              }`}
            >
              {exam.type === "EXAM" ? "Exam" : "Assignment"}
            </span>
            {bucket === "IN_PROGRESS" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30">
                <Hourglass className="w-2.5 h-2.5" />
                In Progress
              </span>
            )}
            {overdue && bucket === "AVAILABLE" && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/15 text-rose-300 border border-rose-500/30">
                Overdue
              </span>
            )}
          </div>

          <h3 className="font-bold text-[#f7f3e8] text-base leading-snug truncate group-hover:text-[#d4af37] transition-colors">{exam.title}</h3>
          {exam.courseTitle && (
            <p className="text-xs text-[#9d9b95] mt-0.5 truncate">{exam.courseTitle}</p>
          )}
        </div>

        <div className="w-10 h-10 rounded-xl bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.2)] flex items-center justify-center shrink-0 text-[#d4af37]">
          <FileText className="w-5 h-5" />
        </div>
      </div>

      {exam.description && (
        <p className="text-sm text-[#9d9b95] line-clamp-2 mb-4">{exam.description}</p>
      )}

      {/* Facts */}
      <div className="grid grid-cols-3 gap-3 py-3 border-y border-white/[0.06] mb-4">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wide text-[#9d9b95]/60 mb-0.5">
            Questions
          </div>
          <div className="text-sm font-bold text-[#f7f3e8] tabular-nums">
            {exam.questionCount}
          </div>
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wide text-[#9d9b95]/60 mb-0.5">
            Duration
          </div>
          <div className="text-sm font-bold text-[#f7f3e8] tabular-nums">
            {exam.durationMins}m
          </div>
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wide text-[#9d9b95]/60 mb-0.5">
            Points
          </div>
          <div className="text-sm font-bold text-[#f7f3e8] tabular-nums">
            {exam.totalPoints}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-[#9d9b95] mb-4">
        <Clock className="w-3.5 h-3.5 shrink-0 text-[#d4af37]" />
        <span>{exam.dueAt ? `Due ${formatWhen(exam.dueAt)}` : "No due date"}</span>
        <span className="text-white/20">·</span>
        <Target className="w-3.5 h-3.5 shrink-0 text-[#d4af37]" />
        <span>Pass mark: {exam.passingPct}%</span>
      </div>

      {/* Action / result */}
      <div className="mt-auto">
        {bucket === "DONE" ? (
          released ? (
            <div
              className={`flex items-center justify-between px-4 py-3 rounded-xl border ${
                hasPassed(attempt.score!, attempt.maxScore, exam.passingPct)
                  ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                  : "bg-rose-500/10 text-rose-300 border-rose-500/30"
              }`}
            >
              <span className="flex items-center gap-2 text-sm font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                {hasPassed(attempt.score!, attempt.maxScore, exam.passingPct) ? "Passed" : "Failed"}
              </span>
              <span className="text-sm font-bold tabular-nums">
                {attempt.score}/{attempt.maxScore} ({scorePct(attempt.score!, attempt.maxScore)}%)
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#181817] text-[#9d9b95] border border-white/[0.08] text-sm font-medium">
              <Hourglass className="w-4 h-4 text-[#d4af37]" />
              Submitted — awaiting instructor evaluation
            </div>
          )
        ) : (
          <Link
            href={`/dashboard/student/exams/${exam.id}`}
            className={`w-full inline-flex min-h-[44px] items-center justify-center gap-2 px-4 py-3 text-sm font-bold rounded-xl transition-all shadow-lg active:scale-95 ${
              bucket === "IN_PROGRESS"
                ? "bg-gradient-to-r from-amber-500 to-amber-400 text-[#050505] shadow-amber-900/30 hover:brightness-110"
                : "bg-gradient-to-r from-[#d4af37] to-[#e6ca65] text-[#050505] shadow-[rgba(212,175,55,0.25)] hover:brightness-110"
            }`}
          >
            {bucket === "IN_PROGRESS" ? (
              <>
                <Hourglass className="w-4 h-4" />
                Resume Attempt
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                Enter Secure Exam
              </>
            )}
            <ArrowRight className="w-4 h-4" />
          </Link>
        )}
      </div>
    </div>
  )
}

export default function StudentExamsPage() {
  const [exams, setExams] = useState<ExamSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const res = await fetch("/api/exams")
        const data = await res.json()
        if (cancelled) return
        if (data.error) setError(data.error)
        else setExams(data.exams ?? [])
      } catch {
        if (!cancelled) setError("Could not load your assessments.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const { pending, completed } = useMemo(() => {
    const pending: ExamSummary[] = []
    const completed: ExamSummary[] = []
    for (const exam of exams) {
      if (bucketOf(exam) === "DONE") completed.push(exam)
      else pending.push(exam)
    }
    // Soonest deadline first; undated papers sink to the bottom.
    pending.sort((a, b) => {
      if (!a.dueAt) return 1
      if (!b.dueAt) return -1
      return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()
    })
    return { pending, completed }
  }, [exams])

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.25)] text-[#d4af37] text-xs font-semibold tracking-wider uppercase mb-2">
          Assessment Hall
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#f7f3e8] tracking-tight">Exams &amp; Assignments</h1>
        <p className="text-sm text-[#9d9b95] mt-1">
          Everything assigned across your enrolled courses, organized chronologically by submission deadline.
        </p>
      </div>

      {/* Integrity notice */}
      <div className="flex items-start gap-3 p-4 sm:p-5 bg-[#111110] border border-[rgba(212,175,55,0.25)] rounded-2xl text-[#9d9b95] shadow-xl shadow-black/30">
        <ShieldCheck className="w-5 h-5 text-[#d4af37] shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-bold text-[#f7f3e8] mb-0.5">Secure Proctoring &amp; Guard active</p>
          <p className="text-xs sm:text-sm text-[#9d9b95] leading-relaxed">
            Once initiated, window defocus, tab navigation, and fullscreen exits are recorded and securely submitted in your instructor&apos;s evaluation audit.
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-sm text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-72 bg-[#111110] rounded-2xl border border-white/[0.08] animate-pulse" />
          ))}
        </div>
      ) : exams.length === 0 ? (
        <div className="bg-[#111110] rounded-2xl border border-white/[0.08] shadow-xl p-12 text-center">
          <FileText className="w-10 h-10 text-[#d4af37]/40 mx-auto mb-4" />
          <p className="font-bold text-[#f7f3e8]">No assessments assigned</p>
          <p className="text-xs sm:text-sm text-[#9d9b95] mt-1">
            When instructors publish tests, assignments or papers, they will appear here.
          </p>
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#d4af37]">
                Pending Tasks <span className="text-[#9d9b95] tabular-nums">({pending.length})</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {pending.map(exam => (
                  <ExamCard key={exam.id} exam={exam} />
                ))}
              </div>
            </section>
          )}

          {completed.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#9d9b95]">
                Completed Papers <span className="text-[#9d9b95]/60 tabular-nums">({completed.length})</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {completed.map(exam => (
                  <ExamCard key={exam.id} exam={exam} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
