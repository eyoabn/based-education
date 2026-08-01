"use client"

import { useEffect, useRef } from "react"
import { PING_INTERVAL_SEC } from "@/lib/attendance"

interface AttendanceHeartbeatProps {
  roomId: string
  /** Set false to disable tracking (e.g. when the teacher is viewing). */
  enabled?: boolean
  /** Optional hook so the room UI can surface "attention 92%" if it wants to. */
  onPing?: (result: { durationSec: number; activeSec: number }) => void
}

/**
 * Phase 4 — invisible presence tracker.
 *
 * Mounts inside a live room and POSTs to /api/attendance/ping every 30s.
 * Tab visibility is folded into the payload: if the student switches tabs or
 * minimises the window we still ping (so they stay "connected") but flag
 * `isActive: false`, which stops attention-time from accruing.
 *
 * Renders nothing.
 */
export default function AttendanceHeartbeat({
  roomId,
  enabled = true,
  onPing,
}: AttendanceHeartbeatProps) {
  // Kept in refs so the interval closure always reads current values without
  // needing to be torn down and rebuilt on every visibility change.
  const isActiveRef = useRef(true)
  const onPingRef = useRef(onPing)
  const inFlightRef = useRef(false)

  useEffect(() => {
    onPingRef.current = onPing
  }, [onPing])

  useEffect(() => {
    if (!enabled || !roomId) return

    let cancelled = false

    const sendPing = async () => {
      // Skip if the previous ping is still outstanding — a slow network
      // shouldn't queue up a backlog of requests.
      if (inFlightRef.current || cancelled) return
      inFlightRef.current = true

      try {
        const res = await fetch("/api/attendance/ping", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId, isActive: isActiveRef.current }),
          keepalive: true,
        })

        if (res.ok && !cancelled) {
          const data = await res.json()
          onPingRef.current?.({
            durationSec: data.durationSec ?? 0,
            activeSec: data.activeSec ?? 0,
          })
        }
      } catch {
        // Heartbeats are best-effort. A dropped ping is recovered by the next
        // one, and the server clamps the credited gap.
      } finally {
        inFlightRef.current = false
      }
    }

    const handleVisibilityChange = () => {
      const nowActive = !document.hidden
      isActiveRef.current = nowActive
      // Ping immediately on change so the teacher dashboard reflects the
      // switch within seconds rather than up to 30s later.
      void sendPing()
    }

    const handleBlur = () => {
      isActiveRef.current = false
    }

    const handleFocus = () => {
      if (!document.hidden) isActiveRef.current = true
    }

    const handleUnload = () => {
      // fetch() is unreliable during unload; sendBeacon is not.
      navigator.sendBeacon?.(
        `/api/attendance/ping?roomId=${encodeURIComponent(roomId)}&close=1`,
        new Blob([JSON.stringify({ roomId, isActive: false })], {
          type: "application/json",
        })
      )
    }

    // Open the attendance record straight away rather than 30s in.
    isActiveRef.current = !document.hidden
    void sendPing()

    const interval = setInterval(sendPing, PING_INTERVAL_SEC * 1000)
    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("blur", handleBlur)
    window.addEventListener("focus", handleFocus)
    window.addEventListener("pagehide", handleUnload)

    return () => {
      cancelled = true
      clearInterval(interval)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("blur", handleBlur)
      window.removeEventListener("focus", handleFocus)
      window.removeEventListener("pagehide", handleUnload)

      // Close the record on a clean unmount (student clicked Leave).
      void fetch(`/api/attendance/ping?roomId=${encodeURIComponent(roomId)}`, {
        method: "DELETE",
        keepalive: true,
      }).catch(() => {})
    }
  }, [roomId, enabled])

  return null
}
