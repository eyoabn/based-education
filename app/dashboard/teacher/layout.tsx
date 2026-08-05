import { type ReactNode } from "react"
import Link from "next/link"
import { Search, LayoutDashboard, Rss, Video, Calendar, Users, FileText, GraduationCap, Radio } from "lucide-react"
import NotificationBell from "@/components/notifications/NotificationBell"
import MaintenanceGate from "@/components/admin/MaintenanceGate"
import LogoutButton from "@/components/auth/LogoutButton"

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, href: '/dashboard/teacher' },
  { id: 'feed', label: 'Post Stream', icon: Rss, href: '/dashboard/teacher/feed' },
  { id: 'studio', label: 'Go Live Studio', icon: Video, href: '/dashboard/teacher/studio' },
  { id: 'schedules', label: 'Schedules', icon: Calendar, href: '/dashboard/teacher/schedules' },
  { id: 'attendance', label: 'Student Attendance', icon: Users, href: '/dashboard/teacher/attendance' },
  { id: 'exams', label: 'Exams & Tasks', icon: FileText, href: '/dashboard/teacher/exams' },
  { id: 'grading', label: 'Grading', icon: GraduationCap, href: '/dashboard/teacher/grading' },
]

export default function TeacherLayout({ children }: { children: ReactNode }) {
  return (
    <MaintenanceGate>
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

        <div className="px-5 pb-2 text-[10px] font-bold tracking-widest uppercase text-emerald-300/50 flex justify-between items-center">
          Teacher Portal
          <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[9px]">APPROVED</span>
        </div>

        <nav className="flex-1 flex flex-col gap-1 px-3 mt-2">
          {NAV_ITEMS.map(item => {
            const active = item.id === 'overview'
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

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header */}
        <header className="h-16 shrink-0 border-b border-slate-200 bg-white flex items-center px-8 justify-between">
          <div className="flex-1 max-w-md relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Search students, resources..."
              className="w-full pl-9 pr-4 py-2 bg-slate-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-shadow"
            />
          </div>
          
          <div className="flex items-center gap-6 ml-4">
            <NotificationBell />
            <LogoutButton />
            <button className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 font-semibold text-sm rounded-lg hover:bg-red-100 transition-colors">
              <Radio className="w-4 h-4 animate-pulse" />
              Go Live
            </button>
            <div className="flex items-center gap-3 pl-6 border-l border-slate-200">
              <div className="text-right">
                <div className="text-sm font-semibold text-slate-700">Dr. Alex Morgan</div>
                <div className="text-xs text-slate-500">Pro Tier</div>
              </div>
              <div className="w-9 h-9 rounded-full bg-emerald-100 border-2 border-emerald-200 overflow-hidden">
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Alex" alt="Avatar" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        </header>
        
        <div className="flex-1 overflow-auto bg-slate-50 p-8">
          {children}
        </div>
      </main>
    </div>
    </MaintenanceGate>
  )
}
