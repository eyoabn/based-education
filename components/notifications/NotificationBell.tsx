"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Bell } from "lucide-react"
import NotificationDrawer from "./NotificationDrawer"
import { toastFromNotification, type EduNotification } from "@/lib/e2e-triggers"

/**
 * Phase 7 — the realtime entry point for the whole client.
 *
 * The bell is mounted in all three portal layouts, which makes it the one
 * component guaranteed to be alive wherever a signed-in user is. So it owns
 * the single `EventSource`: every `Notification` the server pushes arrives
 * here, becomes a toast, and is republished on the client event bus for any
 * interested page (the student feed prepending a new post, for instance).
 *
 * Opening a second stream elsewhere would double every alert and burn another
 * connection against the browser's six-per-origin cap — so pages subscribe to
 * the bus via `useEduEvent` rather than connecting themselves.
 */
export default function NotificationBell() {
  const router = useRouter()
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [connected, setConnected] = useState(false)

  // Read inside the SSE handler without making it a dependency — re-running
  // the effect would tear down and rebuild the stream on every alert.
  const isOpenRef = useRef(isOpen)
  isOpenRef.current = isOpen

  const navigate = useCallback((href: string) => router.push(href), [router])

  // Seed the badge from history so a reload doesn't reset it to zero.
  useEffect(() => {
    let cancelled = false

    fetch("/api/notifications", { cache: "no-store" })
      .then(res => (res.ok ? res.json() : []))
      .then((rows: EduNotification[]) => {
        if (cancelled || !Array.isArray(rows)) return
        setUnreadCount(rows.filter(n => !n.isRead).length)
      })
      .catch(() => {
        // Offline or signed out — the badge simply starts empty.
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const eventSource = new EventSource("/api/notifications/stream")

    eventSource.onopen = () => setConnected(true)

    eventSource.onmessage = event => {
      // Keep-alive frames are comments; some proxies surface them as data.
      if (!event.data || event.data.startsWith(":")) return

      let notification: EduNotification
      try {
        notification = JSON.parse(event.data) as EduNotification
      } catch {
        console.error("[EduConnect] Malformed SSE frame:", event.data)
        return
      }
      if (!notification?.type) return

      setUnreadCount(prev => prev + 1)

      // Suppress the toast while the drawer is open — the alert is already
      // visible there, and stacking both is just noise.
      if (!isOpenRef.current) {
        toastFromNotification(notification, { navigate })
      }
    }

    eventSource.onerror = () => {
      // EventSource reconnects on its own; reflect the gap in the tooltip.
      setConnected(false)
    }

    return () => eventSource.close()
  }, [navigate])

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        title={connected ? "Notifications · live" : "Notifications · reconnecting"}
        className="relative rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        <Bell className="h-5 w-5" />

        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 items-center justify-center rounded-full border-2 border-white bg-red-500 text-[9px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          </span>
        )}
      </button>

      {isOpen && (
        <NotificationDrawer
          onClose={() => setIsOpen(false)}
          onMarkAllRead={() => {
            setUnreadCount(0)
            // Fire-and-forget: the badge is already cleared optimistically.
            void fetch("/api/notifications", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({}),
            }).catch(() => {})
          }}
        />
      )}
    </>
  )
}
