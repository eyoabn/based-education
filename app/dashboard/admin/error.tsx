"use client"

import ErrorFallback from "@/components/ui/ErrorFallback"

/**
 * Admin console error boundary. Analytics aggregate over the whole platform
 * and are the likeliest thing here to time out, so "Try Again" is usually the
 * correct and sufficient remedy.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <ErrorFallback error={error} reset={reset} scope="admin console" homeHref="/dashboard/admin" />
  )
}
