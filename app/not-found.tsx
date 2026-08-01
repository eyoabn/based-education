import Link from "next/link"
import { cookies } from "next/headers"
import { Compass, LifeBuoy, Search } from "lucide-react"
import SmartDashboardLink from "@/components/ui/SmartDashboardLink"
import { verifyToken } from "@/lib/auth"
import type { Role } from "@/lib/e2e-triggers"

export const metadata = {
  title: "Page not found · EduConnect",
}

/**
 * Phase 7 — custom 404.
 *
 * A server component so the session cookie can be decoded before the first
 * paint: the primary button points at the visitor's own dashboard rather than
 * a generic home link, and the quick links below it are filtered to routes
 * that role can actually reach. Signed-out visitors get the sign-in path
 * instead of a dead end.
 */
async function resolveRole(): Promise<Role | null> {
  const token = (await cookies()).get("token")?.value
  if (!token) return null

  const session = await verifyToken(token)
  return session?.role ?? null
}

const QUICK_LINKS: Record<Role, { href: string; label: string }[]> = {
  STUDENT: [
    { href: "/dashboard/student/feed", label: "My Feed" },
    { href: "/dashboard/student/calendar", label: "Calendar" },
    { href: "/dashboard/student/exams", label: "Exams" },
    { href: "/dashboard/student/gradebook", label: "Gradebook" },
  ],
  TEACHER: [
    { href: "/dashboard/teacher/feed", label: "Post Stream" },
    { href: "/dashboard/teacher/schedules", label: "Schedules" },
    { href: "/dashboard/teacher/attendance", label: "Attendance" },
    { href: "/dashboard/teacher/grading", label: "Grading" },
  ],
  ADMIN: [
    { href: "/dashboard/admin", label: "Platform Analytics" },
    { href: "/dashboard/admin/approvals", label: "Pending Approvals" },
    { href: "/dashboard/admin/users", label: "User Management" },
    { href: "/dashboard/admin/monetization", label: "Monetization" },
  ],
}

export default async function NotFound() {
  const role = await resolveRole()
  const links = role ? QUICK_LINKS[role] : []

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-900 px-6 py-16 font-sans">
      {/* Branded ambience — two soft indigo/emerald blooms behind a fine grid. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-40 -top-40 h-[420px] w-[420px] rounded-full bg-indigo-600/20 blur-[120px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-32 h-[420px] w-[420px] rounded-full bg-emerald-500/10 blur-[120px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />

      <div className="animate-fade-up relative z-10 w-full max-w-xl text-center">
        {/* Brand lockup */}
        <div className="mb-10 flex items-center justify-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-[0_4px_12px_rgba(79,70,229,0.4)]">
            <span className="text-sm font-bold text-white">⚡</span>
          </div>
          <span className="text-lg font-bold tracking-tight text-white">EduConnect</span>
        </div>

        {/* The 404 itself: outlined numerals with a compass in place of the zero. */}
        <div className="mb-8 flex items-center justify-center gap-1 select-none" aria-hidden>
          <span className="font-mono text-[110px] font-bold leading-none text-transparent [-webkit-text-stroke:2px_rgba(129,140,248,0.55)]">
            4
          </span>
          <span className="relative mx-1 flex h-[96px] w-[96px] items-center justify-center">
            <span className="absolute inset-0 rounded-full border-2 border-indigo-400/50" />
            <span className="absolute inset-0 rounded-full bg-indigo-500/10 blur-md" />
            <Compass className="h-11 w-11 text-indigo-300" strokeWidth={1.5} />
          </span>
          <span className="font-mono text-[110px] font-bold leading-none text-transparent [-webkit-text-stroke:2px_rgba(129,140,248,0.55)]">
            4
          </span>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Page Not Found
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-400">
          This lecture hall doesn&apos;t exist. The link may be out of date, or the class it
          pointed to has been removed.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <SmartDashboardLink
            serverRole={role}
            label={role ? "Return to Dashboard" : "Sign in to EduConnect"}
          />
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
          >
            <Search className="h-4 w-4" />
            Browse EduConnect
          </Link>
        </div>

        {links.length > 0 && (
          <div className="mt-12 border-t border-white/5 pt-8">
            <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Or jump straight to
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {links.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-full border border-white/10 px-3.5 py-1.5 text-xs font-semibold text-slate-400 transition-colors hover:border-indigo-400/40 hover:bg-indigo-500/10 hover:text-indigo-300"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        )}

        <p className="mt-10 flex items-center justify-center gap-1.5 text-xs text-slate-600">
          <LifeBuoy className="h-3.5 w-3.5" />
          Still stuck? Contact your institution administrator.
        </p>
      </div>
    </div>
  )
}
