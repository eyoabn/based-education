"use client"

import { useState } from "react"
import { ShieldAlert, Users } from "lucide-react"
import UserManagementTable from "@/components/admin/UserManagementTable"
import { formatCount, type AdminUserListResponse } from "@/lib/admin"

type Counts = AdminUserListResponse["counts"]

/**
 * User governance.
 *
 * The table owns search, filtering, sorting, pagination and every mutation —
 * this page only frames it and mirrors the roll-up counts the table reports
 * back, so the header can't drift from the rows underneath it.
 */
export default function AdminUsersPage() {
  const [counts, setCounts] = useState<Counts | null>(null)

  const summary: { label: string; value: number; tone: string }[] = counts
    ? [
        { label: "Total", value: counts.all, tone: "text-slate-900" },
        { label: "Students", value: counts.students, tone: "text-sky-700" },
        { label: "Teachers", value: counts.teachers, tone: "text-indigo-700" },
        { label: "Admins", value: counts.admins, tone: "text-slate-700" },
        { label: "Pending", value: counts.pending, tone: "text-amber-700" },
        { label: "Suspended", value: counts.banned, tone: "text-red-700" },
      ]
    : []

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 mb-1 flex items-center gap-2">
          <Users className="w-6 h-6 text-slate-400" />
          User Management
        </h1>
        <p className="text-slate-500">
          Change roles, suspend accounts and issue password resets across the platform.
        </p>
      </div>

      {counts && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {summary.map(item => (
            <div
              key={item.label}
              className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3"
            >
              <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
                {item.label}
              </div>
              <div className={`text-2xl font-bold tracking-tight tabular-nums mt-1 ${item.tone}`}>
                {formatCount(item.value)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Suspension revokes live sessions, so say so before anyone reaches for it. */}
      <div className="flex items-start gap-3 px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl">
        <ShieldAlert className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
        <p className="text-sm text-slate-600">
          <span className="font-semibold text-slate-800">Suspending or re-roling an account</span>{" "}
          invalidates its active sign-in tokens immediately — the user is signed out of every device
          on their next request. Every action on this page is written to the audit log against your
          name.
        </p>
      </div>

      <UserManagementTable onCountsChange={setCounts} />
    </div>
  )
}
