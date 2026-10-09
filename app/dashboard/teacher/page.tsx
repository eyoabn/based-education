"use client"

import { useEffect, useState } from "react"
import { BookOpen, Users, Plus, Lock, Unlock, Check, X, Radio, Image as ImageIcon, ShieldCheck, MessageSquare, AlertCircle, Loader2, Trash2, Edit, UserX, MoreVertical } from "lucide-react"
import Link from "next/link"

interface Course {
  id: string
  title: string
  code: string
  description: string | null
  logoUrl: string | null
  accessMode: "PUBLIC" | "PERMISSION_REQUIRED"
  studentCount: number
  requestCount: number
  createdAt: string
  pendingRequests?: JoinRequest[]
}

interface JoinRequest {
  id: string
  courseId: string
  studentId: string
  status: "PENDING" | "APPROVED" | "REJECTED"
  createdAt: string
  student: {
    id: string
    name: string
    email: string
    avatarUrl: string | null
  }
}

export default function TeacherDashboardPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [requestsMap, setRequestsMap] = useState<Record<string, JoinRequest[]>>({})
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Course Management State
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)
  const [managingStudentsCourse, setManagingStudentsCourse] = useState<Course | null>(null)
  const [courseStudents, setCourseStudents] = useState<any[]>([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [activeMenuCourseId, setActiveMenuCourseId] = useState<string | null>(null)
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null)

  // Form State
  const [title, setTitle] = useState("")
  const [code, setCode] = useState("")
  const [description, setDescription] = useState("")
  const [logoUrl, setLogoUrl] = useState("")
  const [accessMode, setAccessMode] = useState<"PUBLIC" | "PERMISSION_REQUIRED">("PUBLIC")
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  useEffect(() => {
    fetchTeacherData()
  }, [])

  async function fetchTeacherData() {
    try {
      const res = await fetch("/api/courses?scope=my", { cache: "no-store" })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data?.courses)) {
          setCourses(data.courses)
          
          // Instant one-shot request map population
          const map: Record<string, JoinRequest[]> = {}
          const needParallelFetch: Course[] = []
          for (const c of data.courses) {
            if (Array.isArray(c.pendingRequests)) {
              map[c.id] = c.pendingRequests
            } else if (c.accessMode === "PERMISSION_REQUIRED") {
              needParallelFetch.push(c)
            }
          }
          setRequestsMap(map)

          // Fallback parallel fetch if needed
          if (needParallelFetch.length > 0) {
            Promise.all(
              needParallelFetch.map(c =>
                fetch(`/api/courses/${c.id}/requests`, { cache: "no-store" })
                  .then(r => r.ok ? r.json() : { requests: [] })
                  .then(reqData => ({ courseId: c.id, requests: reqData.requests || [] }))
                  .catch(() => ({ courseId: c.id, requests: [] }))
              )
            ).then(results => {
              setRequestsMap(prev => {
                const next = { ...prev }
                for (const r of results) {
                  next[r.courseId] = r.requests
                }
                return next
              })
            })
          }
        }
      }
    } catch (err) {
      console.error("Failed to load teacher dashboard", err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setError("Course title is required")
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          code,
          description,
          logoUrl,
          accessMode,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setSuccessMsg(`Course "${data.course.title}" created successfully!`)
        setIsModalOpen(false)
        setTitle("")
        setCode("")
        setDescription("")
        setLogoUrl("")
        setAccessMode("PUBLIC")
        fetchTeacherData()
      } else {
        setError(data.error || "Failed to create course")
      }
    } catch {
      setError("An unexpected error occurred")
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdateCourse = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCourse) return
    if (!title.trim()) {
      setError("Course title is required")
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/courses/${editingCourse.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          logoUrl,
          accessMode,
        }),
      })

      if (res.ok) {
        setSuccessMsg("Course updated successfully!")
        setEditingCourse(null)
        fetchTeacherData()
      } else {
        const data = await res.json()
        setError(data.error || "Failed to update course")
      }
    } catch {
      setError("An unexpected error occurred")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm("Are you sure you want to delete this course? This action cannot be undone.")) return
    
    try {
      const res = await fetch(`/api/courses/${courseId}`, {
        method: "DELETE",
      })
      if (res.ok) {
        setSuccessMsg("Course deleted successfully!")
        fetchTeacherData()
      } else {
        const data = await res.json()
        alert(data.error || "Failed to delete course")
      }
    } catch {
      alert("Failed to delete course")
    }
  }

  const openManageStudents = async (course: Course) => {
    setManagingStudentsCourse(course)
    setLoadingStudents(true)
    try {
      const res = await fetch(`/api/courses/${course.id}/students`)
      if (res.ok) {
        const data = await res.json()
        setCourseStudents(data.students || [])
      }
    } catch {
      alert("Failed to fetch students")
    } finally {
      setLoadingStudents(false)
    }
  }

  const handleRemoveStudent = async (studentId: string) => {
    if (!managingStudentsCourse) return
    if (!confirm("Are you sure you want to remove this student from the course?")) return

    try {
      const res = await fetch(`/api/courses/${managingStudentsCourse.id}/students/${studentId}`, {
        method: "DELETE",
      })
      if (res.ok) {
        setCourseStudents(prev => prev.filter(s => s.id !== studentId))
        setSuccessMsg("Student removed successfully")
        fetchTeacherData()
      } else {
        alert("Failed to remove student")
      }
    } catch {
      alert("An error occurred")
    }
  }

  const openEditCourse = (course: Course) => {
    setEditingCourse(course)
    setTitle(course.title)
    setCode(course.code)
    setDescription(course.description || "")
    setLogoUrl(course.logoUrl || "")
    setAccessMode(course.accessMode)
    setError(null)
  }

  const handleApproveOrReject = async (courseId: string, requestId: string, status: "APPROVED" | "REJECTED") => {
    // Prevent double-click: if already processing this request, bail out immediately
    if (processingRequestId === requestId) return
    setProcessingRequestId(requestId)
    try {
      const res = await fetch(`/api/courses/${courseId}/requests`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, status }),
      })
      if (res.ok) {
        const data = await res.json()
        if (!data.alreadyProcessed) {
          setSuccessMsg(`Request ${status.toLowerCase()} successfully!`)
        }
        // Optimistically remove from UI immediately without waiting for full refetch
        setRequestsMap(prev => {
          const next = { ...prev }
          if (next[courseId]) {
            next[courseId] = next[courseId].filter(r => r.id !== requestId)
          }
          return next
        })
        fetchTeacherData()
      } else {
        const data = await res.json()
        setSuccessMsg(null)
        setError(data.error || "Failed to process request")
      }
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setProcessingRequestId(null)
    }
  }

  const [courseFilterTab, setCourseFilterTab] = useState<"all" | "public" | "permission">("all")

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Good morning"
    if (hour < 18) return "Good afternoon"
    return "Good evening"
  }

  const currentDateFormatted = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  })

  const totalStudents = courses.reduce((acc, c) => acc + c.studentCount, 0)
  const pendingRequestsCount = Object.values(requestsMap).reduce((acc, reqs) => acc + reqs.length, 0)

  const filteredTeacherCourses = courses.filter(c => {
    if (courseFilterTab === "public") return c.accessMode === "PUBLIC"
    if (courseFilterTab === "permission") return c.accessMode === "PERMISSION_REQUIRED"
    return true
  })

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 sm:space-y-8">
      {/* Top Banner with Humanized Greeting */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#181817] via-[#111110] to-[#0a0a09] border border-white/[0.08] rounded-2xl sm:rounded-3xl p-6 md:p-8 text-[#f7f3e8] shadow-[0_20px_50px_rgba(0,0,0,0.6)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.08),transparent_70%)] pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.06] border border-white/[0.08] text-[#d4af37] text-xs font-semibold mb-3">
            <ShieldCheck className="w-3.5 h-3.5 text-[#d4af37]" />
            <span>{currentDateFormatted}</span>
            <span className="opacity-40">•</span>
            <span>Faculty Console</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#f7f3e8]">
            {getGreeting()}, Instructor! 👋
          </h1>
          <p className="text-[#9d9b95] text-xs sm:text-sm mt-1 max-w-xl leading-relaxed">
            Welcome to your teaching headquarters. Create new courses, review student admission requests, and broadcast interactive live classes.
          </p>
        </div>
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 sm:gap-3 relative z-10">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex-1 sm:flex-initial px-4 sm:px-5 py-2.5 sm:py-3 bg-gradient-to-r from-[#d4af37] to-[#e6ca65] hover:opacity-95 active:scale-95 text-black font-bold text-xs sm:text-sm rounded-xl shadow-[0_0_20px_rgba(212,175,55,0.3)] transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5 text-black" /> Add Course
          </button>
          <Link
            href="/dashboard/teacher/live/MainStudio"
            className="flex-1 sm:flex-initial px-4 sm:px-5 py-2.5 sm:py-3 bg-red-600/90 hover:bg-red-600 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-xl shadow-[0_0_20px_rgba(239,68,68,0.3)] transition-all flex items-center justify-center gap-2"
          >
            <Radio className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" /> Live Studio
          </Link>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl text-sm font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 flex justify-between items-center">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-xs underline ml-4 hover:opacity-80">
            Dismiss
          </button>
        </div>
      )}

      {/* Humanized Stats Cards with Contextual Subtitles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-[#111110] rounded-2xl border border-white/[0.08] p-5 sm:p-6 shadow-[0_10px_30px_rgba(0,0,0,0.4)] hover:-translate-y-0.5 hover:border-[rgba(212,175,55,0.3)] transition-all">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-xs uppercase tracking-wider text-[#9d9b95]">My Active Courses</h3>
            <div className="w-10 h-10 rounded-xl bg-[rgba(212,175,55,0.12)] border border-[rgba(212,175,55,0.25)] flex items-center justify-center text-[#d4af37]">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-[#f7f3e8]">{courses.length}</div>
          <p className="text-xs text-[#9d9b95] mt-1">Courses created by you</p>
        </div>

        <div className="bg-[#111110] rounded-2xl border border-white/[0.08] p-5 sm:p-6 shadow-[0_10px_30px_rgba(0,0,0,0.4)] hover:-translate-y-0.5 hover:border-[rgba(212,175,55,0.3)] transition-all">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-xs uppercase tracking-wider text-[#9d9b95]">Enrolled Students</h3>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-[#f7f3e8]">{totalStudents}</div>
          <p className="text-xs text-[#9d9b95] mt-1">Total learners in your courses</p>
        </div>

        <div className="bg-[#111110] rounded-2xl border border-white/[0.08] p-5 sm:p-6 shadow-[0_10px_30px_rgba(0,0,0,0.4)] hover:-translate-y-0.5 hover:border-[rgba(212,175,55,0.3)] transition-all">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-xs uppercase tracking-wider text-[#9d9b95]">Pending Requests</h3>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Lock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-[#f7f3e8]">{pendingRequestsCount}</div>
          <p className="text-xs text-[#9d9b95] mt-1">Awaiting your approval</p>
        </div>
      </div>

      {/* Pending Student Requests Approval Section */}
      {pendingRequestsCount > 0 && (
        <div className="bg-amber-500/5 rounded-2xl sm:rounded-3xl border border-amber-500/20 p-4 sm:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-amber-400" />
            <h2 className="text-base sm:text-lg font-bold text-amber-300">Pending Student Admission Requests</h2>
          </div>
          <div className="divide-y divide-white/[0.06] bg-[#111110] rounded-2xl border border-white/[0.08] overflow-hidden shadow-xs">
            {Object.entries(requestsMap).map(([courseId, reqs]) => {
              const course = courses.find(c => c.id === courseId)
              if (!course || reqs.length === 0) return null
              return reqs.map(req => (
                <div key={req.id} className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#181817] transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-[#181817] border border-[rgba(212,175,55,0.3)] text-[#d4af37] font-bold text-xs flex items-center justify-center shrink-0">
                      {req.student.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[#f7f3e8] truncate">{req.student.name}</p>
                      <p className="text-xs text-[#9d9b95] truncate">
                        Requesting admission to <span className="font-semibold text-[#d4af37]">{course.title}</span> ({course.code})
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 w-full sm:w-auto">
                    <button
                      onClick={() => handleApproveOrReject(courseId, req.id, "APPROVED")}
                      disabled={processingRequestId === req.id}
                      className="flex-1 sm:flex-initial justify-center px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 disabled:cursor-not-allowed active:scale-95 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-all min-h-[38px]"
                    >
                      {processingRequestId === req.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      {processingRequestId === req.id ? "Processing..." : "Approve"}
                    </button>
                    <button
                      onClick={() => handleApproveOrReject(courseId, req.id, "REJECTED")}
                      disabled={processingRequestId === req.id}
                      className="flex-1 sm:flex-initial justify-center px-4 py-2 bg-red-600 hover:bg-red-500 disabled:bg-red-800 disabled:cursor-not-allowed active:scale-95 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-all min-h-[38px]"
                    >
                      {processingRequestId === req.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <X className="w-3.5 h-3.5" />
                      )}
                      {processingRequestId === req.id ? "" : "Decline"}
                    </button>
                  </div>
                </div>
              ))
            })}
          </div>
        </div>
      )}

      {/* Courses Created by Teacher */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-[#f7f3e8]">Your Courses</h2>
            <p className="text-[#9d9b95] text-xs sm:text-sm">Manage curriculum, enrollment policies, and student rosters.</p>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            {/* Filter pills */}
            <button
              onClick={() => setCourseFilterTab("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 active:scale-95 ${
                courseFilterTab === "all"
                  ? "bg-gradient-to-r from-[rgba(212,175,55,0.2)] to-[rgba(212,175,55,0.08)] text-[#f7f3e8] border border-[rgba(212,175,55,0.35)] shadow-[0_0_12px_rgba(212,175,55,0.15)]"
                  : "bg-[#111110] border border-white/[0.08] text-[#9d9b95] hover:text-[#f7f3e8] hover:bg-[#181817]"
              }`}
            >
              All ({courses.length})
            </button>
            <button
              onClick={() => setCourseFilterTab("public")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 active:scale-95 ${
                courseFilterTab === "public"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                  : "bg-[#111110] border border-white/[0.08] text-[#9d9b95] hover:text-[#f7f3e8] hover:bg-[#181817]"
              }`}
            >
              Public ({courses.filter(c => c.accessMode === "PUBLIC").length})
            </button>
            <button
              onClick={() => setCourseFilterTab("permission")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 active:scale-95 ${
                courseFilterTab === "permission"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.15)]"
                  : "bg-[#111110] border border-white/[0.08] text-[#9d9b95] hover:text-[#f7f3e8] hover:bg-[#181817]"
              }`}
            >
              Restricted ({courses.filter(c => c.accessMode === "PERMISSION_REQUIRED").length})
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-3.5 py-1.5 bg-gradient-to-r from-[#d4af37] to-[#e6ca65] hover:opacity-95 active:scale-95 text-black font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-[0_0_15px_rgba(212,175,55,0.25)] transition-all shrink-0"
            >
              <Plus className="w-3.5 h-3.5 text-black" /> Add Course
            </button>
          </div>
        </div>

        {loading ? (
          <div className="bg-[#111110] p-12 rounded-2xl border border-white/[0.08] text-center text-[#9d9b95]">
            Loading your courses...
          </div>
        ) : filteredTeacherCourses.length === 0 ? (
          <div className="bg-[#111110] p-12 rounded-2xl border border-white/[0.08] text-center space-y-3">
            <BookOpen className="w-12 h-12 text-[#9d9b95]/40 mx-auto" />
            <h3 className="font-bold text-[#f7f3e8] text-lg">No Courses Found</h3>
            <p className="text-[#9d9b95] text-sm max-w-md mx-auto">
              {courseFilterTab === "all"
                ? "You haven't created any courses yet. Click 'Add Course' to publish your first classroom."
                : "No courses match the active filter."}
            </p>
            {courseFilterTab === "all" && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-5 py-2.5 bg-gradient-to-r from-[#d4af37] to-[#e6ca65] hover:opacity-95 active:scale-95 text-black font-bold text-sm rounded-xl inline-flex items-center gap-2 shadow-[0_0_15px_rgba(212,175,55,0.25)] transition-all"
              >
                <Plus className="w-4 h-4 text-black" /> Create First Course
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredTeacherCourses.map(course => (
              <div
                key={course.id}
                className="bg-[#111110] rounded-2xl border border-white/[0.08] overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.5)] hover:border-[rgba(212,175,55,0.3)] hover:shadow-[0_15px_40px_rgba(0,0,0,0.7)] transition-all"
              >
                <div className="h-32 bg-[#0a0a09] border-b border-white/[0.06] relative flex items-center justify-center p-4">
                  {course.logoUrl ? (
                    <img src={course.logoUrl} alt={course.title} className="w-full h-full object-cover opacity-80" />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-[rgba(212,175,55,0.15)] border border-[rgba(212,175,55,0.3)] flex items-center justify-center text-[#d4af37] font-extrabold text-2xl shadow-inner">
                      {course.title.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="absolute top-3 right-3">
                    {course.accessMode === "PUBLIC" ? (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-semibold flex items-center gap-1 backdrop-blur-sm">
                        <Unlock className="w-3 h-3" /> Public
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30 text-xs font-semibold flex items-center gap-1 backdrop-blur-sm">
                        <Lock className="w-3 h-3" /> Permission Required
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 bg-[#181817] border border-white/[0.08] text-[#d4af37] rounded">
                      {course.code}
                    </span>
                    <span className="text-xs font-semibold text-[#9d9b95] flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-[#d4af37]" />
                      {course.studentCount} Students
                    </span>
                  </div>

                  <h3 className="font-bold text-[#f7f3e8] text-base leading-snug">{course.title}</h3>
                  <p className="text-xs text-[#9d9b95] line-clamp-2 leading-relaxed">
                    {course.description || "No description provided."}
                  </p>

                  <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs">
                    <Link
                      href="/dashboard/teacher/messages"
                      className="text-[#d4af37] hover:text-[#f7f3e8] font-bold flex items-center gap-1 transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> Class Chat
                    </Link>
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/dashboard/teacher/feed`}
                        className="text-[#9d9b95] hover:text-[#f7f3e8] font-bold"
                      >
                        Feed →
                      </Link>
                      <Link
                        href={`/dashboard/teacher/courses/${course.id}/materials`}
                        className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1"
                      >
                        <BookOpen className="w-3.5 h-3.5" /> Materials
                      </Link>
                      <Link
                        href={`/dashboard/teacher/live/${encodeURIComponent(course.title)}`}
                        className="text-red-400 hover:text-red-300 font-bold flex items-center gap-1"
                      >
                        <Radio className="w-3.5 h-3.5" /> Start Stream
                      </Link>
                    </div>
                  </div>
                  
                  {/* Teacher Management Controls */}
                  <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/[0.06]">
                    <button
                      onClick={() => openManageStudents(course)}
                      className="p-1.5 text-[#9d9b95] hover:text-[#d4af37] hover:bg-white/[0.06] rounded transition-colors"
                      title="Manage Students"
                    >
                      <Users className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openEditCourse(course)}
                      className="p-1.5 text-[#9d9b95] hover:text-[#d4af37] hover:bg-white/[0.06] rounded transition-colors"
                      title="Edit Course"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteCourse(course.id)}
                      className="p-1.5 text-[#9d9b95] hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                      title="Delete Course"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Course Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#0e0e13] border border-primary/30 rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-[0_25px_60px_rgba(0,0,0,0.9)] animate-in zoom-in-95 duration-200 text-white overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/10 p-6 pb-4 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
                  <BookOpen className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">Create New Course</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Define your curriculum, logo and enrollment mode.</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-6 pt-4 space-y-4 flex-1">
              {error && (
                <div className="p-3.5 bg-red-950/50 border border-red-500/30 text-red-200 text-xs font-semibold rounded-xl flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{error}</span>
                </div>
              )}

              <form id="create-course-form" onSubmit={handleCreateCourse} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Course Name <span className="text-primary">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Advanced Sacred Geometry & Principles"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#17171e] border border-white/15 text-white placeholder:text-slate-500 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Course Code <span className="text-slate-500 font-normal normal-case">(Optional — auto-generated if blank)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. CRS-101"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#17171e] border border-white/15 text-white placeholder:text-slate-500 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none transition-all uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Course Logo URL <span className="text-slate-500 font-normal normal-case">(Optional)</span>
                </label>
                <div className="relative">
                  <ImageIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    placeholder="https://example.com/logo.png"
                    value={logoUrl}
                    onChange={e => setLogoUrl(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#17171e] border border-white/15 text-white placeholder:text-slate-500 rounded-xl text-sm focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Briefly describe what students will explore in this course..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#17171e] border border-white/15 text-white placeholder:text-slate-500 rounded-xl text-sm resize-none focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Student Join Permission Mode
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setAccessMode("PUBLIC")}
                    className={`p-3.5 rounded-xl border text-left flex flex-col gap-1.5 transition-all ${
                      accessMode === "PUBLIC"
                        ? "border-emerald-500/60 bg-emerald-950/40 text-emerald-200 ring-2 ring-emerald-500/30 shadow-md"
                        : "border-white/10 bg-[#17171e] text-slate-400 hover:text-white hover:border-white/20"
                    }`}
                  >
                    <span className="font-bold text-xs flex items-center gap-1.5">
                      <Unlock className="w-3.5 h-3.5 text-emerald-400" /> Public (Open)
                    </span>
                    <span className="text-[11px] text-slate-400 leading-tight">
                      Any student can join instantly without requiring approval.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAccessMode("PERMISSION_REQUIRED")}
                    className={`p-3.5 rounded-xl border text-left flex flex-col gap-1.5 transition-all ${
                      accessMode === "PERMISSION_REQUIRED"
                        ? "border-amber-500/60 bg-amber-950/40 text-amber-200 ring-2 ring-amber-500/30 shadow-md"
                        : "border-white/10 bg-[#17171e] text-slate-400 hover:text-white hover:border-white/20"
                    }`}
                  >
                    <span className="font-bold text-xs flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-400" /> Restricted
                    </span>
                    <span className="text-[11px] text-slate-400 leading-tight">
                      Students must request access; you approve or decline.
                    </span>
                  </button>
                </div>
              </div>

              </form>
            </div>

            <div className="p-5 border-t border-white/10 flex items-center justify-end gap-3 shrink-0 bg-[#0a0a0f]">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="create-course-form"
                disabled={submitting}
                className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-black font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {submitting ? "Publishing Course..." : "Publish Course"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Edit Course Modal */}
      {editingCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#0e0e13] border border-indigo-500/30 rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-[0_25px_60px_rgba(0,0,0,0.9)] animate-in zoom-in-95 duration-200 text-white overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/10 p-6 pb-4 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Edit className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">Edit Course</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Update course details.</p>
                </div>
              </div>
              <button
                onClick={() => setEditingCourse(null)}
                className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-6 pt-4 space-y-4 flex-1">
              {error && (
                <div className="p-3.5 bg-red-950/50 border border-red-500/30 text-red-200 text-xs font-semibold rounded-xl flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{error}</span>
                </div>
              )}

              <form id="edit-course-form" onSubmit={handleUpdateCourse} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Course Name <span className="text-indigo-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#17171e] border border-white/15 text-white placeholder:text-slate-500 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Course Logo URL <span className="text-slate-500 font-normal normal-case">(Optional)</span>
                  </label>
                  <div className="relative">
                    <ImageIcon className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="url"
                      value={logoUrl}
                      onChange={e => setLogoUrl(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-[#17171e] border border-white/15 text-white placeholder:text-slate-500 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#17171e] border border-white/15 text-white placeholder:text-slate-500 rounded-xl text-sm resize-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Student Join Permission Mode
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setAccessMode("PUBLIC")}
                      className={`p-3.5 rounded-xl border text-left flex flex-col gap-1.5 transition-all ${
                        accessMode === "PUBLIC"
                          ? "border-emerald-500/60 bg-emerald-950/40 text-emerald-200 ring-2 ring-emerald-500/30 shadow-md"
                          : "border-white/10 bg-[#17171e] text-slate-400 hover:text-white hover:border-white/20"
                      }`}
                    >
                      <span className="font-bold text-xs flex items-center gap-1.5">
                        <Unlock className="w-3.5 h-3.5 text-emerald-400" /> Public (Open)
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAccessMode("PERMISSION_REQUIRED")}
                      className={`p-3.5 rounded-xl border text-left flex flex-col gap-1.5 transition-all ${
                        accessMode === "PERMISSION_REQUIRED"
                          ? "border-amber-500/60 bg-amber-950/40 text-amber-200 ring-2 ring-amber-500/30 shadow-md"
                          : "border-white/10 bg-[#17171e] text-slate-400 hover:text-white hover:border-white/20"
                      }`}
                    >
                      <span className="font-bold text-xs flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-amber-400" /> Restricted
                      </span>
                    </button>
                  </div>
                </div>
              </form>
            </div>

            <div className="p-5 border-t border-white/10 flex items-center justify-end gap-3 shrink-0 bg-[#0a0a0f]">
              <button
                type="button"
                onClick={() => setEditingCourse(null)}
                className="px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="edit-course-form"
                disabled={submitting}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Students Modal */}
      {managingStudentsCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 p-6 pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight">Manage Students</h2>
                  <p className="text-sm text-slate-500 mt-0.5">{managingStudentsCourse.title}</p>
                </div>
              </div>
              <button
                onClick={() => setManagingStudentsCourse(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-0 flex-1">
              {loadingStudents ? (
                <div className="p-12 flex justify-center text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              ) : courseStudents.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-sm">
                  No students enrolled in this course yet.
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {courseStudents.map(student => (
                    <li key={student.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50">
                      <div className="flex items-center gap-3 min-w-0">
                        {student.avatarUrl ? (
                          <img src={student.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-600 font-bold text-sm flex items-center justify-center shrink-0">
                            {student.name.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 truncate">{student.name}</p>
                          <p className="text-xs text-slate-500 truncate">{student.email}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveStudent(student.id)}
                        className="px-3 py-1.5 bg-white border border-red-200 text-red-600 hover:bg-red-50 font-semibold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors shrink-0"
                      >
                        <UserX className="w-3.5 h-3.5" /> Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
