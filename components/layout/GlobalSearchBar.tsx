"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Search,
  X,
  Radio,
  BookOpen,
  User,
  ArrowRight,
  Sparkles,
  Loader2,
  ExternalLink,
  MessageSquare,
} from "lucide-react"

interface SearchResultGroup {
  courses: Array<{
    id: string
    title: string
    code: string
    logoUrl?: string | null
    teacher?: { name: string } | null
  }>
  liveRooms: Array<{
    id: string
    title: string
    isLive: boolean
    scheduledAt: string
    course?: { title: string } | null
    teacher?: { name: string } | null
  }>
  people: Array<{
    id: string
    name: string
    email: string
    role: string
    avatarUrl?: string | null
  }>
  shortcuts: Array<{
    title: string
    path: string
  }>
}

interface GlobalSearchBarProps {
  role?: "student" | "teacher" | "admin"
  placeholder?: string
}

export default function GlobalSearchBar({
  role = "student",
  placeholder = "Search courses, live rooms, messages...",
}: GlobalSearchBarProps) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<SearchResultGroup | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const mobileInputRef = useRef<HTMLInputElement>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Global keyboard shortcuts (Ctrl+K, Cmd+K, or /) to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        inputRef.current?.focus()
        setIsOpen(true)
      } else if (e.key === "Escape") {
        setIsOpen(false)
        setIsMobileSearchOpen(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  // Outside click to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const executeSearch = useCallback(async (searchQuery: string) => {
    const trimmed = searchQuery.trim()
    if (!trimmed || trimmed.length < 2) {
      setResults(null)
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`)
      if (res.ok) {
        const data = await res.json()
        setResults(data.results || null)
      }
    } catch (err) {
      console.error("Search failed:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleInputChange = (val: string) => {
    setQuery(val)
    setIsOpen(true)

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = setTimeout(() => {
      void executeSearch(val)
    }, 220)
  }

  const handleSelectResult = (path: string) => {
    setIsOpen(false)
    setIsMobileSearchOpen(false)
    setQuery("")
    router.push(path)
  }

  const hasAnyResults =
    results &&
    (results.liveRooms.length > 0 ||
      results.courses.length > 0 ||
      results.people.length > 0 ||
      results.shortcuts.length > 0)

  return (
    <>
      {/* 1. Mobile Search Trigger Button (shown on < sm screens) */}
      <div className="sm:hidden flex items-center">
        <button
          onClick={() => {
            setIsMobileSearchOpen(true)
            setTimeout(() => mobileInputRef.current?.focus(), 80)
          }}
          className="w-10 h-10 rounded-xl border border-white/[0.08] bg-[#111110] flex items-center justify-center text-[#9d9b95] hover:text-[#f7f3e8] hover:bg-[#181817] active:scale-95 transition-all"
          title="Search"
          aria-label="Search"
        >
          <Search className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Desktop Search Bar (hidden on mobile, flexible on sm+) */}
      <div ref={containerRef} className="flex-1 relative hidden sm:block max-w-md mx-2">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-[#6d6b65] absolute left-3 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => {
              if (query.trim().length >= 2) setIsOpen(true)
            }}
            placeholder={placeholder}
            className="w-full pl-9 pr-14 py-1.5 sm:py-2 bg-[#111110] border border-white/[0.08] rounded-xl text-xs sm:text-sm text-[#f7f3e8] placeholder-[#6d6b65] focus:outline-none focus:border-[rgba(212,175,55,0.4)] transition-all shadow-inner"
          />
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 text-[#d4af37] absolute right-3 animate-spin pointer-events-none" />
          ) : query ? (
            <button
              onClick={() => {
                setQuery("")
                setResults(null)
                setIsOpen(false)
              }}
              className="absolute right-2.5 p-1 text-[#9d9b95] hover:text-[#f7f3e8] rounded-md"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="hidden lg:inline-flex items-center gap-0.5 absolute right-2.5 px-1.5 py-0.5 text-[10px] font-mono text-[#6d6b65] bg-[#181817] border border-white/[0.08] rounded shadow-xs pointer-events-none">
              ⌘K
            </kbd>
          )}
        </div>

        {/* Dropdown Results Box */}
        {isOpen && query.trim().length >= 2 && (
          <div className="absolute top-full mt-2 left-0 right-0 bg-[#111110] border border-white/[0.08] text-[#f7f3e8] rounded-2xl shadow-[0_24px_70px_rgba(0,0,0,0.7)] overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150 max-h-[75vh] overflow-y-auto">
            {loading && !results && (
              <div className="p-6 text-center text-[#9d9b95] text-xs flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#d4af37]" />
                <span>Searching academy records...</span>
              </div>
            )}

            {!loading && !hasAnyResults && (
              <div className="p-6 text-center">
                <p className="text-sm font-semibold text-[#f7f3e8]">No results found</p>
                <p className="text-xs text-[#9d9b95] mt-1">
                  Nothing matching &quot;{query}&quot; was found.
                </p>
              </div>
            )}

            {results && (
              <div className="p-2 divide-y divide-white/[0.06] space-y-2">
                {/* 🔴 Live Rooms Section */}
                {results.liveRooms.length > 0 && (
                  <div className="pt-1">
                    <div className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[#6d6b65] flex items-center justify-between">
                      <span>Live Broadcasts</span>
                      <Radio className="w-3 h-3 text-red-500 animate-pulse" />
                    </div>
                    <div className="space-y-0.5">
                      {results.liveRooms.map((room) => {
                        const targetUrl =
                          role === "teacher"
                            ? `/dashboard/teacher/live/${encodeURIComponent(room.id)}`
                            : `/dashboard/student/live/${encodeURIComponent(room.id)}`
                        return (
                          <div
                            key={room.id}
                            onClick={() => handleSelectResult(targetUrl)}
                            className="flex items-center justify-between p-2 rounded-xl hover:bg-[#181817] cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                  room.isLive ? "bg-red-500/15 text-red-400 border border-red-500/30" : "bg-[#181817] text-[#9d9b95] border border-white/[0.08]"
                                }`}
                              >
                                <Radio className={`w-4 h-4 ${room.isLive ? "animate-pulse" : ""}`} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-[#f7f3e8] truncate">{room.title}</p>
                                <p className="text-[11px] text-[#9d9b95] truncate">
                                  {room.teacher?.name ? `Host: ${room.teacher.name}` : room.course?.title || "Classroom"}
                                </p>
                              </div>
                            </div>
                            {room.isLive ? (
                              <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse">
                                Live Now
                              </span>
                            ) : (
                              <span className="shrink-0 text-[10px] text-[#9d9b95] bg-[#181817] px-2 py-0.5 rounded-full border border-white/[0.08]">
                                Scheduled
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* 📚 Courses Section */}
                {results.courses.length > 0 && (
                  <div className="pt-1">
                    <div className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[#6d6b65]">
                      Courses &amp; Curriculums
                    </div>
                    <div className="space-y-0.5">
                      {results.courses.map((course) => {
                        const targetUrl =
                          role === "teacher"
                            ? `/dashboard/teacher`
                            : `/dashboard/student`
                        return (
                          <div
                            key={course.id}
                            onClick={() => handleSelectResult(targetUrl)}
                            className="flex items-center justify-between p-2 rounded-xl hover:bg-[#181817] cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-[#181817] text-[#d4af37] border border-[rgba(212,175,55,0.2)] flex items-center justify-center shrink-0 font-bold text-xs font-mono">
                                {course.code.slice(0, 3)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-[#f7f3e8] truncate">{course.title}</p>
                                <p className="text-[11px] text-[#9d9b95] truncate">
                                  {course.code} • {course.teacher?.name || "Instructor"}
                                </p>
                              </div>
                            </div>
                            <ArrowRight className="w-3.5 h-3.5 text-[#6d6b65] shrink-0" />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* 👤 People / Instructors / Students */}
                {results.people.length > 0 && (
                  <div className="pt-1">
                    <div className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[#6d6b65]">
                      People &amp; Messages
                    </div>
                    <div className="space-y-0.5">
                      {results.people.map((person) => {
                        const targetUrl =
                          role === "teacher"
                            ? `/dashboard/teacher/messages`
                            : `/dashboard/student/messages`
                        return (
                          <div
                            key={person.id}
                            onClick={() => handleSelectResult(targetUrl)}
                            className="flex items-center justify-between p-2 rounded-xl hover:bg-[#181817] cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-[#181817] overflow-hidden shrink-0 border border-white/[0.08]">
                                <img
                                  src={
                                    person.avatarUrl ||
                                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(person.name)}`
                                  }
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-[#f7f3e8] truncate">{person.name}</p>
                                <p className="text-[11px] text-[#9d9b95] truncate">{person.email}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                  person.role === "TEACHER"
                                    ? "bg-[rgba(212,175,55,0.1)] text-[#d4af37] border border-[rgba(212,175,55,0.2)]"
                                    : "bg-white/[0.06] text-[#9d9b95] border border-white/[0.08]"
                                }`}
                              >
                                {person.role === "TEACHER" ? "Instructor" : "Student"}
                              </span>
                              <MessageSquare className="w-3.5 h-3.5 text-[#6d6b65]" />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* ⚡ Navigation Shortcuts */}
                {results.shortcuts.length > 0 && (
                  <div className="pt-1">
                    <div className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[#6d6b65]">
                      Quick Jump
                    </div>
                    <div className="space-y-0.5">
                      {results.shortcuts.map((shortcut) => (
                        <div
                          key={shortcut.path}
                          onClick={() => handleSelectResult(shortcut.path)}
                          className="flex items-center justify-between p-2 rounded-xl hover:bg-[#181817] cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-3.5 h-3.5 text-[#d4af37]" />
                            <span className="text-xs font-semibold text-[#f7f3e8]">{shortcut.title}</span>
                          </div>
                          <ExternalLink className="w-3 h-3 text-[#6d6b65]" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Mobile Fullscreen Search Overlay */}
      {isMobileSearchOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col sm:hidden animate-in fade-in duration-150">
          <div className="bg-[#080808] border-b border-white/[0.08] p-3 pt-4 shadow-2xl">
            <div className="flex items-center gap-2">
              <div className="flex-1 relative flex items-center">
                <Search className="w-4 h-4 text-[#6d6b65] absolute left-3 pointer-events-none" />
                <input
                  ref={mobileInputRef}
                  type="text"
                  value={query}
                  onChange={(e) => handleInputChange(e.target.value)}
                  placeholder="Search live rooms, courses, messages..."
                  className="w-full pl-9 pr-9 py-2.5 min-h-[44px] bg-[#111110] border border-white/[0.08] rounded-xl text-sm text-[#f7f3e8] placeholder-[#6d6b65] focus:outline-none focus:border-[rgba(212,175,55,0.4)] transition-all"
                />
                {query && (
                  <button
                    onClick={() => {
                      setQuery("")
                      setResults(null)
                    }}
                    className="absolute right-2.5 p-1 text-[#6d6b65] hover:text-[#f7f3e8] active:scale-95"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button
                onClick={() => setIsMobileSearchOpen(false)}
                className="px-3 py-2 min-h-[44px] text-xs font-bold text-[#9d9b95] hover:text-[#f7f3e8] rounded-xl hover:bg-white/[0.06] active:scale-95 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-[#050505] p-3.5 pb-28">
            {!query && (
              <div className="py-2 space-y-3">
                <div className="px-1 text-[11px] font-bold text-[#6d6b65] uppercase tracking-wider">
                  Quick Navigation
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    onClick={() => handleSelectResult(role === "teacher" ? "/dashboard/teacher/live/MainStudio" : "/dashboard/student/calendar")}
                    className="p-3 bg-[#111110] border border-white/[0.08] hover:border-[rgba(212,175,55,0.25)] rounded-2xl flex items-center gap-2.5 text-left active:scale-95 transition-all shadow-md"
                  >
                    <div className="w-8 h-8 rounded-xl bg-red-500/15 text-red-400 border border-red-500/30 flex items-center justify-center shrink-0">
                      <Radio className="w-4 h-4 animate-pulse" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#f7f3e8]">Live Studio</p>
                      <p className="text-[10px] text-[#9d9b95]">Broadcasts</p>
                    </div>
                  </button>
                  <button
                    onClick={() => handleSelectResult(role === "teacher" ? "/dashboard/teacher/exams" : "/dashboard/student/exams")}
                    className="p-3 bg-[#111110] border border-white/[0.08] hover:border-[rgba(212,175,55,0.25)] rounded-2xl flex items-center gap-2.5 text-left active:scale-95 transition-all shadow-md"
                  >
                    <div className="w-8 h-8 rounded-xl bg-[rgba(212,175,55,0.1)] text-[#d4af37] border border-[rgba(212,175,55,0.2)] flex items-center justify-center shrink-0">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#f7f3e8]">Exams &amp; Tasks</p>
                      <p className="text-[10px] text-[#9d9b95]">Assessments</p>
                    </div>
                  </button>
                  <button
                    onClick={() => handleSelectResult(role === "teacher" ? "/dashboard/teacher/messages" : "/dashboard/student/messages")}
                    className="p-3 bg-[#111110] border border-white/[0.08] hover:border-[rgba(212,175,55,0.25)] rounded-2xl flex items-center gap-2.5 text-left active:scale-95 transition-all shadow-md"
                  >
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#f7f3e8]">Messages</p>
                      <p className="text-[10px] text-[#9d9b95]">Direct chat</p>
                    </div>
                  </button>
                  <button
                    onClick={() => handleSelectResult(role === "teacher" ? "/dashboard/teacher/feed" : "/dashboard/student/feed")}
                    className="p-3 bg-[#111110] border border-white/[0.08] hover:border-[rgba(212,175,55,0.25)] rounded-2xl flex items-center gap-2.5 text-left active:scale-95 transition-all shadow-md"
                  >
                    <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#f7f3e8]">Campus Feed</p>
                      <p className="text-[10px] text-[#9d9b95]">Updates</p>
                    </div>
                  </button>
                </div>
              </div>
            )}
            {loading && (
              <div className="py-8 text-center text-[#9d9b95] text-xs flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#d4af37]" />
                <span>Searching records...</span>
              </div>
            )}

            {!loading && !hasAnyResults && query.trim().length >= 2 && (
              <div className="py-8 text-center bg-[#111110] rounded-2xl p-6 border border-white/[0.08]">
                <p className="text-sm font-bold text-[#f7f3e8]">No results found</p>
                <p className="text-xs text-[#9d9b95] mt-1">Try another search term.</p>
              </div>
            )}

            {results && hasAnyResults && (
              <div className="space-y-3">
                {results.liveRooms.map((room) => (
                  <div
                    key={room.id}
                    onClick={() =>
                      handleSelectResult(
                        role === "teacher"
                          ? `/dashboard/teacher/live/${encodeURIComponent(room.id)}`
                          : `/dashboard/student/live/${encodeURIComponent(room.id)}`
                      )
                    }
                    className="p-3 bg-[#111110] border border-white/[0.08] rounded-2xl flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <Radio className={`w-4 h-4 ${room.isLive ? "text-red-500 animate-pulse" : "text-[#6d6b65]"}`} />
                      <div>
                        <p className="text-xs font-bold text-[#f7f3e8]">{room.title}</p>
                        <p className="text-[10px] text-[#9d9b95]">{room.course?.title || "Classroom"}</p>
                      </div>
                    </div>
                    {room.isLive && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                        Live
                      </span>
                    )}
                  </div>
                ))}

                {results.courses.map((course) => (
                  <div
                    key={course.id}
                    onClick={() =>
                      handleSelectResult(role === "teacher" ? `/dashboard/teacher` : `/dashboard/student`)
                    }
                    className="p-3 bg-[#111110] border border-white/[0.08] rounded-2xl flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-bold text-[#f7f3e8]">{course.title}</p>
                      <p className="text-[10px] text-[#9d9b95]">{course.code}</p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-[#6d6b65]" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
