"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  Copy,
  Eye,
  FilePlus2,
  FileText,
  Flag,
  Loader2,
  Lock,
  Maximize,
  MousePointerClick,
  Plus,
  Shuffle,
  Trash2,
  Users,
  X,
} from "lucide-react"
import ExamBuilder from "@/components/exams/ExamBuilder"
import {
  formatWhen,
  totalPointsOf,
  type ExamQuestion,
  type ExamSummary,
} from "@/lib/exams"

interface CourseOption {
  id: string
  title: string
  code: string
  studentCount: number
}

/** Anti-cheat toggle metadata — keeps the config block declarative. */
const GUARD_TOGGLES = [
  {
    key: "forceFullscreen" as const,
    icon: Maximize,
    label: "Force Fullscreen Mode",
    hint: "The paper opens full-screen; leaving is logged.",
  },
  {
    key: "trackTabSwitches" as const,
    icon: Eye,
    label: "Track & Limit Tab Switches",
    hint: "Counts every time the student leaves the exam tab.",
  },
  {
    key: "blockCopyPaste" as const,
    icon: MousePointerClick,
    label: "Block Copy, Paste & Right-Click",
    hint: "Also intercepts Ctrl/Cmd+C, +V and devtools shortcuts.",
  },
  {
    key: "randomizeOrder" as const,
    icon: Shuffle,
    label: "Randomize Question & Choice Order",
    hint: "Each student gets a stable, uniquely shuffled paper.",
  },
]

function emptyDraft() {
  return {
    title: "",
    description: "",
    courseId: "",
    type: "EXAM" as "EXAM" | "ASSIGNMENT",
    durationMins: 45,
    passingPct: 50,
    dueDate: "",
    dueTime: "23:59",
    forceFullscreen: true,
    trackTabSwitches: true,
    maxTabSwitches: 3,
    blockCopyPaste: true,
    randomizeOrder: true,
  }
}

