"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { LayoutDashboard } from "lucide-react"
import { dashboardHome, recallRole, type Role } from "@/lib/e2e-triggers"

/**
 * Phase 7 — "Return to Dashboard" that knows which dashboard you mean.
 *
 * Resolution runs newest-evidence-first:
 *   1. `serverRole`, decoded from the session cookie during SSR. Authoritative.
 *   2. The cached role in `localStorage`, for anyone whose cookie has expired
 *      but who is about to sign back in as the same role.
 *   3. `/login`.
 *
 * The server-resolved href is rendered on the first paint, so the button is
 * never briefly wrong and the link is crawlable; step 2 only refines the case
 * where the server had nothing to go on.
 */
export default function SmartDashboardLink({
  serverRole,
  className,
  label = "Return to Dashboard",
}: {
  serverRole: Role | null
  className?: string
  label?: string
}) {
  const [href, setHref] = useState(() => dashboardHome(serverRole))

  useEffect(() => {
    if (serverRole) return
    const cached = recallRole()
    if (cached) setHref(dashboardHome(cached))
  }, [serverRole])

  return (
    <Link
      href={href}
      className={
        className ??
        "inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:-translate-y-0.5 hover:bg-indigo-500 hover:shadow-xl hover:shadow-indigo-500/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
      }
    >
      <LayoutDashboard className="h-4 w-4" />
      {label}
    </Link>
  )
}
