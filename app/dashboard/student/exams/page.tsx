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
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow flex flex-col">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset ${
                exam.type === "EXAM"
                  ? "bg-indigo-50 text-indigo-700 ring-indigo-600/20"
                  : "bg-sky-50 text-sky-700 ring-sky-600/20"
              }`}
            >
              {exam.type === "EXAM" ? "Exam" : "Assignment"}
            </span>
            {bucket === "IN_PROGRESS" && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20">
                <Hourglass className="w-2.5 h-2.5" />
                In Progress
              </span>
            )}
            {overdue && bucket === "AVAILABLE" && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20">
                Overdue
              </span>
            )}
          </div>

          <h3 className="font-bold text-slate-900 leading-snug truncate">{exam.title}</h3>
          {exam.courseTitle && (
            <p className="text-xs text-slate-400 mt-0.5 truncate">{exam.courseTitle}</p>
          )}
        </div>

        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
          <FileText className="w-5 h-5 text-slate-500" />
        </div>
      </div>

      {exam.description && (
        <p className="text-sm text-slate-500 line-clamp-2 mb-4">{exam.description}</p>
      )}

      {/* Facts */}
      <div className="grid grid-cols-3 gap-3 py-3 border-y border-slate-100 mb-4">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-0.5">
            Questions
          </div>
          <div className="text-sm font-semibold text-slate-700 tabular-nums">
            {exam.questionCount}
          </div>
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-0.5">
            Duration
          </div>
          <div className="text-sm font-semibold text-slate-700 tabular-nums">
            {exam.durationMins}m
          </div>
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-0.5">
            Points
          </div>
          <div className="text-sm font-semibold text-slate-700 tabular-nums">
            {exam.totalPoints}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-4">
        <Clock className="w-3.5 h-3.5 shrink-0" />
        {exam.dueAt ? `Due ${formatWhen(exam.dueAt)}` : "No due date"}
        <span className="text-slate-300">·</span>
        <Target className="w-3.5 h-3.5 shrink-0" />
        Pass {exam.passingPct}%
      </div>

      {/* Action / result */}
      <div className="mt-auto">
        {bucket === "DONE" ? (
          released ? (
            <div
              className={`flex items-center justify-between px-4 py-3 rounded-lg ${
                hasPassed(attempt.score!, attempt.maxScore, exam.passingPct)
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-red-50 text-red-700"
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
            <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-slate-50 text-slate-600 text-sm font-semibold">
              <Hourglass className="w-4 h-4" />
              Submitted — awaiting your teacher&apos;s review
            </div>
          )
        ) : (
          <Link
            href={`/dashboard/student/exams/${exam.id}`}
            className={`w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold rounded-lg transition-colors ${
              bucket === "IN_PROGRESS"
                ? "bg-amber-500 hover:bg-amber-600 text-white"
                : "bg-slate-900 hover:bg-slate-800 text-white"
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
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Exams &amp; Assignments</h1>
        <p className="text-sm text-slate-500 mt-1">
          Everything assigned to your enrolled courses, newest deadline first.
        </p>
      </div>

      {/* Integrity notice */}
      <div className="flex items-start gap-3 p-4 bg-slate-900 rounded-xl text-slate-300">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-semibold text-white mb-0.5">Secure Guard is active on these papers</p>
          <p className="text-slate-400 leading-relaxed">
            Once you start, switching tabs or leaving full-screen will be logged and flagged to your
            teacher. Read each paper&apos;s rules before you begin.
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-72 bg-white rounded-xl border border-slate-200 animate-pulse" />
          ))}
        </div>
      ) : exams.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-4" />
          <p className="font-semibold text-slate-700">No assessments yet</p>
          <p className="text-sm text-slate-400 mt-1">
            When your teachers publish an exam or assignment it will land here.
          </p>
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
                To Do <span className="text-slate-400 tabular-nums">({pending.length})</span>
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
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
                Completed <span className="text-slate-400 tabular-nums">({completed.length})</span>
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