export default function TeacherExamsPage() {
  const [exams, setExams] = useState<ExamSummary[]>([])
  const [courses, setCourses] = useState<CourseOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [composerOpen, setComposerOpen] = useState(false)
  const [draft, setDraft] = useState(emptyDraft)
  const [questions, setQuestions] = useState<ExamQuestion[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const loadExams = useCallback(async () => {
    try {
      const res = await fetch("/api/exams")
      const data = await res.json()
      if (data.error) setError(data.error)
      else {
        setError(null)
        setExams(data.exams ?? [])
      }
    } catch {
      setError("Could not load your assessments.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadExams()

    fetch("/api/courses")
      .then(res => res.json())
      .then((data: { courses?: CourseOption[] }) => setCourses(data.courses ?? []))
      .catch(() => {
        // Non-fatal — the paper can still target every student.
      })
  }, [loadExams])

  const openComposer = () => {
    setDraft(emptyDraft())
    setQuestions([])
    setFormError(null)
    setComposerOpen(true)
  }

  const handlePublish = async (publish: boolean) => {
    setFormError(null)

    if (!draft.title.trim()) {
      setFormError("Give the assessment a title.")
      return
    }
    if (questions.length === 0) {
      setFormError("Add at least one question.")
      return
    }

    const missingKey = questions.findIndex(q => q.type !== "ESSAY" && !q.correctOptionId)
    if (missingKey !== -1) {
      setFormError(`Mark the correct answer for question ${missingKey + 1}.`)
      return
    }
    const emptyPrompt = questions.findIndex(q => !q.prompt.trim())
    if (emptyPrompt !== -1) {
      setFormError(`Question ${emptyPrompt + 1} is missing its prompt.`)
      return
    }

    // Local date + time -> UTC, the same conversion the scheduler uses.
    const dueAt = draft.dueDate
      ? new Date(`${draft.dueDate}T${draft.dueTime || "23:59"}`).toISOString()
      : null

    setSubmitting(true)
    try {
      const res = await fetch("/api/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draft.title.trim(),
          description: draft.description.trim() || null,
          courseId: draft.courseId || null,
          type: draft.type,
          durationMins: draft.durationMins,
          passingPct: draft.passingPct,
          dueAt,
          questions,
          forceFullscreen: draft.forceFullscreen,
          trackTabSwitches: draft.trackTabSwitches,
          maxTabSwitches: draft.maxTabSwitches,
          blockCopyPaste: draft.blockCopyPaste,
          randomizeOrder: draft.randomizeOrder,
          isPublished: publish,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setFormError(data.error ?? "Could not create the assessment.")
        return
      }

      setExams(prev => [data.exam as ExamSummary, ...prev])
      setComposerOpen(false)
      setNotice(
        publish
          ? `"${data.exam.title}" published — ${data.notifiedCount} student${
              data.notifiedCount === 1 ? "" : "s"
            } notified.`
          : `"${data.exam.title}" saved as a draft.`
      )
      setTimeout(() => setNotice(null), 6_000)
    } catch {
      setFormError("Network error — please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (exam: ExamSummary) => {
    if (
      !window.confirm(
        `Delete "${exam.title}"? Every submission on this paper is removed with it. This cannot be undone.`
      )
    ) {
      return
    }

    setDeletingId(exam.id)
    try {
      const res = await fetch(`/api/exams/${exam.id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Could not delete the assessment.")
        return
      }
      setExams(prev => prev.filter(e => e.id !== exam.id))
    } catch {
      setError("Network error — please try again.")
    } finally {
      setDeletingId(null)
    }
  }

  const draftPoints = totalPointsOf(questions)
  const selectedCourse = courses.find(c => c.id === draft.courseId)

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Exams & Assignments</h1>
          <p className="text-sm text-slate-500 mt-1">
            Build secure, auto-graded papers with lockdown enforcement.
          </p>
        </div>

        <button
          onClick={openComposer}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-lg transition-colors shadow-sm"
        >
          <FilePlus2 className="w-4 h-4" />
          Create Assessment
        </button>
      </div>

      {notice && (
        <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {notice}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Exam list */}
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-28 bg-white rounded-xl border border-slate-200 animate-pulse" />
          ))}
        </div>
      ) : exams.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-4" />
          <p className="font-semibold text-slate-700">No assessments yet</p>
          <p className="text-sm text-slate-400 mt-1 mb-5">
            Create your first exam or assignment to start collecting submissions.
          </p>
          <button
            onClick={openComposer}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Assessment
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {exams.map(exam => (
            <div
              key={exam.id}
              className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ring-1 ring-inset ${
                        exam.type === "EXAM"
                          ? "bg-red-50 text-red-700 ring-red-600/20"
                          : "bg-amber-50 text-amber-700 ring-amber-600/20"
                      }`}
                    >
                      {exam.type === "EXAM" ? "Exam" : "Assignment"}
                    </span>

                    {exam.isPublished ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                        <CheckCircle2 className="w-3 h-3" />
                        Published
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-500/20">
                        Draft
                      </span>
                    )}

                    {exam.courseTitle && (
                      <span className="text-xs text-slate-400">{exam.courseTitle}</span>
                    )}
                  </div>

                  <h3 className="font-bold text-slate-900 truncate">{exam.title}</h3>
                  {exam.description && (
                    <p className="text-sm text-slate-500 mt-0.5 line-clamp-1">
                      {exam.description}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2.5 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      {exam.questionCount} question{exam.questionCount === 1 ? "" : "s"} ·{" "}
                      {exam.totalPoints} pts
                    </span>
                    <span className="flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                      {exam.durationMins} min · pass at {exam.passingPct}%
                    </span>
                    {exam.dueAt && (
                      <span className="flex items-center gap-1">
                        <CalendarClock className="w-3.5 h-3.5 text-slate-400" />
                        Due {formatWhen(exam.dueAt)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Submission stats */}
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-center px-3">
                    <div className="text-xl font-bold text-slate-900 tabular-nums">
                      {exam.submissionCount ?? 0}
                    </div>
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Submitted
                    </div>
                  </div>
                  <div className="text-center px-3 border-l border-slate-100">
                    <div className="text-xl font-bold text-emerald-600 tabular-nums">
                      {exam.gradedCount ?? 0}
                    </div>
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Graded
                    </div>
                  </div>
                  <div className="text-center px-3 border-l border-slate-100">
                    <div
                      className={`text-xl font-bold tabular-nums ${
                        (exam.flaggedCount ?? 0) > 0 ? "text-red-600" : "text-slate-300"
                      }`}
                    >
                      {exam.flaggedCount ?? 0}
                    </div>
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Flagged
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pl-2 border-l border-slate-100">
                    <Link
                      href={`/dashboard/teacher/grading?examId=${exam.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors"
                    >
                      <Flag className="w-3.5 h-3.5" />
                      Grade
                    </Link>
                    <button
                      onClick={() => void handleDelete(exam)}
                      disabled={deletingId === exam.id}
                      aria-label={`Delete ${exam.title}`}
                      className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      {deletingId === exam.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Composer */}
      {composerOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setComposerOpen(false)}
            aria-hidden
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="composer-title"
            className="relative w-full max-w-4xl my-8 bg-slate-50 rounded-2xl shadow-2xl border border-slate-200 animate-fade-up"
          >
            {/* Composer header */}
            <div className="sticky top-0 z-10 flex items-start justify-between px-6 py-5 bg-white border-b border-slate-200 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <FilePlus2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 id="composer-title" className="text-lg font-bold text-slate-900">
                    Create Assessment
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {questions.length} question{questions.length === 1 ? "" : "s"} · {draftPoints}{" "}
                    point{draftPoints === 1 ? "" : "s"}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setComposerOpen(false)}
                aria-label="Close"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-6">
              {/* Meta form */}
              <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Assessment Details
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="exam-title"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="exam-title"
                      type="text"
                      value={draft.title}
                      onChange={e => setDraft({ ...draft, title: e.target.value })}
                      placeholder="e.g. Thermodynamics — Mid-Term Assessment"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none transition-shadow"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="exam-type"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Type
                    </label>
                    <select
                      id="exam-type"
                      value={draft.type}
                      onChange={e =>
                        setDraft({ ...draft, type: e.target.value as "EXAM" | "ASSIGNMENT" })
                      }
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none transition-shadow cursor-pointer"
                    >
                      <option value="EXAM">Exam (timed & locked)</option>
                      <option value="ASSIGNMENT">Assignment</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="exam-description"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Description
                  </label>
                  <textarea
                    id="exam-description"
                    value={draft.description}
                    onChange={e => setDraft({ ...draft, description: e.target.value })}
                    rows={2}
                    placeholder="What does this paper cover? Students see this before they start."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none transition-shadow"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="exam-course"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Target Course
                    </label>
                    <select
                      id="exam-course"
                      value={draft.courseId}
                      onChange={e => setDraft({ ...draft, courseId: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none transition-shadow cursor-pointer"
                    >
                      <option value="">All my students (open assessment)</option>
                      {courses.map(course => (
                        <option key={course.id} value={course.id}>
                          {course.code} — {course.title} ({course.studentCount} enrolled)
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {selectedCourse
                        ? `${selectedCourse.studentCount} student${selectedCourse.studentCount === 1 ? "" : "s"} will be notified.`
                        : "Every student will be notified."}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="exam-duration"
                        className="block text-xs font-semibold text-slate-700 mb-1.5"
                      >
                        Duration (min)
                      </label>
                      <input
                        id="exam-duration"
                        type="number"
                        min={1}
                        max={600}
                        value={draft.durationMins}
                        onChange={e =>
                          setDraft({ ...draft, durationMins: Number(e.target.value) || 0 })
                        }
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm tabular-nums focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none transition-shadow"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="exam-passing"
                        className="block text-xs font-semibold text-slate-700 mb-1.5"
                      >
                        Passing (%)
                      </label>
                      <input
                        id="exam-passing"
                        type="number"
                        min={0}
                        max={100}
                        value={draft.passingPct}
                        onChange={e =>
                          setDraft({ ...draft, passingPct: Number(e.target.value) || 0 })
                        }
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm tabular-nums focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none transition-shadow"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:max-w-md">
                  <div>
                    <label
                      htmlFor="exam-due-date"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Due Date
                    </label>
                    <input
                      id="exam-due-date"
                      type="date"
                      value={draft.dueDate}
                      onChange={e => setDraft({ ...draft, dueDate: e.target.value })}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none transition-shadow"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="exam-due-time"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Due Time
                    </label>
                    <input
                      id="exam-due-time"
                      type="time"
                      value={draft.dueTime}
                      onChange={e => setDraft({ ...draft, dueTime: e.target.value })}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none transition-shadow"
                    />
                  </div>
                </div>
              </section>

              {/* Anti-cheat configuration */}
              <section className="bg-slate-900 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-1">
                  <Lock className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wide">
                    Anti-Cheating Configuration
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mb-4">
                  Enforced in the browser and re-verified on the server at submit time.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {GUARD_TOGGLES.map(toggle => {
                    const enabled = draft[toggle.key]
                    const Icon = toggle.icon

                    return (
                      <button
                        key={toggle.key}
                        type="button"
                        onClick={() => setDraft({ ...draft, [toggle.key]: !enabled })}
                        aria-pressed={enabled}
                        className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-colors ${
                          enabled
                            ? "bg-emerald-500/15 border-emerald-500/40"
                            : "bg-white/5 border-white/10 hover:bg-white/10"
                        }`}
                      >
                        <span
                          className={`w-5 h-5 rounded shrink-0 mt-0.5 flex items-center justify-center transition-colors ${
                            enabled ? "bg-emerald-500" : "bg-slate-700"
                          }`}
                        >
                          {enabled && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                        </span>

                        <span className="min-w-0">
                          <span className="flex items-center gap-1.5 text-sm font-semibold text-white">
                            <Icon className="w-3.5 h-3.5 text-slate-400" />
                            {toggle.label}
                          </span>
                          <span className="block text-xs text-slate-400 mt-0.5">
                            {toggle.hint}
                          </span>
                        </span>
                      </button>
                    )
                  })}
                </div>

                {draft.trackTabSwitches && (
                  <div className="flex items-center gap-3 mt-3 px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg">
                    <label
                      htmlFor="max-switches"
                      className="text-sm text-slate-300 font-medium"
                    >
                      Flag the paper after
                    </label>
                    <input
                      id="max-switches"
                      type="number"
                      min={0}
                      max={20}
                      value={draft.maxTabSwitches}
                      onChange={e =>
                        setDraft({ ...draft, maxTabSwitches: Number(e.target.value) || 0 })
                      }
                      className="w-20 px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white font-bold tabular-nums focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                    <span className="text-sm text-slate-300">tab switches</span>
                  </div>
                )}
              </section>

              {/* Question builder */}
              <ExamBuilder questions={questions} onChange={setQuestions} />

              {formError && (
                <div className="flex items-start gap-2 px-3.5 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  {formError}
                </div>
              )}
            </div>

            {/* Composer footer */}
            <div className="sticky bottom-0 flex items-center justify-between gap-3 px-6 py-4 bg-white border-t border-slate-200 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setComposerOpen(false)}
                className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handlePublish(false)}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-lg transition-colors disabled:opacity-60"
                >
                  <Copy className="w-4 h-4" />
                  Save Draft
                </button>

                <button
                  type="button"
                  onClick={() => void handlePublish(true)}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    <>
                      <FilePlus2 className="w-4 h-4" />
                      Publish & Notify
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
