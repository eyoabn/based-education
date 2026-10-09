"use client"

import { useEffect, useState } from "react"
import { AlertCircle, CalendarPlus, Loader2, X } from "lucide-react"
import { localTimeZone, type CalendarEvent } from "@/lib/calendar"

interface CourseOption {
  id: string
  title: string
  code: string
  studentCount: number
}

interface ScheduleModalProps {
  open: boolean
  onClose: () => void
  /** Called with the created event so the calendar can insert it immediately. */
  onCreated: (event: CalendarEvent, notifiedCount: number) => void
  /** Pre-fill the date when opened from a calendar cell. */
  defaultDate?: Date | null
}

/** `Date` -> `"2026-08-03"` in local time (not UTC, which `toISOString` gives). */
function toDateInput(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

/** Rounds up to the next half hour so the default start isn't in the past. */
function defaultStartTime(): string {
  const d = new Date()
  d.setMinutes(d.getMinutes() > 30 ? 60 : 30, 0, 0)
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

function addHour(time: string): string {
  const [h, m] = time.split(":").map(Number)
  const d = new Date()
  d.setHours(h + 1, m, 0, 0)
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

export default function ScheduleModal({
  open,
  onClose,
  onCreated,
  defaultDate,
}: ScheduleModalProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [date, setDate] = useState(() => toDateInput(new Date()))
  const [startTime, setStartTime] = useState(defaultStartTime)
  const [endTime, setEndTime] = useState(() => addHour(defaultStartTime()))
  const [courseId, setCourseId] = useState("")

  const [courses, setCourses] = useState<CourseOption[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const timeZone = localTimeZone()

  // Reset the form each time the modal opens.
  useEffect(() => {
    if (!open) return
    const seed = defaultDate ?? new Date()
    setTitle("")
    setDescription("")
    setDate(toDateInput(seed))
    const start = defaultStartTime()
    setStartTime(start)
    setEndTime(addHour(start))
    setCourseId("")
    setError(null)
  }, [open, defaultDate])

  // Load the teacher's courses for the target picker.
  useEffect(() => {
    if (!open) return
    let cancelled = false

    fetch("/api/courses")
      .then(res => res.json())
      .then((data: { courses?: CourseOption[] }) => {
        if (!cancelled) setCourses(data.courses ?? [])
      })
      .catch(() => {
        // Non-fatal: the class can still be scheduled for all students.
      })

    return () => {
      cancelled = true
    }
  }, [open])

  // Close on Escape.
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [open, onClose])

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!title.trim()) {
      setError("Give the class a title.")
      return
    }

    // `new Date("2026-08-03T09:30")` is parsed in the browser's local zone,
    // then serialised to UTC — the conversion students' calendars rely on.
    const startsAt = new Date(`${date}T${startTime}`)
    const endsAt = endTime ? new Date(`${date}T${endTime}`) : null

    if (Number.isNaN(startsAt.getTime())) {
      setError("Pick a valid date and start time.")
      return
    }
    if (endsAt && endsAt <= startsAt) {
      setError("The end time must be after the start time.")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          startsAt: startsAt.toISOString(),
          endsAt: endsAt ? endsAt.toISOString() : null,
          courseId: courseId || null,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Could not schedule the class.")
        return
      }

      onCreated(data.event as CalendarEvent, data.notifiedCount ?? 0)
      onClose()
    } catch {
      setError("Network error — please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const selectedCourse = courses.find(c => c.id === courseId)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-md"
        onClick={onClose}
        aria-hidden
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="schedule-modal-title"
        className="relative w-full max-w-lg bg-[#111110] rounded-2xl shadow-2xl border border-white/[0.1] animate-fade-up max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-start justify-between px-4 py-4 sm:px-6 sm:py-5 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[rgba(212,175,55,0.15)] text-[#d4af37] border border-[rgba(212,175,55,0.25)] flex items-center justify-center shrink-0">
              <CalendarPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 id="schedule-modal-title" className="text-base sm:text-lg font-bold text-[#f7f3e8] leading-snug">
                Schedule New Live Class
              </h2>
              <p className="text-xs text-[#9d9b95] mt-0.5">
                Times are in your local zone ({timeZone})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-lg text-[#9d9b95] hover:text-[#f7f3e8] hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-4 py-4 sm:px-6 sm:py-5 space-y-4">
          {/* Title */}
          <div>
            <label htmlFor="class-title" className="block text-xs font-semibold text-[#f7f3e8] mb-1.5">
              Class Title <span className="text-rose-400">*</span>
            </label>
            <input
              id="class-title"
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Advanced Thermodynamics — Core Principles"
              autoFocus
              className="w-full px-3.5 py-2.5 bg-[#181817] border border-white/[0.08] rounded-xl text-sm text-[#f7f3e8] placeholder:text-[#9d9b95]/50 focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] focus:outline-none transition-shadow"
            />
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="class-description"
              className="block text-xs font-semibold text-[#f7f3e8] mb-1.5"
            >
              Description
            </label>
            <textarea
              id="class-description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="What will you cover? Students see this on their calendar."
              className="w-full px-3.5 py-2.5 bg-[#181817] border border-white/[0.08] rounded-xl text-sm text-[#f7f3e8] placeholder:text-[#9d9b95]/50 resize-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] focus:outline-none transition-shadow"
            />
          </div>

          {/* Date + times */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="class-date" className="block text-xs font-semibold text-[#f7f3e8] mb-1.5">
                Date <span className="text-rose-400">*</span>
              </label>
              <input
                id="class-date"
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#181817] border border-white/[0.08] rounded-xl text-sm text-[#f7f3e8] focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] focus:outline-none transition-shadow"
              />
            </div>
            <div>
              <label htmlFor="start-time" className="block text-xs font-semibold text-[#f7f3e8] mb-1.5">
                Start <span className="text-rose-400">*</span>
              </label>
              <input
                id="start-time"
                type="time"
                value={startTime}
                onChange={e => {
                  setStartTime(e.target.value)
                  if (e.target.value) setEndTime(addHour(e.target.value))
                }}
                className="w-full px-3 py-2.5 bg-[#181817] border border-white/[0.08] rounded-xl text-sm text-[#f7f3e8] focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] focus:outline-none transition-shadow"
              />
            </div>
            <div>
              <label htmlFor="end-time" className="block text-xs font-semibold text-[#f7f3e8] mb-1.5">
                End
              </label>
              <input
                id="end-time"
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#181817] border border-white/[0.08] rounded-xl text-sm text-[#f7f3e8] focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] focus:outline-none transition-shadow"
              />
            </div>
          </div>

          {/* Target course */}
          <div>
            <label htmlFor="target-course" className="block text-xs font-semibold text-[#f7f3e8] mb-1.5">
              Target Course
            </label>
            <select
              id="target-course"
              value={courseId}
              onChange={e => setCourseId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#181817] border border-white/[0.08] rounded-xl text-sm text-[#f7f3e8] focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] focus:outline-none transition-shadow cursor-pointer"
            >
              <option value="" className="bg-[#181817] text-[#f7f3e8]">All my students (open class)</option>
              {courses.map(course => (
                <option key={course.id} value={course.id} className="bg-[#181817] text-[#f7f3e8]">
                  {course.code} — {course.title} ({course.studentCount} enrolled)
                </option>
              ))}
            </select>
            <p className="text-xs text-[#9d9b95] mt-1.5">
              {selectedCourse
                ? `${selectedCourse.studentCount} student${selectedCourse.studentCount === 1 ? "" : "s"} will be notified.`
                : "Every student will be notified when this class is scheduled."}
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 px-3.5 py-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-sm text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 text-sm font-semibold text-[#9d9b95] hover:text-[#f7f3e8] hover:bg-white/[0.06] rounded-xl transition-colors text-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#d4af37] to-[#e6ca65] hover:brightness-110 text-[#050505] text-sm font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[rgba(212,175,55,0.2)]"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Scheduling...
                </>
              ) : (
                <>
                  <CalendarPlus className="w-4 h-4" />
                  Schedule Class
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
