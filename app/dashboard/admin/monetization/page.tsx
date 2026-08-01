"use client"

import { useCallback, useEffect, useState } from "react"
import {
  AlertCircle,
  Check,
  CreditCard,
  History,
  Loader2,
  Pencil,
  Percent,
  TrendingUp,
  X,
} from "lucide-react"
import RevenueChart from "@/components/admin/RevenueChart"
import {
  AUDIT_LABEL,
  AUDIT_STYLE,
  formatCount,
  formatDateTime,
  formatMoney,
  INTERVAL_LABEL,
  ROLE_LABEL,
  type AnalyticsResponse,
  type AuditEntry,
  type BillingInterval,
  type PlanRow,
  type PlatformSettings,
  type RevenuePoint,
} from "@/lib/admin"

/**
 * Monetization & audit.
 *
 * Three things live here because they answer one question between them: what
 * the platform earned (chart), what it charges for (plans), and who changed
 * any of it (audit log).
 */

interface PlanDraft {
  name: string
  priceDollars: string
  interval: BillingInterval
  features: string
  isActive: boolean
}

function draftOf(plan: PlanRow): PlanDraft {
  return {
    name: plan.name,
    // Editing happens in dollars because that is how a price is thought about;
    // it is converted back to integer cents on save and never stored as a float.
    priceDollars: (plan.priceCents / 100).toFixed(2),
    interval: plan.interval,
    features: plan.features.join("\n"),
    isActive: plan.isActive,
  }
}

