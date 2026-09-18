"use client"

import { type ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Search, LayoutDashboard, Rss, Calendar, FileText, GraduationCap, MessageSquare } from "lucide-react"
import NotificationBell from "@/components/notifications/NotificationBell"
import LogoutButton from "@/components/auth/LogoutButton"
import UserHeaderBadge from "@/components/auth/UserHeaderBadge"

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, href: '/dashboard/student' },
  { id: 'messages', label: 'Messages', icon: MessageSquare, href: '/dashboard/student/messages' },
  { id: 'feed', label: 'My Feed', icon: Rss, href: '/dashboard/student/feed' },
  { id: 'calendar', label: 'Calendar', icon: Calendar, href: '/dashboard/student/calendar' },
  { id: 'exams', label: 'Exams', icon: FileText, href: '/dashboard/student/exams' },
  { id: 'gradebook', label: 'Gradebook', icon: GraduationCap, href: '/dashboard/student/gradebook' },
]

export default function StudentLayoutClient({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  if (pathname.includes('/live/')) {
    return <div className="fixed inset-0 w-full h-full overflow-hidden bg-black p-0 m-0 z-50">{children}</div>
  }

  const isActive = (href: string) =>
    href === '/dashboard/student' ? pathname === href : pathname.startsWith(href)

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans">
      {/* Sidebar Navigator */}
      <aside className="w-[240px] shrink-0 bg-slate-900 flex flex-col py-6 relative z-10 text-slate-300">
        <div className="px-5 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-[0_4px_12px_rgba(79,70,229,0.4)]">
              <span className="text-white font-bold text-sm">⚡</span>
            </div>
            <span className="font-bold text-lg text-white tracking-tight">EduConnect</span>
          </div>
        </div>

        <div className="px-5 pb-2 text-[10px] font-bold tracking-widest uppercase text-indigo-300/50">
          Student Portal
        </div>

        <nav className="flex-1 flex flex-col gap-1 px-3">
          {NAV_ITEMS.map(item => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all relative group ${
                  active 
                    ? 'bg-indigo-500/20 text-indigo-300 font-semibold' 
                    : 'hover:bg-white/5 hover:text-white'
                }`}
              >
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-indigo-500" />
                )}
                <item.icon className={`w-5 h-5 ${active ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-400'}`} />
                <span className="text-sm">{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header */}
        <header className="h-16 shrink-0 border-b border-slate-200 bg-white flex items-center px-8 justify-between">
          <div className="flex-1 max-w-md relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Search classes, resources..."
              className="w-full pl-9 pr-4 py-2 bg-slate-100 border-none rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-shadow"
            />
          </div>
          
          <div className="flex items-center gap-6 ml-4">
            <NotificationBell />
            <LogoutButton />
            <UserHeaderBadge />
          </div>
        </header>
        
        <div className="flex-1 overflow-auto bg-slate-50 p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
