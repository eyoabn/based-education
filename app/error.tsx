"use client"

import ErrorFallback from "@/components/ui/ErrorFallback"

/**
 * Phase 7 — global catch-all error boundary.
 *
 * Catches anything thrown while rendering a route below `app/` that no nearer
 * boundary handled. Root-layout failures fall through to `app/global-error.tsx`
 * instead, since by definition the layout that would frame this component is
 * the thing that broke.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 font-sans">
      <ErrorFallback error={error} reset={reset} />
    </div>
  )
}
