import { type ReactNode } from "react"
import { connection } from "next/server"
import { Wrench } from "lucide-react"
import { getPlatformSettings } from "@/lib/adminAuth"

/**
 * Enforces the maintenance-mode switch for non-admin surfaces.
 *
 * This lives in a server component rather than in `proxy.ts` because the flag
 * is a database row and edge middleware cannot reach Postgres. Wrap a dashboard
 * layout's tree in it and the layout keeps its own structure.
 *
 * Two deliberate choices:
 *
 * - `connection()` opts the segment out of static prerendering. Without it the
 *   layout would be baked at build time and the switch would never take effect.
 * - It **fails open**. If the settings read throws, users get the platform, not
 *   a lockout screen — a database blip must not look like planned downtime.
 *   Admins are unaffected either way; this component is never used on
 *   `/dashboard/admin`, so an operator can always get back in to switch it off.
 */
export default async function MaintenanceGate({ children }: { children: ReactNode }) {
  await connection()

  let maintenance = false
  let note: string | null = null

  try {
    const settings = await getPlatformSettings()
    maintenance = settings.maintenanceMode
    note = settings.maintenanceNote
  } catch {
    return <>{children}</>
  }

  if (!maintenance) return <>{children}</>

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans p-6">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-5">
          <Wrench className="w-7 h-7" />
        </div>

        <h1 className="text-xl font-bold text-slate-900 mb-2">EduConnect is under maintenance</h1>
        <p className="text-sm text-slate-600 leading-relaxed">
          {note ||
            "We are carrying out scheduled work on the platform. Classes, exams and messages will be available again shortly."}
        </p>

        <p className="text-xs text-slate-400 mt-6">
          Your work is saved. Refresh this page once maintenance has finished.
        </p>
      </div>
    </div>
  )
}
