"use client"

import { type ReactNode, useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Search, LayoutDashboard, UserCheck, Users, CreditCard, Database, MessageSquareWarning, Menu, X } from "lucide-react"
import NotificationBell from "@/components/notifications/NotificationBell"
import LogoutButton from "@/components/auth/LogoutButton"
import UserHeaderBadge from "@/components/auth/UserHeaderBadge"

const NAV_ITEMS = [
  { id: 'analytics', label: 'Platform Analytics', icon: LayoutDashboard, href: '/dashboard/admin' },
  { id: 'approvals', label: 'Pending Approvals', icon: UserCheck, href: '/dashboard/admin/approvals' },
  { id: 'users', label: 'User Management', icon: Users, href: '/dashboard/admin/users' },
  { id: 'monetization', label: 'Monetization', icon: CreditCard, href: '/dashboard/admin/monetization' },
  { id: 'database', label: 'Database & Storage', icon: Database, href: '/dashboard/admin/database' },
  { id: 'feedback', label: 'Bug Reports & Feedback', icon: MessageSquareWarning, href: '/dashboard/admin/feedback' },
]

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)

  useEffect(() => {
    setMobileDrawerOpen(false)
  }, [pathname])

  // The overview lives at the section root, so it only matches exactly —
  // a prefix test would light it up on every child route.
  const isActive = (href: string) =>
    href === '/dashboard/admin' ? pathname === href : pathname.startsWith(href)

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
              <span className="font-bold text-lg text-white tracking-tight block leading-tight">EduConnect</span>
              <span className="text-[10px] text-slate-400 font-medium">Administration Hub</span>
            </div>
          </div>
        </div>

        <div className="px-5 pb-2 text-[10px] font-bold tracking-widest uppercase text-slate-400/60 flex justify-between items-center">
          <span>Super Admin</span>
          <span className="px-1.5 py-0.5 rounded-full bg-slate-700 text-slate-300 text-[9px] font-semibold">ROOT</span>
        </div>

        <nav className="flex-1 flex flex-col gap-1 px-3 mt-1 overflow-y-auto">
          {NAV_ITEMS.map(item => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.id}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all relative group text-sm ${
                  active 
                    ? 'bg-slate-700/50 text-white font-semibold shadow-inner' 
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-slate-400" />
                )}
                <item.icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${active ? 'text-slate-200' : 'text-slate-500 group-hover:text-slate-300'}`} />
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
              <span className="text-xs text-slate-400 font-medium">Admin Session</span>
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
                  <span className="font-bold text-base text-white tracking-tight block leading-tight">EduConnect</span>
                  <span className="text-[10px] text-slate-400 font-medium">Super Admin</span>
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

            <div className="px-5 pb-2 text-[10px] font-bold tracking-widest uppercase text-slate-400/60 flex justify-between items-center">
              <span>Super Admin Navigation</span>
              <span className="px-1.5 py-0.5 rounded-full bg-slate-700 text-slate-300 text-[9px] font-semibold">ROOT</span>
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
                        ? 'bg-slate-700/50 text-white font-semibold shadow-inner' 
                        : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {active && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 rounded-r-full bg-slate-400" />
                    )}
                    <item.icon className={`w-5 h-5 shrink-0 ${active ? 'text-slate-200' : 'text-slate-500'}`} />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>

            <div className="px-4 pt-4 border-t border-slate-800/80 mt-auto">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/40 border border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs text-slate-400 font-medium">Root Access</span>
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
              <div className="w-6 h-6 rounded-lg bg-slate-900 flex items-center justify-center text-white text-[10px] font-bold">⚡</div>
              <span className="font-bold text-xs text-slate-900 tracking-tight">Admin</span>
            </div>

            <div className="flex-1 relative hidden sm:block">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text"
                placeholder="Search platform..."
                className="w-full pl-9 pr-3 py-1.5 sm:py-2 bg-slate-100 border-none rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-slate-500 focus:outline-none transition-shadow"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
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
            href="/dashboard/admin"
            className={`flex flex-col items-center justify-center gap-1 py-1.5 px-2 rounded-xl text-[10px] font-semibold transition-all duration-200 active:scale-90 flex-1 min-h-[44px] ${
              pathname === '/dashboard/admin'
                ? 'text-indigo-600 bg-indigo-50 shadow-xs font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <LayoutDashboard className={`w-4 h-4 transition-transform ${pathname === '/dashboard/admin' ? 'scale-110' : ''}`} />
            <span className="tracking-tight">Analytics</span>
          </Link>

          <Link
            href="/dashboard/admin/approvals"
            className={`flex flex-col items-center justify-center gap-1 py-1.5 px-2 rounded-xl text-[10px] font-semibold transition-all duration-200 active:scale-90 flex-1 min-h-[44px] ${
              pathname.startsWith('/dashboard/admin/approvals')
                ? 'text-indigo-600 bg-indigo-50 shadow-xs font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserCheck className={`w-4 h-4 transition-transform ${pathname.startsWith('/dashboard/admin/approvals') ? 'scale-110' : ''}`} />
            <span className="tracking-tight">Approvals</span>
          </Link>

          <Link
            href="/dashboard/admin/users"
            className={`flex flex-col items-center justify-center gap-1 py-1.5 px-2 rounded-xl text-[10px] font-semibold transition-all duration-200 active:scale-90 flex-1 min-h-[44px] ${
              pathname.startsWith('/dashboard/admin/users')
                ? 'text-indigo-600 bg-indigo-50 shadow-xs font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className={`w-4 h-4 transition-transform ${pathname.startsWith('/dashboard/admin/users') ? 'scale-110' : ''}`} />
            <span className="tracking-tight">Users</span>
          </Link>

          <Link
            href="/dashboard/admin/feedback"
            className={`flex flex-col items-center justify-center gap-1 py-1.5 px-2 rounded-xl text-[10px] font-semibold transition-all duration-200 active:scale-90 flex-1 min-h-[44px] ${
              pathname.startsWith('/dashboard/admin/feedback')
                ? 'text-indigo-600 bg-indigo-50 shadow-xs font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageSquareWarning className={`w-4 h-4 transition-transform ${pathname.startsWith('/dashboard/admin/feedback') ? 'scale-110' : ''}`} />
            <span className="tracking-tight">Reports</span>
          </Link>

          <button
            type="button"
            onClick={() => setMobileDrawerOpen(true)}
            className="flex flex-col items-center justify-center gap-1 py-1.5 px-2 rounded-xl text-[10px] font-semibold text-slate-500 hover:text-slate-800 active:scale-90 transition-all flex-1 min-h-[44px]"
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
