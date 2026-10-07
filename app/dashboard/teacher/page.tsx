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

  const totalStudents = courses.reduce((acc, c) => acc + c.studentCount, 0)
  const pendingRequestsCount = Object.values(requestsMap).reduce((acc, reqs) => acc + reqs.length, 0)

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 rounded-2xl p-6 md:p-8 text-white shadow-xl">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold mb-3 border border-indigo-500/30">
            <ShieldCheck className="w-3.5 h-3.5" /> Instructor Management Console
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Teacher Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1 max-w-xl">
            Create courses with custom logos and privacy permissions, manage student enrollments, and launch live classes.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-lg transition-all flex items-center gap-2"
          >
            <Plus className="w-5 h-5" /> Create Course
          </button>
          <Link
            href="/dashboard/teacher/live/MainStudio"
            className="px-5 py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-red-600/30 transition-all flex items-center gap-2"
          >
            <Radio className="w-5 h-5 animate-pulse" /> Live Studio
          </Link>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl text-sm font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 flex justify-between items-center">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-xs underline ml-4">
            Dismiss
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-700">My Active Courses</h3>
            <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900">{courses.length}</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-700">Total Enrolled Students</h3>
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900">{totalStudents}</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-700">Pending Join Requests</h3>
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <Lock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900">{pendingRequestsCount}</div>
        </div>
      </div>

      {/* Pending Student Requests Approval Section */}
      {pendingRequestsCount > 0 && (
        <div className="bg-amber-50/50 rounded-2xl border border-amber-200 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-amber-600" />
            <h2 className="text-lg font-bold text-amber-900">Pending Student Approval Requests</h2>
          </div>
          <div className="divide-y divide-amber-200/60 bg-white rounded-xl border border-amber-200 overflow-hidden">
            {Object.entries(requestsMap).map(([courseId, reqs]) => {
              const course = courses.find(c => c.id === courseId)
              if (!course || reqs.length === 0) return null
              return reqs.map(req => (
                <div key={req.id} className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                      {req.student.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{req.student.name}</p>
                      <p className="text-xs text-slate-500 truncate">
                        Requested access for <span className="font-semibold text-indigo-600">{course.title}</span> ({course.code})
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 w-full sm:w-auto">
                    <button
                      onClick={() => handleApproveOrReject(courseId, req.id, "APPROVED")}
                      disabled={processingRequestId === req.id}
                      className="flex-1 sm:flex-initial justify-center px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 disabled:cursor-not-allowed text-white font-bold text-xs rounded-lg flex items-center gap-1 shadow-sm transition-colors"
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
                      className="flex-1 sm:flex-initial justify-center px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed text-white font-bold text-xs rounded-lg flex items-center gap-1 shadow-sm transition-colors"
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
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Your Courses</h2>
            <p className="text-slate-500 text-sm">Real database courses created by you.</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Add Course
          </button>
        </div>

        {loading ? (
          <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-400">
            Loading your courses...
          </div>
        ) : courses.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="font-bold text-slate-800 text-lg">No Courses Created Yet</h3>
            <p className="text-slate-500 text-sm max-w-md mx-auto">
              You haven't created any courses yet. Click "Create Course" to add a course name, logo, and set enrollment permissions.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-5 py-2.5 bg-indigo-600 text-white font-bold text-sm rounded-xl inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Create First Course
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map(course => (
              <div
                key={course.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all"
              >
                <div className="h-32 bg-slate-900 relative flex items-center justify-center p-4">
                  {course.logoUrl ? (
                    <img src={course.logoUrl} alt={course.title} className="w-full h-full object-cover opacity-80" />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-white font-extrabold text-2xl shadow-inner">
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
                    <span className="text-xs font-mono font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                      {course.code}
                    </span>
                    <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-indigo-500" />
                      {course.studentCount} Students
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-base leading-snug">{course.title}</h3>
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {course.description || "No description provided."}
                  </p>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <Link
                      href="/dashboard/teacher/messages"
                      className="text-slate-600 hover:text-indigo-600 font-bold flex items-center gap-1 transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> Class Chat
                    </Link>
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/dashboard/teacher/feed`}
                        className="text-indigo-600 hover:text-indigo-700 font-bold"
                      >
                        Feed →
                      </Link>
                      <Link
                        href={`/dashboard/teacher/courses/${course.id}/materials`}
                        className="text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1"
                      >
                        <BookOpen className="w-3.5 h-3.5" /> Materials
                      </Link>
                      <Link
                        href={`/dashboard/teacher/live/${encodeURIComponent(course.title)}`}
                        className="text-red-600 hover:text-red-700 font-bold flex items-center gap-1"
                      >
                        <Radio className="w-3.5 h-3.5" /> Start Stream
                      </Link>
                    </div>
                  </div>
                  
                  {/* Teacher Management Controls */}
                  <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                    <button
                      onClick={() => openManageStudents(course)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                      title="Manage Students"
                    >
                      <Users className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openEditCourse(course)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                      title="Edit Course"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteCourse(course.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
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
