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
    <div className="flex h-screen overflow-hidden bg-[#050505] text-[#f7f3e8] font-sans selection:bg-[#d4af37] selection:text-black">
      {/* Desktop Sidebar Navigator */}
      <aside className="hidden md:flex w-[240px] shrink-0 bg-[#080808]/95 flex-col py-6 relative z-10 text-[#9d9b95] border-r border-white/[0.08] shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-2xl">
        <div className="px-5 mb-6">
          <Link href="/dashboard/admin" className="flex items-center gap-3 group">
            <img 
              src="/basededucation-logo.jpg" 
              alt="BasedEducation" 
              className="w-9 h-9 rounded-xl border border-[rgba(212,175,55,0.25)] object-cover shadow-[0_0_20px_rgba(212,175,55,0.15)] shrink-0 transition-transform group-hover:scale-105" 
            />
            <div>
              <span className="font-extrabold text-base text-[#f7f3e8] tracking-tight block leading-tight">BasedEducation</span>
              <span className="text-[10px] text-[#9d9b95] font-medium tracking-wide uppercase">Admin Console</span>
            </div>
          </Link>
        </div>

        <div className="px-5 pb-2 text-[10px] font-bold tracking-widest uppercase text-[#6d6b65] flex justify-between items-center">
          <span>Super Admin</span>
          <span className="px-2 py-0.5 rounded-full border border-[rgba(212,175,55,0.2)] bg-[rgba(212,175,55,0.08)] text-[#d4af37] text-[9px] font-extrabold tracking-wider">ROOT</span>
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
                    ? 'bg-gradient-to-r from-[rgba(212,175,55,0.14)] to-[rgba(212,175,55,0.035)] text-[#f7f3e8] font-semibold border-l-2 border-[#d4af37]' 
                    : 'text-[#9d9b95] hover:bg-white/[0.04] hover:text-[#f7f3e8]'
                }`}
              >
                <item.icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${active ? 'text-[#d4af37]' : 'text-[#6d6b65] group-hover:text-[#9d9b95]'}`} />
                <span className="tracking-wide">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Sidebar Footer Accent */}
        <div className="px-4 pt-4 border-t border-white/[0.08] mt-auto">
          <div className="p-3 rounded-xl bg-[#111110] border border-white/[0.08] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              <span className="text-xs text-[#9d9b95] font-medium">Admin Session</span>
            </div>
            <LogoutButton />
          </div>
        </div>
      </aside>

      {/* Mobile Drawer Backdrop & Menu */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex animate-in fade-in duration-200">
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity" 
            onClick={() => setMobileDrawerOpen(false)} 
            aria-hidden="true"
          />
          <div className="relative w-[300px] max-w-[85vw] bg-[#111110] text-[#f7f3e8] h-full flex flex-col py-6 shadow-2xl z-50 animate-in slide-in-from-left duration-300 rounded-r-3xl border-r border-white/[0.08]">
            <div className="px-5 mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img 
                  src="/basededucation-logo.jpg" 
                  alt="BasedEducation" 
                  className="w-9 h-9 rounded-xl border border-[rgba(212,175,55,0.25)] object-cover shadow-sm shrink-0" 
                />
                <div>
                  <span className="font-bold text-base text-[#f7f3e8] tracking-tight block leading-tight">BasedEducation</span>
                  <span className="text-[10px] text-[#9d9b95] font-medium">Super Admin</span>
                </div>
              </div>
              <button 
                onClick={() => setMobileDrawerOpen(false)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-[#9d9b95] hover:text-[#f7f3e8] hover:bg-white/10 active:scale-95 transition-all"
                aria-label="Close navigation menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-5 pb-2 text-[10px] font-bold tracking-widest uppercase text-[#6d6b65]">
              Super Admin Navigation
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
                        ? 'bg-gradient-to-r from-[rgba(212,175,55,0.14)] to-[rgba(212,175,55,0.035)] text-[#f7f3e8] font-semibold border-l-2 border-[#d4af37]' 
                        : 'text-[#9d9b95] hover:bg-white/5 hover:text-[#f7f3e8]'
                    }`}
                  >
                    <item.icon className={`w-5 h-5 shrink-0 ${active ? 'text-[#d4af37]' : 'text-[#6d6b65]'}`} />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>

            <div className="px-4 pt-4 border-t border-white/[0.08] mt-auto">
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#181817] border border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  <span className="text-xs text-[#9d9b95] font-medium">Session Active</span>
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
        <header className="h-14 sm:h-16 shrink-0 border-b border-white/[0.08] bg-[#050505]/85 backdrop-blur-2xl flex items-center px-3 sm:px-6 md:px-8 justify-between gap-2 sm:gap-4 sticky top-0 z-30 transition-shadow">
          <div className="flex items-center gap-2 sm:gap-3 flex-1 max-w-md">
            {/* Hamburger trigger for mobile */}
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              className="md:hidden w-10 h-10 rounded-xl border border-white/[0.08] bg-[#111110] flex items-center justify-center text-[#9d9b95] hover:text-[#f7f3e8] hover:bg-[#181817] active:scale-95 transition-all shrink-0"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Mobile Brand Name */}
            <div className="flex items-center gap-1.5 sm:hidden shrink-0">
              <img 
                src="/basededucation-logo.jpg" 
                alt="BasedEducation" 
                className="w-7 h-7 rounded-lg border border-[rgba(212,175,55,0.25)] object-cover shrink-0" 
              />
              <span className="font-extrabold text-xs text-[#f7f3e8] tracking-tight">Admin</span>
            </div>

            <div className="flex-1 relative hidden sm:block">
              <Search className="w-4 h-4 text-[#6d6b65] absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text"
                placeholder="Search platform..."
                className="w-full pl-9 pr-3 py-1.5 sm:py-2 bg-[#111110] border border-white/[0.08] rounded-xl text-xs sm:text-sm text-[#f7f3e8] placeholder-[#6d6b65] focus:outline-none focus:border-[rgba(212,175,55,0.5)] transition-all"
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
        <div className="flex-1 overflow-auto bg-transparent text-[#f7f3e8] p-3 sm:p-6 md:p-8 pb-32 md:pb-8">
          {children}
        </div>

        {/* Mobile Ergonomic Floating Bottom Navigation Bar */}
        <nav 
          aria-label="Mobile Navigation"
          className="md:hidden fixed bottom-3 left-3 right-3 z-40 bg-[#111110]/90 backdrop-blur-2xl border border-white/[0.12] rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.58)] flex items-center justify-around px-1.5 py-1.5 transition-all"
        >
          <Link
            href="/dashboard/admin"
            className={`flex flex-col items-center justify-center gap-1 py-1.5 px-2 rounded-xl text-[10px] font-semibold transition-all duration-200 active:scale-90 flex-1 min-h-[44px] ${
              pathname === '/dashboard/admin'
                ? 'text-[#d4af37] bg-[rgba(212,175,55,0.1)] shadow-xs font-bold'
                : 'text-[#6d6b65] hover:text-[#9d9b95]'
            }`}
          >
            <LayoutDashboard className={`w-4 h-4 transition-transform ${pathname === '/dashboard/admin' ? 'scale-110' : ''}`} />
            <span className="tracking-tight">Analytics</span>
          </Link>

          <Link
            href="/dashboard/admin/approvals"
            className={`flex flex-col items-center justify-center gap-1 py-1.5 px-2 rounded-xl text-[10px] font-semibold transition-all duration-200 active:scale-90 flex-1 min-h-[44px] ${
              pathname.startsWith('/dashboard/admin/approvals')
                ? 'text-[#d4af37] bg-[rgba(212,175,55,0.1)] shadow-xs font-bold'
                : 'text-[#6d6b65] hover:text-[#9d9b95]'
            }`}
          >
            <UserCheck className={`w-4 h-4 transition-transform ${pathname.startsWith('/dashboard/admin/approvals') ? 'scale-110' : ''}`} />
            <span className="tracking-tight">Approvals</span>
          </Link>

          <Link
            href="/dashboard/admin/users"
            className={`flex flex-col items-center justify-center gap-1 py-1.5 px-2 rounded-xl text-[10px] font-semibold transition-all duration-200 active:scale-90 flex-1 min-h-[44px] ${
              pathname.startsWith('/dashboard/admin/users')
                ? 'text-[#d4af37] bg-[rgba(212,175,55,0.1)] shadow-xs font-bold'
                : 'text-[#6d6b65] hover:text-[#9d9b95]'
            }`}
          >
            <Users className={`w-4 h-4 transition-transform ${pathname.startsWith('/dashboard/admin/users') ? 'scale-110' : ''}`} />
            <span className="tracking-tight">Users</span>
          </Link>

          <Link
            href="/dashboard/admin/feedback"
            className={`flex flex-col items-center justify-center gap-1 py-1.5 px-2 rounded-xl text-[10px] font-semibold transition-all duration-200 active:scale-90 flex-1 min-h-[44px] ${
              pathname.startsWith('/dashboard/admin/feedback')
                ? 'text-[#d4af37] bg-[rgba(212,175,55,0.1)] shadow-xs font-bold'
                : 'text-[#6d6b65] hover:text-[#9d9b95]'
            }`}
          >
            <MessageSquareWarning className={`w-4 h-4 transition-transform ${pathname.startsWith('/dashboard/admin/feedback') ? 'scale-110' : ''}`} />
            <span className="tracking-tight">Reports</span>
          </Link>

          <button
            type="button"
            onClick={() => setMobileDrawerOpen(true)}
            className="flex flex-col items-center justify-center gap-1 py-1.5 px-2 rounded-xl text-[10px] font-semibold text-[#6d6b65] hover:text-[#9d9b95] active:scale-90 transition-all flex-1 min-h-[44px]"
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
