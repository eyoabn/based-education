"use client"

import { useEffect, useState } from "react"
import { BookOpen, Users, Lock, Unlock, CheckCircle, Clock, ChevronRight, Sparkles, Building2, Radio, Video, MessageSquare } from "lucide-react"
import Link from "next/link"

interface Course {
  id: string
  title: string
  code: string
  description: string | null
  logoUrl: string | null
  accessMode: "PUBLIC" | "PERMISSION_REQUIRED"
  teacherId: string
  teacher: {
    id: string
    name: string
    email: string
    avatarUrl: string | null
    specialty: string | null
  }
  studentCount: number
  requestCount: number
  liveRoomCount: number
  activeLiveRoom?: { id: string; title: string; isLive: boolean } | null
  isEnrolled: boolean
  hasPendingRequest: boolean
}

interface ActiveLiveRoom {
  id: string
  title: string
  isLive: boolean
  courseTitle: string | null
  teacherName: string | null
  startsAt: string
}

export default function StudentDashboardPage() {
  const [userName, setUserName] = useState("Student")
  const [courses, setCourses] = useState<Course[]>([])
  const [liveEvents, setLiveEvents] = useState<ActiveLiveRoom[]>([])
  const [loading, setLoading] = useState(true)
  const [joiningId, setJoiningId] = useState<string | null>(null)
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        const [userRes, courseRes, scheduleRes] = await Promise.all([
          fetch("/api/auth/me", { cache: "no-store" }),
          fetch("/api/courses", { cache: "no-store" }),
          fetch("/api/schedules", { cache: "no-store" }),
        ])

        if (userRes.ok) {
          const userData = await userRes.json()
          if (userData?.user?.name) setUserName(userData.user.name)
        }

        if (courseRes.ok) {
          const courseData = await courseRes.json()
          if (Array.isArray(courseData?.courses)) {
            setCourses(courseData.courses)
          }
        }

        if (scheduleRes.ok) {
          const scheduleData = await scheduleRes.json()
          if (Array.isArray(scheduleData?.events)) {
            const activeLive = scheduleData.events.filter((e: any) => e.type === "LIVE_CLASS" && e.isLive)
            setLiveEvents(activeLive)
          }
        }
      } catch (err) {
        console.error("Failed to load student dashboard data", err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const handleJoinOrRequest = async (course: Course) => {
    setJoiningId(course.id)
    setMessage(null)
    try {
      const res = await fetch(`/api/courses/${course.id}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
      const data = await res.json()

      if (res.ok) {
        setMessage({ text: data.message || "Action completed", type: "success" })
        setCourses(prev =>
          prev.map(c => {
            if (c.id === course.id) {
              if (data.status === "ENROLLED") {
                return { ...c, isEnrolled: true, studentCount: c.studentCount + 1 }
              } else if (data.status === "PENDING") {
                return { ...c, hasPendingRequest: true }
              }
            }
            return c
          })
        )
      } else {
        setMessage({ text: data.error || "Failed to process request", type: "error" })
      }
    } catch {
      setMessage({ text: "Network error occurred", type: "error" })
    } finally {
      setJoiningId(null)
    }
  }

  const [filterTab, setFilterTab] = useState<"all" | "enrolled" | "public" | "restricted">("all")

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

  const enrolledCourses = courses.filter(c => c.isEnrolled)
  const publicCourses = courses.filter(c => c.accessMode === "PUBLIC")
  const restrictedCourses = courses.filter(c => c.accessMode === "PERMISSION_REQUIRED")

  const filteredCourses = courses.filter(c => {
    if (filterTab === "enrolled") return c.isEnrolled
    if (filterTab === "public") return c.accessMode === "PUBLIC"
    if (filterTab === "restricted") return c.accessMode === "PERMISSION_REQUIRED"
    return true
  })

  return (
    <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8">
      {/* Active Live Class Alert Banner */}
      {liveEvents.length > 0 && (
        <div className="bg-gradient-to-r from-red-600 via-red-500 to-amber-600 rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-white shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in duration-300">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 shadow-inner">
              <Radio className="w-5 h-5 sm:w-6 sm:h-6 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-white text-red-600 text-[10px] sm:text-xs font-black uppercase tracking-wider shadow-xs">
                  LIVE BROADCAST
                </span>
                <span className="text-xs font-semibold text-red-100 truncate max-w-[180px] sm:max-w-none">
                  {liveEvents[0].courseTitle || "Course Class"}
                </span>
              </div>
              <h2 className="text-base sm:text-xl font-extrabold text-white mt-1 leading-snug">{liveEvents[0].title}</h2>
              {liveEvents[0].teacherName && (
                <p className="text-xs text-red-100/90 font-medium mt-0.5">Host: {liveEvents[0].teacherName}</p>
              )}
            </div>
          </div>
          <Link
            href={`/dashboard/student/live/${encodeURIComponent(liveEvents[0].id)}`}
            className="w-full sm:w-auto px-5 sm:px-6 py-2.5 sm:py-3 bg-white hover:bg-slate-100 active:scale-95 text-red-600 font-extrabold text-xs sm:text-sm rounded-xl shadow-lg transition-all inline-flex items-center justify-center gap-2 shrink-0 text-center"
          >
            <Video className="w-4 h-4" /> Join Live Stream Now
          </Link>
        </div>
      )}

      {/* Humanized Welcome Banner with Dynamic Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-[#181817] via-[#111110] to-[#0a0a09] border border-white/[0.08] rounded-2xl sm:rounded-3xl p-5 sm:p-7 md:p-8 text-[#f7f3e8] shadow-[0_20px_50px_rgba(0,0,0,0.6)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.08),transparent_70%)] pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.06] border border-white/[0.08] text-[#d4af37] text-xs font-semibold mb-2 sm:mb-3 backdrop-blur-xs">
            <Sparkles className="w-3.5 h-3.5 text-[#d4af37]" />
            <span>{currentDateFormatted}</span>
            <span className="opacity-40">•</span>
            <span>Student Hub</span>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-[#f7f3e8]">
            {getGreeting()}, {userName}! 👋
          </h1>
          <p className="text-[#9d9b95] text-xs sm:text-sm mt-1.5 max-w-xl leading-relaxed">
            Welcome to your learning sanctuary. Explore scheduled classes, submit assessments, and connect with your teachers.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0 relative z-10">
          <Link
            href="/dashboard/student/calendar"
            className="w-full sm:w-auto px-4 sm:px-5 py-2.5 bg-gradient-to-r from-[#d4af37] to-[#e6ca65] hover:opacity-95 active:scale-95 text-black font-bold text-xs sm:text-sm rounded-xl shadow-[0_0_20px_rgba(212,175,55,0.3)] transition-all inline-flex items-center justify-center gap-2 text-center"
          >
            <Clock className="w-4 h-4 text-black" /> Schedule &amp; Live
          </Link>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-sm font-semibold flex items-center justify-between border ${
            message.type === "success"
              ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
              : "bg-red-500/10 text-red-300 border-red-500/30"
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-xs underline ml-4 hover:opacity-80">
            Dismiss
          </button>
        </div>
      )}

      {/* Humanized Stats Cards with Contextual Subtitles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-[#111110] rounded-2xl border border-white/[0.08] p-5 sm:p-6 shadow-[0_10px_30px_rgba(0,0,0,0.4)] hover:-translate-y-0.5 hover:border-[rgba(212,175,55,0.3)] transition-all">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-xs uppercase tracking-wider text-[#9d9b95]">Enrolled Courses</h3>
            <div className="w-10 h-10 rounded-xl bg-[rgba(212,175,55,0.12)] border border-[rgba(212,175,55,0.25)] flex items-center justify-center text-[#d4af37]">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-[#f7f3e8]">{enrolledCourses.length}</div>
          <p className="text-xs text-[#9d9b95] mt-1">Active courses in your curriculum</p>
        </div>

        <div className="bg-[#111110] rounded-2xl border border-white/[0.08] p-5 sm:p-6 shadow-[0_10px_30px_rgba(0,0,0,0.4)] hover:-translate-y-0.5 hover:border-[rgba(212,175,55,0.3)] transition-all">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-xs uppercase tracking-wider text-[#9d9b95]">Available Courses</h3>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-[#f7f3e8]">{courses.length}</div>
          <p className="text-xs text-[#9d9b95] mt-1">Total public &amp; restricted subjects</p>
        </div>

        <div className="bg-[#111110] rounded-2xl border border-white/[0.08] p-5 sm:p-6 shadow-[0_10px_30px_rgba(0,0,0,0.4)] hover:-translate-y-0.5 hover:border-[rgba(212,175,55,0.3)] transition-all">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-xs uppercase tracking-wider text-[#9d9b95]">Instructors</h3>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-[#f7f3e8]">
            {new Set(courses.map(c => c.teacherId)).size}
          </div>
          <p className="text-xs text-[#9d9b95] mt-1">Faculty educators teaching now</p>
        </div>
      </div>

      {/* Course Catalogue with Mobile-Friendly Filter Chips */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-[#f7f3e8]">Course Catalogue</h2>
            <p className="text-[#9d9b95] text-xs sm:text-sm">Join open classes or request admission to specialized cohorts.</p>
          </div>

          {/* Quick Filter Tabs for Ergonomic Mobile Browsing */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setFilterTab("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 active:scale-95 ${
                filterTab === "all"
                  ? "bg-gradient-to-r from-[rgba(212,175,55,0.2)] to-[rgba(212,175,55,0.08)] text-[#f7f3e8] border border-[rgba(212,175,55,0.35)] shadow-[0_0_12px_rgba(212,175,55,0.15)]"
                  : "bg-[#111110] border border-white/[0.08] text-[#9d9b95] hover:text-[#f7f3e8] hover:bg-[#181817]"
              }`}
            >
              All ({courses.length})
            </button>
            <button
              onClick={() => setFilterTab("enrolled")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 active:scale-95 ${
                filterTab === "enrolled"
                  ? "bg-gradient-to-r from-[rgba(212,175,55,0.2)] to-[rgba(212,175,55,0.08)] text-[#f7f3e8] border border-[rgba(212,175,55,0.35)] shadow-[0_0_12px_rgba(212,175,55,0.15)]"
                  : "bg-[#111110] border border-white/[0.08] text-[#9d9b95] hover:text-[#f7f3e8] hover:bg-[#181817]"
              }`}
            >
              Enrolled ({enrolledCourses.length})
            </button>
            <button
              onClick={() => setFilterTab("public")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 active:scale-95 ${
                filterTab === "public"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                  : "bg-[#111110] border border-white/[0.08] text-[#9d9b95] hover:text-[#f7f3e8] hover:bg-[#181817]"
              }`}
            >
              Public ({publicCourses.length})
            </button>
            <button
              onClick={() => setFilterTab("restricted")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 active:scale-95 ${
                filterTab === "restricted"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.15)]"
                  : "bg-[#111110] border border-white/[0.08] text-[#9d9b95] hover:text-[#f7f3e8] hover:bg-[#181817]"
              }`}
            >
              Approval Req ({restrictedCourses.length})
            </button>
          </div>
        </div>

        {loading ? (
          <div className="bg-[#111110] p-12 rounded-2xl border border-white/[0.08] text-center text-[#9d9b95]">
            Loading course directory...
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="bg-[#111110] p-12 rounded-2xl border border-white/[0.08] text-center">
            <BookOpen className="w-12 h-12 text-[#9d9b95]/40 mx-auto mb-3" />
            <h3 className="font-bold text-[#f7f3e8] text-lg">No Matching Courses Found</h3>
            <p className="text-[#9d9b95] text-sm max-w-md mx-auto mt-1">
              {filterTab === "enrolled"
                ? "You haven't joined any courses yet. Browse public courses and enroll with one tap!"
                : "No courses match the current filter selection."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredCourses.map(course => (
              <div
                key={course.id}
                className="bg-[#111110] rounded-2xl border border-white/[0.08] overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.5)] hover:shadow-[0_15px_40px_rgba(0,0,0,0.7)] hover:border-[rgba(212,175,55,0.3)] hover:-translate-y-0.5 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Course Header / Logo */}
                  <div className="h-32 bg-[#0a0a09] border-b border-white/[0.06] relative flex items-center justify-center overflow-hidden p-4">
                    {course.logoUrl ? (
                      <img
                        src={course.logoUrl}
                        alt={course.title}
                        className="w-full h-full object-cover opacity-80"
                      />
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
                          <Lock className="w-3 h-3" /> Approval Required
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold px-2 py-0.5 bg-[#181817] border border-white/[0.08] text-[#d4af37] rounded">
                        {course.code}
                      </span>
                      <span className="text-xs text-[#9d9b95] font-semibold flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-[#d4af37]" />
                        {course.studentCount} {course.studentCount === 1 ? "student" : "students"}
                      </span>
                    </div>

                    <h3 className="font-bold text-[#f7f3e8] text-base leading-snug">{course.title}</h3>
                    <p className="text-xs text-[#9d9b95] line-clamp-2 leading-relaxed">
                      {course.description || "No description provided."}
                    </p>

                    <div className="pt-2 border-t border-white/[0.06] flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#181817] border border-[rgba(212,175,55,0.3)] text-[#d4af37] font-bold text-xs flex items-center justify-center overflow-hidden">
                        {course.teacher.avatarUrl ? (
                          <img src={course.teacher.avatarUrl} alt={course.teacher.name} className="w-full h-full object-cover" />
                        ) : (
                          course.teacher.name.substring(0, 1).toUpperCase()
                        )}
                      </div>
                      <div className="text-xs">
                        <p className="font-semibold text-[#f7f3e8]">{course.teacher.name}</p>
                        <p className="text-[10px] text-[#9d9b95]">{course.teacher.specialty || "Instructor"}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Action Button */}
                <div className="p-5 pt-0">
                  {course.isEnrolled ? (
                    <div className="space-y-2">
                      <div className="w-full py-2 px-3 bg-emerald-500/10 text-emerald-300 border border-emerald-500/25 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5">
                        <CheckCircle className="w-4 h-4 text-emerald-400" /> Enrolled (Access Granted)
                      </div>
                      {course.activeLiveRoom?.isLive ? (
                        <Link
                          href={`/dashboard/student/live/${encodeURIComponent(course.activeLiveRoom.id)}`}
                          className="w-full py-2 px-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-red-500/30 transition-all"
                        >
                          <Radio className="w-3.5 h-3.5 animate-pulse" /> Join Live Stream Now
                        </Link>
                      ) : (
                        <div className="w-full py-2 px-3 bg-[#181817] border border-white/[0.08] rounded-xl text-[11px] font-semibold text-[#9d9b95] flex items-center justify-center gap-1.5">
                          <Radio className="w-3 h-3 text-[#6d6b65]" /> Live Stream Offline
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Link
                          href={`/dashboard/student/courses/${encodeURIComponent(course.id)}/materials`}
                          className="flex-1 py-2.5 px-4 bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 text-[#f7f3e8] border border-white/[0.08] rounded-xl text-xs font-bold flex flex-col items-center justify-center transition-all min-h-[44px]"
                        >
                          <BookOpen className="w-3.5 h-3.5 mb-0.5 text-[#d4af37]" /> Materials
                        </Link>
                        <Link
                          href={`/dashboard/student/messages?courseId=${encodeURIComponent(course.id)}`}
                          className="flex-1 py-2.5 px-4 bg-[rgba(212,175,55,0.1)] hover:bg-[rgba(212,175,55,0.18)] active:scale-95 text-[#d4af37] border border-[rgba(212,175,55,0.25)] rounded-xl text-xs font-bold flex flex-col items-center justify-center transition-all text-center min-h-[44px]"
                        >
                          <MessageSquare className="w-3.5 h-3.5 mb-0.5" /> Class Chat
                        </Link>
                      </div>
                    </div>
                  ) : course.hasPendingRequest ? (
                    <button
                      disabled
                      className="w-full min-h-[44px] py-2.5 px-4 bg-amber-500/10 text-amber-300 border border-amber-500/25 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                    >
                      <Clock className="w-4 h-4 text-amber-400" /> Request Pending Approval
                    </button>
                  ) : (
                    <button
                      onClick={() => handleJoinOrRequest(course)}
                      disabled={joiningId === course.id}
                      className={`w-full min-h-[44px] py-2.5 px-4 rounded-xl text-xs font-bold text-black shadow-xs transition-all flex items-center justify-center gap-1.5 active:scale-[0.98] ${
                        course.accessMode === "PUBLIC"
                          ? "bg-gradient-to-r from-[#d4af37] to-[#e6ca65] hover:opacity-95 shadow-[0_0_15px_rgba(212,175,55,0.25)]"
                          : "bg-amber-500 hover:bg-amber-400 text-black shadow-[0_0_15px_rgba(245,158,11,0.25)]"
                      }`}
                    >
                      {joiningId === course.id ? (
                        "Processing..."
                      ) : course.accessMode === "PUBLIC" ? (
                        <>Join Course <ChevronRight className="w-4 h-4" /></>
                      ) : (
                        <>Request to Join <Lock className="w-3.5 h-3.5" /></>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
