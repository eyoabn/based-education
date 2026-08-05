"use client"

import { type ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Search, LayoutDashboard, UserCheck, Users, CreditCard } from "lucide-react"
import NotificationBell from "@/components/notifications/NotificationBell"
import LogoutButton from "@/components/auth/LogoutButton"

const NAV_ITEMS = [
  { id: 'analytics', label: 'Platform Analytics', icon: LayoutDashboard, href: '/dashboard/admin' },
  { id: 'approvals', label: 'Pending Approvals', icon: UserCheck, href: '/dashboard/admin/approvals' },
  { id: 'users', label: 'User Management', icon: Users, href: '/dashboard/admin/users' },
  { id: 'monetization', label: 'Monetization', icon: CreditCard, href: '/dashboard/admin/monetization' },
]

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  // The overview lives at the section root, so it only matches exactly —
  // a prefix test would light it up on every child route.
  const isActive = (href: string) =>
    href === '/dashboard/admin' ? pathname === href : pathname.startsWith(href)

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

        <div className="px-5 pb-2 text-[10px] font-bold tracking-widest uppercase text-slate-400/50 flex justify-between items-center">
          Super Admin
          <span className="px-1.5 py-0.5 rounded-full bg-slate-700 text-slate-300 text-[9px]">ROOT</span>
        </div>

        <nav className="flex-1 flex flex-col gap-1 px-3 mt-2">
          {NAV_ITEMS.map(item => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.id}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all relative group ${
                  active 
                    ? 'bg-slate-700/50 text-white font-semibold' 
                    : 'hover:bg-white/5 hover:text-white'
                }`}
              >
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-slate-400" />
                )}
                <item.icon className={`w-5 h-5 ${active ? 'text-slate-300' : 'text-slate-500 group-hover:text-slate-400'}`} />
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
              placeholder="Search platform..."
              className="w-full pl-9 pr-4 py-2 bg-slate-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-slate-500 focus:outline-none transition-shadow"
            />
          </div>
          
          <div className="flex items-center gap-6 ml-4">
            <NotificationBell />
            <LogoutButton />
            <div className="flex items-center gap-3 pl-6 border-l border-slate-200">
              <div className="text-right">
                <div className="text-sm font-semibold text-slate-700">System Admin</div>
                <div className="text-xs text-slate-500">Root Access</div>
              </div>
              <div className="w-9 h-9 rounded-full bg-slate-200 border-2 border-slate-300 overflow-hidden">
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Admin" alt="Avatar" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        </header>
        
        <div className="flex-1 overflow-auto bg-slate-50 p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