export default function AdminMonetizationPage() {
  const [revenue, setRevenue] = useState<RevenuePoint[]>([])
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([])
  const [plans, setPlans] = useState<PlanRow[]>([])
  const [settings, setSettings] = useState<PlatformSettings | null>(null)
  const [metrics, setMetrics] = useState<AnalyticsResponse["metrics"] | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<PlanDraft | null>(null)
  const [savingPlan, setSavingPlan] = useState(false)

  const [commissionDraft, setCommissionDraft] = useState("")
  const [savingCommission, setSavingCommission] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [analyticsRes, platformRes] = await Promise.all([
        fetch("/api/admin/analytics", { cache: "no-store" }),
        fetch("/api/admin/platform", { cache: "no-store" }),
      ])
      const [analytics, platform] = await Promise.all([analyticsRes.json(), platformRes.json()])

      if (!analyticsRes.ok || !platformRes.ok) {
        setError(analytics.error ?? platform.error ?? "Could not load monetization data.")
        return
      }

      setRevenue(analytics.revenue ?? [])
      setAuditLog(analytics.auditLog ?? [])
      setMetrics(analytics.metrics ?? null)
      setPlans(platform.plans ?? [])
      setSettings(platform.settings ?? analytics.settings ?? null)
      setCommissionDraft(String(platform.settings?.commissionPct ?? 15))
      setError(null)
    } catch {
      setError("Could not reach the server.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 5000)
    return () => clearTimeout(timer)
  }, [toast])

  async function saveCommission() {
    const pct = Number(commissionDraft)
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      setError("The commission rate must be between 0 and 100.")
      return
    }

    setSavingCommission(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/platform", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commissionPct: pct }),
      })
      const payload = await res.json()

      if (!res.ok) {
        setError(payload.error ?? "Could not update the commission rate.")
        return
      }

      setSettings(payload.settings)
      setToast(`Platform commission is now ${payload.settings.commissionPct}%.`)
    } catch {
      setError("Could not reach the server.")
    } finally {
      setSavingCommission(false)
    }
  }

  async function savePlan(planId: string) {
    if (!draft) return

    const dollars = Number(draft.priceDollars)
    if (!draft.name.trim()) {
      setError("A plan needs a name.")
      return
    }
    if (!Number.isFinite(dollars) || dollars < 0) {
      setError("Enter a price of zero or more.")
      return
    }

    setSavingPlan(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/platform", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: "PLAN",
          planId,
          name: draft.name.trim(),
          priceCents: Math.round(dollars * 100),
          interval: draft.interval,
          features: draft.features
            .split("\n")
            .map(line => line.trim())
            .filter(Boolean),
          isActive: draft.isActive,
        }),
      })
      const payload = await res.json()

      if (!res.ok) {
        setError(payload.error ?? "Could not save the plan.")
        return
      }

      setPlans(payload.plans ?? [])
      setEditingId(null)
      setDraft(null)
      setToast(`${draft.name.trim()} was updated.`)
    } catch {
      setError("Could not reach the server.")
    } finally {
      setSavingPlan(false)
    }
  }

  function startEdit(plan: PlanRow) {
    setEditingId(plan.id)
    setDraft(draftOf(plan))
    setError(null)
  }

  const lifetimeGross = plans.reduce((total, plan) => total + plan.grossCents, 0)
  const commissionDirty = settings !== null && Number(commissionDraft) !== settings.commissionPct

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto flex items-center gap-3 text-slate-500">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Loading revenue and plans…</span>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 mb-1 flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-slate-400" />
          Monetization
        </h1>
        <p className="text-slate-500">
          Earnings, commission payouts, subscription tiers and the administrative audit trail.
        </p>
      </div>

      {toast && (
        <div className="flex items-start gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800">
          <Check className="w-4 h-4 shrink-0 mt-0.5" />
          {toast}
        </div>
      )}
      {error && (
        <div className="flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Money at a glance */}
      {metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Gross this month
            </h3>
            <div className="text-3xl font-bold text-slate-900 tracking-tight mt-1">
              {formatMoney(metrics.revenueCents, { compact: true })}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Commission this month
            </h3>
            <div className="text-3xl font-bold text-slate-900 tracking-tight mt-1">
              {formatMoney(metrics.commissionCents, { compact: true })}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Lifetime plan revenue
            </h3>
            <div className="text-3xl font-bold text-slate-900 tracking-tight mt-1">
              {formatMoney(lifetimeGross, { compact: true })}
            </div>
          </div>
        </div>
      )}

      <RevenueChart
        data={revenue}
        title="Monthly earnings"
        subtitle="Platform commission and teacher payouts over the last 12 months"
      />

      {/* Commission rate */}
      {settings && (
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-bold text-slate-900 flex items-center gap-2">
                <Percent className="w-4 h-4 text-slate-400" />
                Platform commission rate
              </h2>
              <p className="text-sm text-slate-500 mt-1 max-w-lg">
                The share the platform keeps from each teacher transaction. Changes apply to future
                payments only — settled records are never rewritten.
              </p>
            </div>

            <div className="flex items-end gap-2">
              <div>
                <label
                  htmlFor="commission"
                  className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5"
                >
                  Rate
                </label>
                <div className="relative">
                  <input
                    id="commission"
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={commissionDraft}
                    onChange={event => setCommissionDraft(event.target.value)}
                    className="w-28 pl-3 pr-8 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 tabular-nums focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                    %
                  </span>
                </div>
              </div>

              <button
                onClick={() => void saveCommission()}
                disabled={savingCommission || !commissionDirty}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingCommission && <Loader2 className="w-4 h-4 animate-spin" />}
                Save rate
              </button>
            </div>
          </div>

          {settings.updatedAt && (
            <p className="text-xs text-slate-400 mt-3">
              Settings last changed {formatDateTime(settings.updatedAt)}.
            </p>
          )}
        </section>
      )}

      {/* Subscription plans */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-900 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-slate-400" />
            Subscription plans
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Teacher tier pricing and platform access fees
          </p>
        </div>

        {plans.length === 0 ? (
          <p className="px-5 py-10 text-sm text-slate-500 text-center">
            No plans configured yet.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {plans.map(plan => {
              const editing = editingId === plan.id

              if (editing && draft) {
                return (
                  <li key={plan.id} className="p-5 bg-slate-50/70">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5">
                          Plan name
                        </label>
                        <input
                          value={draft.name}
                          onChange={event => setDraft({ ...draft, name: event.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div className="flex gap-3">
                        <div className="flex-1">
                          <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5">
                            Price (USD)
                          </label>
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            value={draft.priceDollars}
                            onChange={event =>
                              setDraft({ ...draft, priceDollars: event.target.value })
                            }
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 tabular-nums focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div className="w-32">
                          <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5">
                            Billed
                          </label>
                          <select
                            value={draft.interval}
                            onChange={event =>
                              setDraft({
                                ...draft,
                                interval: event.target.value as BillingInterval,
                              })
                            }
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="MONTHLY">Monthly</option>
                            <option value="YEARLY">Yearly</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5">
                        Features
                        <span className="ml-2 font-normal normal-case tracking-normal text-slate-400">
                          one per line
                        </span>
                      </label>
                      <textarea
                        value={draft.features}
                        onChange={event => setDraft({ ...draft, features: event.target.value })}
                        rows={4}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
                      <label className="inline-flex items-center gap-2 text-sm text-slate-600">
                        <input
                          type="checkbox"
                          checked={draft.isActive}
                          onChange={event =>
                            setDraft({ ...draft, isActive: event.target.checked })
                          }
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        Available for new subscribers
                      </label>

                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingId(null)
                            setDraft(null)
                          }}
                          disabled={savingPlan}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
                        >
                          <X className="w-4 h-4" />
                          Cancel
                        </button>
                        <button
                          onClick={() => void savePlan(plan.id)}
                          disabled={savingPlan}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors disabled:opacity-60"
                        >
                          {savingPlan ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                          Save plan
                        </button>
                      </div>
                    </div>
                  </li>
                )
              }

              return (
                <li key={plan.id} className="px-5 py-4 flex flex-wrap items-start gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-slate-900">{plan.name}</h3>
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold">
                        {ROLE_LABEL[plan.audience]}
                      </span>
                      {!plan.isActive && (
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 ring-1 ring-inset ring-slate-200 text-[11px] font-semibold">
                          Retired
                        </span>
                      )}
                    </div>

                    {plan.features.length > 0 && (
                      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                        {plan.features.map(feature => (
                          <li
                            key={feature}
                            className="inline-flex items-center gap-1.5 text-xs text-slate-500"
                          >
                            <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="text-right">
                    <div className="text-xl font-bold text-slate-900 tracking-tight tabular-nums">
                      {plan.priceCents === 0 ? "Free" : formatMoney(plan.priceCents)}
                      {plan.priceCents > 0 && (
                        <span className="text-sm font-medium text-slate-400">
                          {INTERVAL_LABEL[plan.interval]}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                      {formatCount(plan.subscriberCount)} subscriber
                      {plan.subscriberCount === 1 ? "" : "s"} ·{" "}
                      {formatMoney(plan.grossCents, { compact: true })} lifetime
                    </p>
                  </div>

                  <button
                    onClick={() => startEdit(plan)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-colors shrink-0"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* Audit log */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-900 flex items-center gap-2">
            <History className="w-4 h-4 text-slate-400" />
            System audit log
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Append-only record of every administrative action
          </p>
        </div>

        {auditLog.length === 0 ? (
          <p className="px-5 py-10 text-sm text-slate-500 text-center">
            No administrative actions recorded yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Action
                  </th>
                  <th className="text-left px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Detail
                  </th>
                  <th className="text-left px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Administrator
                  </th>
                  <th className="text-right px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Timestamp
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLog.map(entry => (
                  <tr key={entry.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ring-1 ring-inset ${
                          AUDIT_STYLE[entry.action]
                        }`}
                      >
                        {AUDIT_LABEL[entry.action]}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{entry.summary}</td>
                    <td className="px-5 py-3 text-slate-700 font-medium whitespace-nowrap">
                      {entry.adminName}
                    </td>
                    <td className="px-5 py-3 text-right text-slate-500 tabular-nums whitespace-nowrap">
                      {formatDateTime(entry.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
