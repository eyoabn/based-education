"use client"

import ErrorFallback from "@/components/ui/ErrorFallback"

/**
 * Student portal error boundary. Rendered inside the student layout, so the
 * sidebar and header survive the crash and the student can navigate away
 * without a full reload.
 */
export default function StudentError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <ErrorFallback
      error={error}
      reset={reset}
      scope="student portal"
      homeHref="/dashboard/student"
    />
  )
}
