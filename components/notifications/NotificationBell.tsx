"use client"

import { useState, useEffect } from "react"
import { Bell } from "lucide-react"
import NotificationDrawer from "./NotificationDrawer"

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    // Connect to SSE stream
    const eventSource = new EventSource('/api/notifications/stream')

    eventSource.onmessage = (event) => {
      // Ignore keep-alive heartbeats
      if (event.data === ': heartbeat') return

      try {
        const notification = JSON.parse(event.data)
        setUnreadCount(prev => prev + 1)
        // In a real app, you might also want to show a toast here
      } catch (e) {
        console.error("SSE parse error", e)
      }
    }

    return () => {
      eventSource.close()
    }
  }, [])

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="relative p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 text-[9px] font-bold text-white items-center justify-center border-2 border-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </span>
        )}
      </button>

      {isOpen && (
        <NotificationDrawer 
          onClose={() => setIsOpen(false)} 
          onMarkAllRead={() => setUnreadCount(0)}
        />
      )}
    </>
  )
}
