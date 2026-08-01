"use client"

import ErrorFallback from "@/components/ui/ErrorFallback"

/**
 * Teacher portal error boundary. Scoped below the teacher layout so a failed
 * grading query can't take down a live class running in the same session.
 */
export default function TeacherError({
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
      scope="teacher portal"
      homeHref="/dashboard/teacher"
    />
  )
}
