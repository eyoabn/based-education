"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AlertTriangle, ArrowLeft, Copy, Check, RotateCw } from "lucide-react"
import { dashboardHome, recallRole } from "@/lib/e2e-triggers"

/**
 * Phase 7 — shared body for every `error.tsx` boundary.
 *
 * A single component behind all four boundaries, because a crash in the admin
 * console and a crash in the student feed deserve the same reassurance: what
 * broke, that the data is safe, a code to quote to support, and one obvious
 * way back.
 *
 * `error.digest` is the only identifier available in production — Next.js
 * strips the message from server component errors before they reach the
 * browser — so it is shown prominently and made copyable rather than buried.
 */

export interface ErrorFallbackProps {
  error: Error & { digest?: string }
  reset: () => void
  /** Portal name for the "back to" link, e.g. "Student Portal". */
  scope?: string
  /** Overrides the role-derived home link. */
  homeHref?: string
}

export default function ErrorFallback({ error, reset, scope, homeHref }: ErrorFallbackProps) {
  const [copied, setCopied] = useState(false)
  const [home, setHome] = useState(homeHref ?? "/")

  // Report once per mount. In production this is where Sentry/Datadog hooks in.
  useEffect(() => {
    console.error("[EduConnect] Unhandled error:", error)
  }, [error])

  useEffect(() => {
    if (!homeHref) setHome(dashboardHome(recallRole()))
  }, [homeHref])

  const reference = error.digest ?? "no-digest"

  const copyReference = async () => {
    try {
      await navigator.clipboard.writeText(reference)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard blocked — the code is on screen and selectable regardless.
    }
  }

  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center p-6">
      <div className="animate-fade-up w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.10)]">
        {/* Amber, not red: this is recoverable, and red reads as data loss. */}
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 via-red-400 to-red-500" />

        <div className="px-8 pb-8 pt-9">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-500 ring-1 ring-red-100">
            <AlertTriangle className="h-7 w-7" strokeWidth={1.75} />
          </div>

          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Oops! Something went wrong
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            {scope ? `The ${scope} hit an unexpected error` : "This page hit an unexpected error"}{" "}
            while loading. Nothing you submitted was lost — try again, and if it keeps happening
            send us the reference code below.
          </p>

          {/* Dev-only detail. `error.message` is redacted in production builds. */}
          {process.env.NODE_ENV !== "production" && error.message && (
            <pre className="mt-4 max-h-32 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-[11px] leading-relaxed text-slate-600">
              {error.message}
            </pre>
          )}

          <div className="mt-5 flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Reference code
              </p>
              <p className="truncate font-mono text-xs text-slate-700">{reference}</p>
            </div>
            <button
              type="button"
              onClick={copyReference}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" /> Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" /> Copy
                </>
              )}
            </button>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-px hover:bg-indigo-700 hover:shadow-md hover:shadow-indigo-500/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              <RotateCw className="h-4 w-4" />
              Try Again
            </button>

            <Link
              href={home}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
