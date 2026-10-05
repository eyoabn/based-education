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
          className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
          title="Search"
          aria-label="Search"
        >
          <Search className="w-4 h-4" />
        </button>
      </div>

      {/* 2. Desktop Search Bar (hidden on mobile, flexible on sm+) */}
      <div ref={containerRef} className="flex-1 relative hidden sm:block max-w-md mx-2">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => {
              if (query.trim().length >= 2) setIsOpen(true)
            }}
            placeholder={placeholder}
            className="w-full pl-9 pr-14 py-1.5 sm:py-2 bg-slate-100 border border-transparent rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all shadow-inner"
          />
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 text-slate-400 absolute right-3 animate-spin pointer-events-none" />
          ) : query ? (
            <button
              onClick={() => {
                setQuery("")
                setResults(null)
                setIsOpen(false)
              }}
              className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600 rounded-md"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="hidden lg:inline-flex items-center gap-0.5 absolute right-2.5 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-white border border-slate-200 rounded shadow-xs pointer-events-none">
              ⌘K
            </kbd>
          )}
        </div>

        {/* Dropdown Results Box */}
        {isOpen && query.trim().length >= 2 && (
          <div className="absolute top-full mt-2 left-0 right-0 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150 max-h-[75vh] overflow-y-auto">
            {loading && !results && (
              <div className="p-6 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                <span>Searching sanctuary and records...</span>
              </div>
            )}

            {!loading && !hasAnyResults && (
              <div className="p-6 text-center">
                <p className="text-sm font-semibold text-slate-700">No results found</p>
                <p className="text-xs text-slate-400 mt-1">
                  Nothing matching &quot;{query}&quot; was found.
                </p>
              </div>
            )}

            {results && (
              <div className="p-2 divide-y divide-slate-100 space-y-2">
                {/* 🔴 Live Rooms Section */}
                {results.liveRooms.length > 0 && (
                  <div className="pt-1">
                    <div className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
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
                            className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                  room.isLive ? "bg-red-500/10 text-red-600" : "bg-slate-100 text-slate-500"
                                }`}
                              >
                                <Radio className={`w-4 h-4 ${room.isLive ? "animate-pulse" : ""}`} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-800 truncate">{room.title}</p>
                                <p className="text-[11px] text-slate-400 truncate">
                                  {room.teacher?.name ? `Host: ${room.teacher.name}` : room.course?.title || "Classroom"}
                                </p>
                              </div>
                            </div>
                            {room.isLive ? (
                              <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 animate-pulse">
                                Live Now
                              </span>
                            ) : (
                              <span className="shrink-0 text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
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
                    <div className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Courses & Curriculums
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
                            className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 font-bold text-xs">
                                {course.code.slice(0, 3)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-slate-800 truncate">{course.title}</p>
                                <p className="text-[11px] text-slate-400 truncate">
                                  {course.code} • {course.teacher?.name || "Instructor"}
                                </p>
                              </div>
                            </div>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* 👤 People / Instructors / Students */}
                {results.people.length > 0 && (
                  <div className="pt-1">
                    <div className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      People & Messages
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
                            className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
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
                                <p className="text-xs font-semibold text-slate-800 truncate">{person.name}</p>
                                <p className="text-[11px] text-slate-400 truncate">{person.email}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                  person.role === "TEACHER"
                                    ? "bg-indigo-50 text-indigo-700"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {person.role === "TEACHER" ? "Instructor" : "Student"}
                              </span>
                              <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
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
                    <div className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Quick Jump
                    </div>
                    <div className="space-y-0.5">
                      {results.shortcuts.map((shortcut) => (
                        <div
                          key={shortcut.path}
                          onClick={() => handleSelectResult(shortcut.path)}
                          className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                            <span className="text-xs font-semibold text-slate-800">{shortcut.title}</span>
                          </div>
                          <ExternalLink className="w-3 h-3 text-slate-400" />
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
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex flex-col sm:hidden animate-in fade-in duration-150">
          <div className="bg-white border-b border-slate-200 p-3 pt-4 shadow-xl">
            <div className="flex items-center gap-2">
              <div className="flex-1 relative flex items-center">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                <input
                  ref={mobileInputRef}
                  type="text"
                  value={query}
                  onChange={(e) => handleInputChange(e.target.value)}
                  placeholder="Search live rooms, courses, messages..."
                  className="w-full pl-9 pr-8 py-2 bg-slate-100 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                {query && (
                  <button
                    onClick={() => {
                      setQuery("")
                      setResults(null)
                    }}
                    className="absolute right-2 p-1 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button
                onClick={() => setIsMobileSearchOpen(false)}
                className="px-2.5 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
              >
                Cancel
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-slate-50 p-3">
            {loading && (
              <div className="py-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                <span>Searching...</span>
              </div>
            )}

            {!loading && !hasAnyResults && query.trim().length >= 2 && (
              <div className="py-8 text-center bg-white rounded-2xl p-6 border border-slate-200">
                <p className="text-sm font-bold text-slate-700">No results found</p>
                <p className="text-xs text-slate-400 mt-1">Try another search term.</p>
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
                    className="p-3 bg-white border border-slate-200 rounded-2xl flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <Radio className={`w-4 h-4 ${room.isLive ? "text-red-500 animate-pulse" : "text-slate-400"}`} />
                      <div>
                        <p className="text-xs font-bold text-slate-800">{room.title}</p>
                        <p className="text-[10px] text-slate-400">{room.course?.title || "Classroom"}</p>
                      </div>
                    </div>
                    {room.isLive && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
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
                    className="p-3 bg-white border border-slate-200 rounded-2xl flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-800">{course.title}</p>
                      <p className="text-[10px] text-slate-400">{course.code}</p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
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
