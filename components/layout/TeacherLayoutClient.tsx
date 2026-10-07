"use client"

import { type ReactNode, useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Search, LayoutDashboard, Rss, Video, Calendar, Users, FileText, GraduationCap, Radio, MessageSquare, Menu, X, Bug } from "lucide-react"
import NotificationBell from "@/components/notifications/NotificationBell"
import LogoutButton from "@/components/auth/LogoutButton"
import UserHeaderBadge from "@/components/auth/UserHeaderBadge"
import GlobalSearchBar from "./GlobalSearchBar"

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, href: '/dashboard/teacher' },
  { id: 'messages', label: 'Messages', icon: MessageSquare, href: '/dashboard/teacher/messages' },
  { id: 'feed', label: 'Post Stream', icon: Rss, href: '/dashboard/teacher/feed' },
  { id: 'studio', label: 'Go Live Studio', icon: Video, href: '/dashboard/teacher/live/MainStudio' },
  { id: 'schedules', label: 'Schedules', icon: Calendar, href: '/dashboard/teacher/schedules' },
  { id: 'attendance', label: 'Student Attendance', icon: Users, href: '/dashboard/teacher/attendance' },
  { id: 'exams', label: 'Exams & Tasks', icon: FileText, href: '/dashboard/teacher/exams' },
  { id: 'grading', label: 'Grading', icon: GraduationCap, href: '/dashboard/teacher/grading' },
  { id: 'feedback', label: 'Report Bug', icon: Bug, href: '/dashboard/teacher/feedback' },
]

