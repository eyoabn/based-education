"use client"

import { type ReactNode, useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Search, LayoutDashboard, Rss, Video, Calendar, Users, FileText, GraduationCap, Radio, MessageSquare, Menu, X } from "lucide-react"
import NotificationBell from "@/components/notifications/NotificationBell"
import LogoutButton from "@/components/auth/LogoutButton"
import UserHeaderBadge from "@/components/auth/UserHeaderBadge"

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, href: '/dashboard/teacher' },
  { id: 'messages', label: 'Messages', icon: MessageSquare, href: '/dashboard/teacher/messages' },
  { id: 'feed', label: 'Post Stream', icon: Rss, href: '/dashboard/teacher/feed' },
  { id: 'studio', label: 'Go Live Studio', icon: Video, href: '/dashboard/teacher/live/MainStudio' },
  { id: 'schedules', label: 'Schedules', icon: Calendar, href: '/dashboard/teacher/schedules' },
  { id: 'attendance', label: 'Student Attendance', icon: Users, href: '/dashboard/teacher/attendance' },
  { id: 'exams', label: 'Exams & Tasks', icon: FileText, href: '/dashboard/teacher/exams' },
  { id: 'grading', label: 'Grading', icon: GraduationCap, href: '/dashboard/teacher/grading' },
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
      <aside className="hidden md:flex w-[240px] shrink-0 bg-slate-900 flex-col py-6 relative z-10 text-slate-300">
        <div className="px-5 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-[0_4px_12px_rgba(79,70,229,0.4)]">
              <span className="text-white font-bold text-sm"></span>
            </div>
            <span className="font-bold text-lg text-white tracking-tight">BasedEducation</span>
          </div>
        </div>

        <div className="px-5 pb-2 text-[10px] font-bold tracking-widest uppercase text-emerald-300/50 flex justify-between items-center">
          Teacher Portal
          <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[9px]">APPROVED</span>
        </div>

        <nav className="flex-1 flex flex-col gap-1 px-3 mt-2 overflow-y-auto">
          {NAV_ITEMS.map(item => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all relative group ${
                  active 
                    ? 'bg-emerald-500/20 text-emerald-300 font-semibold' 
                    : 'hover:bg-white/5 hover:text-white'
                }`}
              >
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-emerald-500" />
                )}
                <item.icon className={`w-5 h-5 ${active ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-400'}`} />
                <span className="text-sm">{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Mobile Drawer Backdrop & Menu */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div 
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity" 
            onClick={() => setMobileDrawerOpen(false)} 
            aria-hidden="true"
          />
          <div className="relative w-[280px] max-w-[80vw] bg-slate-900 text-slate-300 h-full flex flex-col py-6 shadow-2xl z-50 animate-in slide-in-from-left duration-200">
            <div className="px-5 mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-md">
                  <span className="text-white font-bold text-xs">⚡</span>
                </div>
                <span className="font-bold text-lg text-white tracking-tight">BasedEducation</span>
              </div>
              <button 
                onClick={() => setMobileDrawerOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Close navigation menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-5 pb-2 text-[10px] font-bold tracking-widest uppercase text-emerald-300/50 flex justify-between items-center">
              Teacher Navigation
              <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[9px]">APPROVED</span>
            </div>

            <nav className="flex-1 flex flex-col gap-1 px-3 overflow-y-auto">
              {NAV_ITEMS.map(item => {
                const active = isActive(item.href)
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => setMobileDrawerOpen(false)}
                    className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all relative ${
                      active 
                        ? 'bg-emerald-500/20 text-emerald-300 font-semibold' 
                        : 'hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {active && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-emerald-500" />
                    )}
                    <item.icon className={`w-5 h-5 ${active ? 'text-emerald-400' : 'text-slate-500'}`} />
                    <span className="text-sm">{item.label}</span>
                  </Link>
                )
              })}
            </nav>

            <div className="px-4 pt-4 border-t border-slate-800/80 mt-auto">
              <LogoutButton />
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header */}
        <header className="h-14 sm:h-16 shrink-0 border-b border-slate-200 bg-white flex items-center px-3 sm:px-6 md:px-8 justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 flex-1 max-w-md">
            {/* Hamburger trigger for mobile */}
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              className="md:hidden p-2 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Mobile Brand Name */}
            <span className="font-bold text-sm sm:hidden text-slate-800 shrink-0">BasedEducation</span>

            <div className="flex-1 relative hidden sm:block">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text"
                placeholder="Search students, resources..."
                className="w-full pl-9 pr-3 py-1.5 sm:py-2 bg-slate-100 border-none rounded-lg text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-shadow"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Link
              href="/dashboard/teacher/live/MainStudio"
              className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 bg-red-50 text-red-600 font-bold text-xs sm:text-sm rounded-lg hover:bg-red-100 transition-colors shrink-0"
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
        
        {/* Scrollable Page Body */}
        <div className="flex-1 overflow-auto bg-slate-50 p-3 sm:p-6 md:p-8 pb-20 md:pb-8">
          {children}
        </div>

        {/* Mobile Bottom Navigation Bar */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 flex items-center justify-around px-1 py-1.5 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
          <Link
            href="/dashboard/teacher"
            className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg text-[10px] font-semibold transition-colors ${
              pathname === '/dashboard/teacher'
                ? 'text-emerald-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Overview</span>
          </Link>

          <Link
            href="/dashboard/teacher/messages"
            className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg text-[10px] font-semibold transition-colors ${
              pathname.startsWith('/dashboard/teacher/messages')
                ? 'text-emerald-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Chat</span>
          </Link>

          <Link
            href="/dashboard/teacher/live/MainStudio"
            className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg text-[10px] font-semibold text-red-600 transition-colors`}
          >
            <Radio className="w-4 h-4 animate-pulse" />
            <span className="font-bold">Go Live</span>
          </Link>

          <Link
            href="/dashboard/teacher/schedules"
            className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg text-[10px] font-semibold transition-colors ${
              pathname.startsWith('/dashboard/teacher/schedules')
                ? 'text-emerald-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Schedule</span>
          </Link>

          <button
            type="button"
            onClick={() => setMobileDrawerOpen(true)}
            className="flex flex-col items-center gap-1 py-1 px-2.5 rounded-lg text-[10px] font-semibold text-slate-500 hover:text-slate-800 transition-colors"
          >
            <Menu className="w-4 h-4" />
            <span>More</span>
          </button>
        </nav>
      </main>
    </div>
  )
}
