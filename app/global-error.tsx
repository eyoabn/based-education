"use client"

import { AlertTriangle, RotateCw } from "lucide-react"

/**
 * Phase 7 — last line of defence.
 *
 * Replaces the entire document when the root layout itself throws, so it has
 * to render its own `<html>`/`<body>`. Deliberately dependency-free and
 * inline-styled: at this point `globals.css` and the font may not have loaded,
 * and importing a shared component risks re-triggering the same crash.
 */
export default function GlobalErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0F172A",
          color: "#F1F5F9",
          fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: "440px", textAlign: "center" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              margin: "0 auto 20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "16px",
              background: "rgba(239, 68, 68, 0.12)",
              border: "1px solid rgba(239, 68, 68, 0.25)",
              color: "#F87171",
            }}
          >
            <AlertTriangle width={28} height={28} strokeWidth={1.75} />
          </div>

          <h1 style={{ fontSize: "20px", fontWeight: 700, margin: "0 0 8px" }}>
            EduConnect failed to start
          </h1>
          <p style={{ fontSize: "14px", lineHeight: 1.6, color: "#94A3B8", margin: "0 0 20px" }}>
            A critical error stopped the application shell from rendering. Reloading usually
            clears it.
          </p>

          {error.digest && (
            <p
              style={{
                fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                fontSize: "11px",
                color: "#64748B",
                margin: "0 0 24px",
              }}
            >
              Reference: {error.digest}
            </p>
          )}

          <button
            type="button"
            onClick={reset}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "12px 24px",
              borderRadius: "10px",
              border: "none",
              background: "#4F46E5",
              color: "#FFFFFF",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            <RotateCw width={16} height={16} />
            Reload EduConnect
          </button>
        </div>
      </body>
    </html>
  )
}