export default function TeacherLayoutClient({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)

  useEffect(() => {
    setMobileDrawerOpen(false)
  }, [pathname])

  if (pathname.includes('/live/')) {
    return <div className="fixed inset-0 w-full h-full overflow-hidden bg-black p-0 m-0 z-50">{children}</div>
  }

  const isActive = (href: string) =>
    href === '/dashboard/teacher' ? pathname === href : pathname.startsWith(href)

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans">
      {/* Desktop Sidebar Navigator */}
      <aside className="hidden md:flex w-[240px] shrink-0 bg-slate-900 flex-col py-6 relative z-10 text-slate-300 border-r border-slate-800/60 shadow-xl">
        <div className="px-5 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-[0_4px_12px_rgba(79,70,229,0.4)]">
              <span className="text-white font-bold text-sm">⚡</span>
            </div>
            <div>
              <span className="font-bold text-lg text-white tracking-tight block leading-tight">BasedEducation</span>
              <span className="text-[10px] text-slate-400 font-medium">Faculty Studio</span>
            </div>
          </div>
        </div>

        <div className="px-5 pb-2 text-[10px] font-bold tracking-widest uppercase text-emerald-300/60 flex justify-between items-center">
          <span>Teacher Portal</span>
          <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[9px] font-semibold">APPROVED</span>
        </div>

        <nav className="flex-1 flex flex-col gap-1 px-3 mt-1 overflow-y-auto">
          {NAV_ITEMS.map(item => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all relative group text-sm ${
                  active 
                    ? 'bg-emerald-500/20 text-emerald-300 font-semibold shadow-inner' 
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-emerald-500" />
                )}
                <item.icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${active ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                <span className="tracking-wide">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Sidebar Footer Accent */}
        <div className="px-4 pt-4 border-t border-slate-800/80 mt-auto">
          <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-slate-400 font-medium">Teaching Mode</span>
            </div>
            <LogoutButton />
          </div>
        </div>
      </aside>

      {/* Mobile Drawer Backdrop & Menu */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex animate-in fade-in duration-200">
          <div 
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity" 
            onClick={() => setMobileDrawerOpen(false)} 
            aria-hidden="true"
          />
          <div className="relative w-[300px] max-w-[85vw] bg-slate-900 text-slate-300 h-full flex flex-col py-6 shadow-2xl z-50 animate-in slide-in-from-left duration-300 rounded-r-3xl border-r border-slate-800/80">
            <div className="px-5 mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-md">
                  <span className="text-white font-bold text-xs">⚡</span>
                </div>
                <div>
                  <span className="font-bold text-base text-white tracking-tight block leading-tight">BasedEducation</span>
                  <span className="text-[10px] text-slate-400 font-medium">Teacher Portal</span>
                </div>
              </div>
              <button 
                onClick={() => setMobileDrawerOpen(false)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
                aria-label="Close navigation menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-5 pb-2 text-[10px] font-bold tracking-widest uppercase text-emerald-300/60 flex justify-between items-center">
              <span>Teacher Navigation</span>
              <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[9px] font-semibold">APPROVED</span>
            </div>

            <nav className="flex-1 flex flex-col gap-1.5 px-3 overflow-y-auto">
              {NAV_ITEMS.map(item => {
                const active = isActive(item.href)
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => setMobileDrawerOpen(false)}
                    className={`flex items-center gap-3.5 px-3.5 py-3 rounded-xl transition-all relative text-sm active:scale-[0.98] ${
                      active 
                        ? 'bg-emerald-500/20 text-emerald-300 font-semibold shadow-inner' 
                        : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {active && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 rounded-r-full bg-emerald-500" />
                    )}
                    <item.icon className={`w-5 h-5 shrink-0 ${active ? 'text-emerald-400' : 'text-slate-500'}`} />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>

            <div className="px-4 pt-4 border-t border-slate-800/80 mt-auto">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs text-slate-400 font-medium">Faculty Active</span>
                </div>
                <LogoutButton />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header */}
        <header className="h-14 sm:h-16 shrink-0 border-b border-slate-200/80 bg-white/95 backdrop-blur-md flex items-center px-3 sm:px-6 md:px-8 justify-between gap-2 sm:gap-4 sticky top-0 z-30 transition-shadow">
          <div className="flex items-center gap-2 sm:gap-3 flex-1 max-w-md">
            {/* Hamburger trigger for mobile with comfortable 40px touch zone */}
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              className="md:hidden w-10 h-10 rounded-xl border border-slate-200/80 bg-slate-50 flex items-center justify-center text-slate-700 hover:text-slate-900 hover:bg-slate-100 active:scale-95 transition-all shrink-0"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Mobile Brand Name */}
            <div className="flex items-center gap-1.5 sm:hidden shrink-0">
              <div className="w-6 h-6 rounded-lg bg-emerald-600 flex items-center justify-center text-white text-[10px] font-bold">⚡</div>
              <span className="font-bold text-xs text-slate-900 tracking-tight">Faculty</span>
            </div>

            <GlobalSearchBar role="teacher" placeholder="Search courses, live rooms, students..." />
          </div>
          
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <Link
              href="/dashboard/teacher/live/MainStudio"
              className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 bg-red-50 text-red-600 font-bold text-xs sm:text-sm rounded-xl hover:bg-red-100 active:scale-95 transition-all shrink-0 border border-red-200/60"
              title="Enter Live Broadcast Studio"
            >
              <Radio className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-pulse text-red-600" />
              <span className="hidden sm:inline">Go Live</span>
            </Link>
            <NotificationBell />
            <div className="hidden sm:block">
              <LogoutButton />
            </div>
            <UserHeaderBadge />
          </div>
        </header>
        
        {/* Scrollable Page Body with comfortable bottom padding for mobile floating dock */}
        <div className="flex-1 overflow-auto bg-slate-50 p-3 sm:p-6 md:p-8 pb-24 md:pb-8">
          {children}
        </div>

        {/* Mobile Ergonomic Floating Bottom Navigation Bar */}
        <nav 
          aria-label="Mobile Navigation"
          className="md:hidden fixed bottom-3 left-3 right-3 z-40 bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] flex items-center justify-around px-1.5 py-1.5 transition-all"
        >
          <Link
            href="/dashboard/teacher"
            className={`flex flex-col items-center justify-center gap-1 py-1.5 px-2.5 rounded-xl text-[10px] font-semibold transition-all duration-200 active:scale-90 flex-1 min-h-[44px] ${
              pathname === '/dashboard/teacher'
                ? 'text-emerald-600 bg-emerald-50 shadow-xs font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <LayoutDashboard className={`w-4 h-4 transition-transform ${pathname === '/dashboard/teacher' ? 'scale-110' : ''}`} />
            <span className="tracking-tight">Home</span>
          </Link>

          <Link
            href="/dashboard/teacher/messages"
            className={`flex flex-col items-center justify-center gap-1 py-1.5 px-2.5 rounded-xl text-[10px] font-semibold transition-all duration-200 active:scale-90 flex-1 min-h-[44px] ${
              pathname.startsWith('/dashboard/teacher/messages')
                ? 'text-emerald-600 bg-emerald-50 shadow-xs font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageSquare className={`w-4 h-4 transition-transform ${pathname.startsWith('/dashboard/teacher/messages') ? 'scale-110' : ''}`} />
            <span className="tracking-tight">Chat</span>
          </Link>

          <Link
            href="/dashboard/teacher/live/MainStudio"
            className={`flex flex-col items-center justify-center gap-1 py-1.5 px-2 rounded-xl text-[10px] font-bold transition-all duration-200 active:scale-90 flex-1 min-h-[44px] ${
              pathname.startsWith('/dashboard/teacher/live')
                ? 'text-red-600 bg-red-50 shadow-xs'
                : 'text-red-500 hover:text-red-700'
            }`}
          >
            <Radio className="w-4 h-4 animate-pulse" />
            <span className="tracking-tight">Go Live</span>
          </Link>

          <Link
            href="/dashboard/teacher/schedules"
            className={`flex flex-col items-center justify-center gap-1 py-1.5 px-2.5 rounded-xl text-[10px] font-semibold transition-all duration-200 active:scale-90 flex-1 min-h-[44px] ${
              pathname.startsWith('/dashboard/teacher/schedules')
                ? 'text-emerald-600 bg-emerald-50 shadow-xs font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar className={`w-4 h-4 transition-transform ${pathname.startsWith('/dashboard/teacher/schedules') ? 'scale-110' : ''}`} />
            <span className="tracking-tight">Schedule</span>
          </Link>

          <button
            type="button"
            onClick={() => setMobileDrawerOpen(true)}
            className="flex flex-col items-center justify-center gap-1 py-1.5 px-2.5 rounded-xl text-[10px] font-semibold text-slate-500 hover:text-slate-800 active:scale-90 transition-all flex-1 min-h-[44px]"
            aria-label="Open full menu"
          >
            <Menu className="w-4 h-4" />
            <span className="tracking-tight">More</span>
          </button>
        </nav>
      </main>
    </div>
  )
}
