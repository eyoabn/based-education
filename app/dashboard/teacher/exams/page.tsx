"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  Copy,
  Edit3,
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
  const [editingExamId, setEditingExamId] = useState<string | null>(null)
  const [draft, setDraft] = useState(emptyDraft)
  const [questions, setQuestions] = useState<ExamQuestion[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showAdvancedSecurity, setShowAdvancedSecurity] = useState(false)

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
    setEditingExamId(null)
    setDraft(emptyDraft())
    setQuestions([])
    setFormError(null)
    setShowAdvancedSecurity(false)
    setComposerOpen(true)
  }

  const handleEditDraft = async (exam: ExamSummary) => {
    try {
      setFormError(null)
      const res = await fetch(`/api/exams/${exam.id}`)
      const data = await res.json()
      if (data.error) {
        setError(data.error)
        return
      }
      const fullExam = data.exam
      let dueDate = ""
      let dueTime = "23:59"
      if (fullExam.dueAt) {
        const d = new Date(fullExam.dueAt)
        dueDate = d.toISOString().split("T")[0]
        dueTime = `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`
      }
      setDraft({
        title: fullExam.title || "",
        description: fullExam.description || "",
        courseId: fullExam.courseId || "",
        type: fullExam.type || "EXAM",
        durationMins: fullExam.type === "ASSIGNMENT" ? 0 : (fullExam.durationMins || 45),
        passingPct: fullExam.passingPct ?? 50,
        dueDate,
        dueTime,
        forceFullscreen: fullExam.config?.forceFullscreen ?? false,
        trackTabSwitches: fullExam.config?.trackTabSwitches ?? false,
        maxTabSwitches: fullExam.config?.maxTabSwitches ?? 3,
        blockCopyPaste: fullExam.config?.blockCopyPaste ?? false,
        randomizeOrder: fullExam.config?.randomizeOrder ?? false,
      })
      setQuestions(fullExam.questions || [])
      setEditingExamId(exam.id)
      setShowAdvancedSecurity(false)
      setComposerOpen(true)
    } catch {
      setError("Failed to load draft for editing.")
    }
  }

  const handlePublish = async (publish: boolean) => {
    setFormError(null)

    if (!draft.title.trim()) {
      setFormError("Give the assessment a title.")
      return
    }

    if (publish) {
      if (draft.type === "ASSIGNMENT" && !draft.dueDate) {
        setFormError("Assignments require a submission deadline date and time.")
        return
      }

      if (questions.length === 0) {
        setFormError("Add at least one question or assignment task before publishing.")
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
    }

    // Local date + time -> UTC, the same conversion the scheduler uses.
    const dueAt = draft.dueDate
      ? new Date(`${draft.dueDate}T${draft.dueTime || "23:59"}`).toISOString()
      : null

    setSubmitting(true)
    try {
      const url = editingExamId ? `/api/exams/${editingExamId}` : "/api/exams"
      const method = editingExamId ? "PATCH" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draft.title.trim(),
          description: draft.description.trim() || null,
          courseId: draft.courseId || null,
          type: draft.type,
          durationMins: draft.type === "ASSIGNMENT" ? 0 : draft.durationMins,
          passingPct: draft.passingPct,
          dueAt,
          questions,
          forceFullscreen: draft.type === "ASSIGNMENT" ? false : draft.forceFullscreen,
          trackTabSwitches: draft.type === "ASSIGNMENT" ? false : draft.trackTabSwitches,
          maxTabSwitches: draft.maxTabSwitches,
          blockCopyPaste: draft.type === "ASSIGNMENT" ? false : draft.blockCopyPaste,
          randomizeOrder: draft.type === "ASSIGNMENT" ? false : draft.randomizeOrder,
          isPublished: publish,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setFormError(data.error ?? "Could not save the assessment.")
        return
      }

      if (editingExamId) {
        setExams(prev => prev.map(e => e.id === editingExamId ? { ...e, ...data.exam } : e))
      } else {
        setExams(prev => [data.exam as ExamSummary, ...prev])
      }

      setComposerOpen(false)
      setNotice(
        publish
          ? `"${data.exam.title}" published — ${data.notifiedCount ?? 0} student${
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
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#f7f3e8] tracking-tight">Exams & Assessments</h1>
          <p className="text-sm text-[#9d9b95] mt-1">
            Build secure, auto-graded papers with anti-cheat proctoring and grading suites.
          </p>
        </div>

        <button
          onClick={openComposer}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#d4af37] to-[#b38f2a] hover:brightness-110 text-black font-extrabold text-sm rounded-xl transition-all shadow-lg shadow-[rgba(212,175,55,0.15)] min-h-[44px]"
        >
          <FilePlus2 className="w-4 h-4" />
          Create Assessment
        </button>
      </div>

      {notice && (
        <div className="flex items-center gap-2 px-4 py-3 bg-[rgba(212,175,55,0.08)] border border-[rgba(212,175,55,0.25)] rounded-2xl text-sm text-[#f5d77f]">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-[#d4af37]" />
          {notice}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-rose-950/25 border border-rose-500/30 rounded-2xl text-sm text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Exam list */}
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-28 bg-[#111110] rounded-2xl border border-white/[0.08] animate-pulse" />
          ))}
        </div>
      ) : exams.length === 0 ? (
        <div className="bg-[#111110] rounded-2xl border border-white/[0.08] shadow-lg p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[rgba(212,175,55,0.08)] border border-[rgba(212,175,55,0.2)] flex items-center justify-center mx-auto mb-4 text-[#d4af37]">
            <FileText className="w-6 h-6" />
          </div>
          <p className="font-bold text-[#f7f3e8]">No assessments yet</p>
          <p className="text-sm text-[#9d9b95] mt-1 mb-5">
            Create your first exam or assignment to start collecting submissions.
          </p>
          <button
            onClick={openComposer}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#d4af37] to-[#b38f2a] hover:brightness-110 text-black font-extrabold text-sm rounded-xl transition-all shadow-lg shadow-[rgba(212,175,55,0.15)] min-h-[44px]"
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
              className="bg-[#111110] rounded-2xl border border-white/[0.08] shadow-lg shadow-black/20 p-5 hover:border-[rgba(212,175,55,0.3)] transition-all"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ring-1 ring-inset ${
                        exam.type === "EXAM"
                          ? "bg-rose-500/10 text-rose-400 ring-rose-500/20"
                          : "bg-[rgba(212,175,55,0.12)] text-[#f5d77f] ring-[rgba(212,175,55,0.25)]"
                      }`}
                    >
                      {exam.type === "EXAM" ? "Exam" : "Assignment"}
                    </span>

                    {exam.isPublished ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 ring-1 ring-inset ring-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" />
                        Published
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/[0.06] text-[#9d9b95] ring-1 ring-inset ring-white/10">
                        Draft
                      </span>
                    )}

                    {exam.courseTitle && (
                      <span className="text-xs text-[#9d9b95]">{exam.courseTitle}</span>
                    )}
                  </div>

                  <h3 className="font-bold text-[#f7f3e8] text-base truncate">{exam.title}</h3>
                  {exam.description && (
                    <p className="text-sm text-[#9d9b95] mt-0.5 line-clamp-1">
                      {exam.description}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2.5 text-xs text-[#9d9b95]">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-[#d4af37]" />
                      {exam.questionCount} question{exam.questionCount === 1 ? "" : "s"} ·{" "}
                      {exam.totalPoints} pts
                    </span>
                    <span className="flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                      {exam.durationMins} min · pass at {exam.passingPct}%
                    </span>
                    {exam.dueAt && (
                      <span className="flex items-center gap-1">
                        <CalendarClock className="w-3.5 h-3.5 text-[#d4af37]" />
                        Due {formatWhen(exam.dueAt)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Submission stats */}
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-center px-3">
                    <div className="text-xl font-bold text-[#f7f3e8] tabular-nums">
                      {exam.submissionCount ?? 0}
                    </div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-[#9d9b95]">
                      Submitted
                    </div>
                  </div>
                  <div className="text-center px-3 border-l border-white/[0.08]">
                    <div className="text-xl font-bold text-[#d4af37] tabular-nums">
                      {exam.gradedCount ?? 0}
                    </div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-[#9d9b95]">
                      Graded
                    </div>
                  </div>
                  <div className="text-center px-3 border-l border-white/[0.08]">
                    <div
                      className={`text-xl font-bold tabular-nums ${
                        (exam.flaggedCount ?? 0) > 0 ? "text-rose-400" : "text-white/20"
                      }`}
                    >
                      {exam.flaggedCount ?? 0}
                    </div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-[#9d9b95]">
                      Flagged
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pl-2 border-l border-white/[0.08]">
                    {!exam.isPublished ? (
                      <button
                        onClick={() => void handleEditDraft(exam)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-[rgba(212,175,55,0.12)] hover:bg-[rgba(212,175,55,0.2)] text-[#f5d77f] border border-[rgba(212,175,55,0.25)] text-xs font-bold rounded-xl transition-all shadow-sm min-h-[38px]"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Edit Draft
                      </button>
                    ) : (
                      <Link
                        href={`/dashboard/teacher/grading?examId=${exam.id}`}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-[#d4af37] to-[#b38f2a] hover:brightness-110 text-black text-xs font-black rounded-xl transition-all min-h-[38px]"
                      >
                        <Flag className="w-3.5 h-3.5" />
                        Grade
                      </Link>
                    )}
                    <button
                      onClick={() => void handleDelete(exam)}
                      disabled={deletingId === exam.id}
                      aria-label={`Delete ${exam.title}`}
                      className="p-2 rounded-xl text-[#9d9b95] hover:text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-40"
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
        <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-4 overflow-y-auto">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
            onClick={() => setComposerOpen(false)}
            aria-hidden
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="composer-title"
            className="relative w-full max-w-4xl my-2 sm:my-8 bg-[#0c0c0b] rounded-3xl shadow-2xl border border-white/[0.08] animate-fade-up z-10"
          >
            {/* Composer header */}
            <div className="sticky top-0 z-10 flex items-start justify-between px-4 sm:px-6 py-3.5 sm:py-5 bg-[#111110] border-b border-white/[0.08] rounded-t-3xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.25)] text-[#d4af37] flex items-center justify-center shrink-0">
                  <FilePlus2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 id="composer-title" className="text-base sm:text-lg font-bold text-[#f7f3e8]">
                    {editingExamId
                      ? draft.type === "ASSIGNMENT"
                        ? "Edit Assignment Draft"
                        : "Edit Exam Draft"
                      : draft.type === "ASSIGNMENT"
                        ? "Create Assignment"
                        : "Create Exam"}
                  </h2>
                  <p className="text-xs text-[#9d9b95] mt-0.5">
                    {questions.length} question{questions.length === 1 ? "" : "s"} · {draftPoints}{" "}
                    point{draftPoints === 1 ? "" : "s"}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setComposerOpen(false)}
                aria-label="Close"
                className="p-1.5 rounded-xl text-[#9d9b95] hover:text-[#f7f3e8] hover:bg-white/[0.06] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-3 sm:px-6 py-4 sm:py-5 space-y-4 sm:space-y-6">
              {/* Meta form */}
              <section className="bg-[#111110] rounded-2xl border border-white/[0.08] shadow-lg p-5 space-y-4">
                <h3 className="text-xs font-bold text-[#f7f3e8] uppercase tracking-wider">
                  Assessment Details
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="exam-title"
                      className="block text-xs font-semibold text-[#f7f3e8] mb-1.5"
                    >
                      Title <span className="text-[#d4af37]">*</span>
                    </label>
                    <input
                      id="exam-title"
                      type="text"
                      value={draft.title}
                      onChange={e => setDraft({ ...draft, title: e.target.value })}
                      placeholder="e.g. Thermodynamics — Mid-Term Assessment"
                      className="w-full px-3.5 py-2.5 bg-[#181817] border border-white/[0.08] rounded-xl text-sm text-[#f7f3e8] placeholder-[#9d9b95]/50 focus:border-[#d4af37] focus:outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="exam-type"
                      className="block text-xs font-semibold text-[#f7f3e8] mb-1.5"
                    >
                      Type
                    </label>
                    <select
                      id="exam-type"
                      value={draft.type}
                      onChange={e => {
                        const newType = e.target.value as "EXAM" | "ASSIGNMENT"
                        if (newType === "ASSIGNMENT") {
                          setDraft({
                            ...draft,
                            type: "ASSIGNMENT",
                            durationMins: 0,
                            forceFullscreen: false,
                            trackTabSwitches: false,
                            blockCopyPaste: false,
                            randomizeOrder: false,
                          })
                        } else {
                          setDraft({
                            ...draft,
                            type: "EXAM",
                            durationMins: draft.durationMins || 45,
                            forceFullscreen: true,
                            trackTabSwitches: true,
                            blockCopyPaste: true,
                            randomizeOrder: true,
                          })
                        }
                      }}
                      className="w-full px-3.5 py-2.5 bg-[#181817] border border-white/[0.08] rounded-xl text-sm text-[#f7f3e8] focus:border-[#d4af37] focus:outline-none transition-all cursor-pointer"
                    >
                      <option value="EXAM">Exam (timed & proctored)</option>
                      <option value="ASSIGNMENT">Assignment (homework / project submission)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="exam-description"
                    className="block text-xs font-semibold text-[#f7f3e8] mb-1.5"
                  >
                    Description & Guidelines
                  </label>
                  <textarea
                    id="exam-description"
                    value={draft.description}
                    onChange={e => setDraft({ ...draft, description: e.target.value })}
                    rows={2}
                    placeholder={
                      draft.type === "ASSIGNMENT"
                        ? "State the project objectives, deliverables, grading criteria, and instructions."
                        : "What does this paper cover? Students see this before they start."
                    }
                    className="w-full px-3.5 py-2.5 bg-[#181817] border border-white/[0.08] rounded-xl text-sm text-[#f7f3e8] placeholder-[#9d9b95]/50 resize-none focus:border-[#d4af37] focus:outline-none transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="exam-course"
                      className="block text-xs font-semibold text-[#f7f3e8] mb-1.5"
                    >
                      Target Course
                    </label>
                    <select
                      id="exam-course"
                      value={draft.courseId}
                      onChange={e => setDraft({ ...draft, courseId: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-[#181817] border border-white/[0.08] rounded-xl text-sm text-[#f7f3e8] focus:border-[#d4af37] focus:outline-none transition-all cursor-pointer"
                    >
                      <option value="">All my students (open assessment)</option>
                      {courses.map(course => (
                        <option key={course.id} value={course.id}>
                          {course.code} — {course.title} ({course.studentCount} enrolled)
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-[#9d9b95] mt-1.5 flex items-center gap-1">
                      <Users className="w-3 h-3 text-[#d4af37]" />
                      {selectedCourse
                        ? `${selectedCourse.studentCount} student${selectedCourse.studentCount === 1 ? "" : "s"} will be notified.`
                        : "Every student will be notified."}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {draft.type === "EXAM" ? (
                      <div>
                        <label
                          htmlFor="exam-duration"
                          className="block text-xs font-semibold text-[#f7f3e8] mb-1.5"
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
                          className="w-full px-3 py-2.5 bg-[#181817] border border-white/[0.08] rounded-xl text-sm font-bold text-[#f7f3e8] tabular-nums focus:border-[#d4af37] focus:outline-none transition-all"
                        />
                      </div>
                    ) : (
                      <div className="p-2.5 bg-[rgba(212,175,55,0.06)] border border-[rgba(212,175,55,0.2)] rounded-xl flex flex-col justify-center">
                        <span className="text-[11px] font-bold text-[#f5d77f] uppercase tracking-wide">
                          Untimed Assignment
                        </span>
                        <span className="text-xs text-[#9d9b95] mt-0.5">
                          Free submission without countdown clock.
                        </span>
                      </div>
                    )}
                    <div>
                      <label
                        htmlFor="exam-passing"
                        className="block text-xs font-semibold text-[#f7f3e8] mb-1.5"
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
                        className="w-full px-3 py-2.5 bg-[#181817] border border-white/[0.08] rounded-xl text-sm font-bold text-[#f7f3e8] tabular-nums focus:border-[#d4af37] focus:outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                {draft.type === "ASSIGNMENT" ? (
                  <div className="p-4 bg-[rgba(212,175,55,0.06)] border border-[rgba(212,175,55,0.2)] rounded-2xl space-y-3">
                    <div className="flex items-center gap-2">
                      <CalendarClock className="w-4 h-4 text-[#d4af37]" />
                      <span className="text-xs font-bold text-[#f7f3e8] uppercase tracking-wide">
                        Submission Deadline (Date & Time)
                      </span>
                      <span className="ml-auto text-[11px] font-bold text-black bg-[#d4af37] px-2 py-0.5 rounded-full">
                        Required
                      </span>
                    </div>
                    <p className="text-xs text-[#9d9b95]">
                      Students can prepare and submit their deliverables anytime before this cutoff.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label
                          htmlFor="exam-due-date"
                          className="block text-xs font-semibold text-[#f7f3e8] mb-1.5"
                        >
                          Submission Due Date <span className="text-[#d4af37]">*</span>
                        </label>
                        <input
                          id="exam-due-date"
                          type="date"
                          value={draft.dueDate}
                          onChange={e => setDraft({ ...draft, dueDate: e.target.value })}
                          className="w-full px-3 py-2 bg-[#181817] border border-white/[0.08] rounded-xl text-sm text-[#f7f3e8] focus:border-[#d4af37] focus:outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="exam-due-time"
                          className="block text-xs font-semibold text-[#f7f3e8] mb-1.5"
                        >
                          Submission Due Time <span className="text-[#d4af37]">*</span>
                        </label>
                        <input
                          id="exam-due-time"
                          type="time"
                          value={draft.dueTime}
                          onChange={e => setDraft({ ...draft, dueTime: e.target.value })}
                          className="w-full px-3 py-2 bg-[#181817] border border-white/[0.08] rounded-xl text-sm text-[#f7f3e8] focus:border-[#d4af37] focus:outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:max-w-md">
                    <div>
                      <label
                        htmlFor="exam-due-date"
                        className="block text-xs font-semibold text-[#f7f3e8] mb-1.5"
                      >
                        Due Date
                      </label>
                      <input
                        id="exam-due-date"
                        type="date"
                        value={draft.dueDate}
                        onChange={e => setDraft({ ...draft, dueDate: e.target.value })}
                        className="w-full px-3 py-2.5 bg-[#181817] border border-white/[0.08] rounded-xl text-sm text-[#f7f3e8] focus:border-[#d4af37] focus:outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="exam-due-time"
                        className="block text-xs font-semibold text-[#f7f3e8] mb-1.5"
                      >
                        Due Time
                      </label>
                      <input
                        id="exam-due-time"
                        type="time"
                        value={draft.dueTime}
                        onChange={e => setDraft({ ...draft, dueTime: e.target.value })}
                        className="w-full px-3 py-2.5 bg-[#181817] border border-white/[0.08] rounded-xl text-sm text-[#f7f3e8] focus:border-[#d4af37] focus:outline-none transition-all"
                      />
                    </div>
                  </div>
                )}
              </section>

              {/* Anti-cheat configuration */}
              {draft.type === "ASSIGNMENT" ? (
                <section className="bg-[#111110] rounded-2xl p-5 border border-white/[0.08]">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle2 className="w-4 h-4 text-[#d4af37]" />
                        <h3 className="text-xs font-bold text-[#f7f3e8] uppercase tracking-wider">
                          Assignment Format: Open-Book & Flexible
                        </h3>
                      </div>
                      <p className="text-xs text-[#9d9b95] max-w-xl">
                        Exam lockdown guards (fullscreen enforcement, tab tracking, and copy-paste blocking) are turned off for assignments so students can research and craft their responses freely.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAdvancedSecurity(prev => !prev)}
                      className="px-3.5 py-1.5 text-xs font-semibold text-[#f7f3e8] bg-[#181817] hover:bg-[#20201e] border border-white/[0.08] rounded-xl shrink-0 transition-colors"
                    >
                      {showAdvancedSecurity ? "Hide Lockdown Settings" : "Proctoring Options"}
                    </button>
                  </div>

                  {showAdvancedSecurity && (
                    <div className="mt-4 pt-4 border-t border-white/[0.06]">
                      <p className="text-xs font-semibold text-[#9d9b95] mb-3">
                        Optional Exam Proctoring Controls:
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
                              className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                                enabled
                                  ? "bg-[rgba(212,175,55,0.08)] border-[rgba(212,175,55,0.35)]"
                                  : "bg-[#181817] border-white/[0.06] hover:border-white/[0.12]"
                              }`}
                            >
                              <span
                                className={`w-5 h-5 rounded-md shrink-0 mt-0.5 flex items-center justify-center transition-colors ${
                                  enabled ? "bg-gradient-to-r from-[#d4af37] to-[#b38f2a] text-black" : "bg-white/10"
                                }`}
                              >
                                {enabled && <CheckCircle2 className="w-3.5 h-3.5 text-black" />}
                              </span>

                              <span className="min-w-0">
                                <span className="flex items-center gap-1.5 text-sm font-semibold text-[#f7f3e8]">
                                  <Icon className="w-3.5 h-3.5 text-[#d4af37]" />
                                  {toggle.label}
                                </span>
                                <span className="block text-xs text-[#9d9b95] mt-0.5">
                                  {toggle.hint}
                                </span>
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </section>
              ) : (
                <section className="bg-gradient-to-br from-[#141413] to-[#0e0e0d] rounded-2xl p-5 border border-[rgba(212,175,55,0.25)] shadow-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Lock className="w-4 h-4 text-[#d4af37]" />
                    <h3 className="text-xs font-bold text-[#f7f3e8] uppercase tracking-wider">
                      Anti-Cheating Proctoring Configuration
                    </h3>
                  </div>
                  <p className="text-xs text-[#9d9b95] mb-4">
                    Enforced in browser and re-verified on server at submit time.
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
                          className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                            enabled
                              ? "bg-[rgba(212,175,55,0.12)] border-[rgba(212,175,55,0.35)]"
                              : "bg-[#181817] border-white/[0.06] hover:bg-white/[0.08]"
                          }`}
                        >
                          <span
                            className={`w-5 h-5 rounded-md shrink-0 mt-0.5 flex items-center justify-center transition-colors ${
                              enabled ? "bg-gradient-to-r from-[#d4af37] to-[#b38f2a] text-black" : "bg-white/10"
                            }`}
                          >
                            {enabled && <CheckCircle2 className="w-3.5 h-3.5 text-black" />}
                          </span>

                          <span className="min-w-0">
                            <span className="flex items-center gap-1.5 text-sm font-semibold text-[#f7f3e8]">
                              <Icon className="w-3.5 h-3.5 text-[#d4af37]" />
                              {toggle.label}
                            </span>
                            <span className="block text-xs text-[#9d9b95] mt-0.5">
                              {toggle.hint}
                            </span>
                          </span>
                        </button>
                      )
                    })}
                  </div>

                  {draft.trackTabSwitches && (
                    <div className="flex items-center gap-3 mt-3 px-3.5 py-2.5 bg-[#181817] border border-white/[0.08] rounded-xl">
                      <label
                        htmlFor="max-switches"
                        className="text-xs text-[#9d9b95] font-semibold"
                      >
                        Flag paper after
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
                        className="w-20 px-2.5 py-1 bg-[#111110] border border-white/[0.1] rounded-lg text-sm text-[#f7f3e8] font-bold tabular-nums text-center focus:border-[#d4af37] focus:outline-none"
                      />
                      <span className="text-xs text-[#9d9b95]">tab switches</span>
                    </div>
                  )}
                </section>
              )}

              {/* Question builder */}
              <ExamBuilder
                questions={questions}
                onChange={setQuestions}
                assessmentType={draft.type}
              />

              {formError && (
                <div className="flex items-start gap-2 px-3.5 py-2.5 bg-rose-950/30 border border-rose-500/30 rounded-xl text-sm text-rose-300">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  {formError}
                </div>
              )}
            </div>

            {/* Composer footer */}
            <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-2.5 px-4 sm:px-6 py-3.5 sm:py-4 bg-[#111110] border-t border-white/[0.08] rounded-b-3xl">
              <button
                type="button"
                onClick={() => setComposerOpen(false)}
                className="px-4 py-2 text-xs sm:text-sm font-semibold text-[#9d9b95] hover:text-[#f7f3e8] hover:bg-white/[0.06] rounded-xl transition-colors min-h-[40px]"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handlePublish(false)}
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm bg-[#181817] border border-white/[0.08] hover:bg-white/[0.08] text-[#f7f3e8] font-semibold rounded-xl transition-colors disabled:opacity-50 min-h-[40px]"
                >
                  <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#d4af37]" />
                  Save Draft
                </button>

                <button
                  type="button"
                  onClick={() => void handlePublish(true)}
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2 text-xs sm:text-sm bg-gradient-to-r from-[#d4af37] to-[#b38f2a] hover:brightness-110 text-black font-extrabold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[rgba(212,175,55,0.15)] min-h-[40px]"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin text-black" />
                      Publishing...
                    </>
                  ) : (
                    <>
                      <FilePlus2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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
