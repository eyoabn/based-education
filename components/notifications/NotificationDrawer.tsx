"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { X, CheckCheck, Video, FileText, BellRing, Award, UserPlus, CheckCircle, AlertCircle } from "lucide-react"

interface DbNotification {
  id: string
  type: string
  title: string
  message: string
  link?: string | null
  isRead: boolean
  createdAt: string
}

export default function NotificationDrawer({ onClose, onMarkAllRead }: { onClose: () => void, onMarkAllRead: () => void }) {
  const [activeTab, setActiveTab] = useState("all")
  const [notifications, setNotifications] = useState<DbNotification[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function fetchNotifications() {
      try {
        const res = await fetch("/api/notifications", { cache: "no-store" })
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data)) {
            setNotifications(data)
            const hasUnread = data.some((n: DbNotification) => !n.isRead)
            if (hasUnread) {
              onMarkAllRead()
            }
          }
        }
      } catch (err) {
        console.error("Failed to load notifications", err)
      } finally {
        setLoading(false)
      }
    }
    fetchNotifications()
  }, [onMarkAllRead])

  const handleMarkAll = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    onMarkAllRead()
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
    } catch {
      // Graceful fallback
    }
  }

  const handleNotificationClick = async (notification: DbNotification) => {
    // Optimistically update UI
    if (!notification.isRead) {
      setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, isRead: true } : n))
      
      // Update backend
      try {
        await fetch("/api/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: notification.id }),
        })
      } catch (e) {
        console.error("Failed to mark notification as read", e)
      }
    }

    // Determine destination target URL
    let targetUrl = notification.link
    if (targetUrl) {
      if (targetUrl.includes('/dashboard/student/courses')) {
        targetUrl = targetUrl.replace('/dashboard/student/courses', '/dashboard/student')
      }
      if (targetUrl === '/dashboard/teacher/courses/requests') {
        targetUrl = '/dashboard/teacher'
      }
    } else {
      switch (notification.type) {
        case 'GRADE_RELEASED':
        case 'grade':
          targetUrl = '/dashboard/student/gradebook'
          break
        case 'EXAM_SUBMITTED':
          targetUrl = '/dashboard/teacher/grading'
          break
        case 'EXAM_PUBLISHED':
        case 'ASSIGNMENT_DUE':
        case 'exam':
          targetUrl = '/dashboard/student/exams'
          break
        case 'COURSE_JOIN_REQUESTED':
          targetUrl = '/dashboard/teacher'
          break
        case 'COURSE_JOIN_APPROVED':
        case 'COURSE_JOIN_REJECTED':
          targetUrl = '/dashboard/student'
          break
        case 'LIVE_CLASS_STARTING':
        case 'live':
          targetUrl = '/dashboard/student/calendar'
          break
        case 'CLASS_SCHEDULED':
          targetUrl = '/dashboard/student/calendar'
          break
        case 'NEW_POST':
        case 'post':
          targetUrl = '/dashboard/student/feed'
          break
        default:
          if (
            notification.title.toLowerCase().includes('feedback') ||
            notification.title.toLowerCase().includes('report') ||
            notification.title.toLowerCase().includes('bug')
          ) {
            targetUrl = '/dashboard/admin/feedback'
          } else if (notification.title.toLowerCase().includes('grade')) {
            targetUrl = '/dashboard/student/gradebook'
          } else if (notification.title.toLowerCase().includes('live')) {
            targetUrl = '/dashboard/student/calendar'
          } else if (notification.title.toLowerCase().includes('course')) {
            targetUrl = '/dashboard/student'
          } else if (notification.title.toLowerCase().includes('exam') || notification.title.toLowerCase().includes('task')) {
            targetUrl = '/dashboard/student/exams'
          } else {
            targetUrl = '/dashboard/student/feed'
          }
      }
    }

    if (targetUrl) {
      router.push(targetUrl)
      onClose()
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'LIVE_CLASS_STARTING':
      case 'live':
        return <Video className="w-4 h-4 text-red-400" />
      case 'NEW_POST':
      case 'post':
        return <FileText className="w-4 h-4 text-[#d4af37]" />
      case 'GRADE_RELEASED':
      case 'grade':
        return <Award className="w-4 h-4 text-emerald-400" />
      case 'COURSE_JOIN_REQUESTED':
        return <UserPlus className="w-4 h-4 text-amber-400" />
      case 'COURSE_JOIN_APPROVED':
        return <CheckCircle className="w-4 h-4 text-emerald-400" />
      case 'COURSE_JOIN_REJECTED':
        return <AlertCircle className="w-4 h-4 text-red-400" />
      default:
        return <BellRing className="w-4 h-4 text-[#9d9b95]" />
    }
  }

  const getIconBg = (type: string) => {
    switch (type) {
      case 'LIVE_CLASS_STARTING':
      case 'live':
        return 'bg-red-500/15 border border-red-500/30 shadow-[0_0_12px_rgba(239,68,68,0.2)]'
      case 'NEW_POST':
      case 'post':
        return 'bg-[rgba(212,175,55,0.15)] border border-[rgba(212,175,55,0.3)] shadow-[0_0_12px_rgba(212,175,55,0.15)]'
      case 'GRADE_RELEASED':
      case 'grade':
        return 'bg-emerald-500/15 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
      case 'COURSE_JOIN_REQUESTED':
        return 'bg-amber-500/15 border border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
      case 'COURSE_JOIN_APPROVED':
        return 'bg-emerald-500/15 border border-emerald-500/30'
      case 'COURSE_JOIN_REJECTED':
        return 'bg-red-500/15 border border-red-500/30'
      default:
        return 'bg-white/[0.05] border border-white/[0.08]'
    }
  }

  const formatRelativeTime = (dateStr: string) => {
    try {
      const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
      if (diff < 60) return "Just now"
      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
      if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
      if (diff < 172800) return "Yesterday"
      return new Date(dateStr).toLocaleDateString([], { month: "short", day: "numeric" })
    } catch {
      return ""
    }
  }

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === "all") return true
    if (activeTab === "requests") return n.type.includes("COURSE_JOIN")
    if (activeTab === "live") return n.type.includes("LIVE")
    if (activeTab === "posts") return n.type.includes("POST")
    return true
  })

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col sm:flex-row sm:justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel — slides in from right on desktop, bottom on mobile */}
      <div
        className="relative w-full sm:w-[420px] max-w-full h-[90vh] sm:h-full mt-auto sm:mt-0 bg-[#111110] text-[#f7f3e8] flex flex-col shadow-[0_0_80px_rgba(0,0,0,0.8)] sm:border-l border-t sm:border-t-0 rounded-t-3xl sm:rounded-none border-white/[0.08] z-10"
        style={{
          animation: "notif-slide-in 0.25s cubic-bezier(0.25,0.46,0.45,0.94) both",
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Notifications"
      >
        {/* Mobile Drag Handle */}
        <div className="sm:hidden pt-3 pb-1 flex justify-center shrink-0">
          <div className="w-10 h-1.5 bg-white/20 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between shrink-0 bg-[#181817]/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.25)] flex items-center justify-center text-[#d4af37]">
              <BellRing className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-[#f7f3e8] leading-tight">Notifications</h2>
              <p className="text-[11px] text-[#9d9b95] font-medium">Activity updates &amp; alerts</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {notifications.some(n => !n.isRead) && (
              <button
                onClick={handleMarkAll}
                className="text-xs font-bold text-[#d4af37] hover:bg-[rgba(212,175,55,0.1)] active:scale-95 px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 border border-[rgba(212,175,55,0.25)] min-h-[36px]"
              >
                <CheckCheck className="w-3.5 h-3.5" /> Mark read
              </button>
            )}
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center text-[#9d9b95] hover:text-[#f7f3e8] hover:bg-white/[0.06] rounded-xl transition-colors active:scale-95"
              aria-label="Close notifications"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-4 py-2.5 border-b border-white/[0.08] flex gap-1.5 overflow-x-auto shrink-0 bg-[#0c0c0b]"
          style={{ scrollbarWidth: "none" }}
        >
          {[
            { id: "all", label: "All" },
            { id: "requests", label: "Requests" },
            { id: "live", label: "Live" },
            { id: "posts", label: "Posts" },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all active:scale-95 min-h-[32px] ${
                activeTab === tab.id
                  ? "bg-[rgba(212,175,55,0.15)] text-[#d4af37] border border-[rgba(212,175,55,0.35)]"
                  : "text-[#9d9b95] hover:bg-white/[0.05] hover:text-[#f7f3e8] border border-transparent"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Notification List */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {loading ? (
            <div className="p-8 text-center space-y-3">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="flex gap-3 items-center">
                  <div className="w-10 h-10 rounded-2xl bg-white/[0.04] animate-pulse shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-white/[0.04] rounded-lg animate-pulse w-3/4" />
                    <div className="h-2.5 bg-white/[0.03] rounded-lg animate-pulse w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-14 h-14 rounded-3xl bg-[rgba(212,175,55,0.08)] border border-[rgba(212,175,55,0.2)] text-[#d4af37] flex items-center justify-center mx-auto mb-4">
                <BellRing className="w-7 h-7" />
              </div>
              <p className="text-sm font-black text-[#f7f3e8]">All caught up!</p>
              <p className="text-xs text-[#9d9b95] mt-1.5 max-w-[200px] mx-auto">
                No notifications in this category right now.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.05]">
              {filteredNotifications.map(notification => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-4 flex gap-3.5 hover:bg-[#181817] active:bg-[#1c1c1b] active:scale-[0.99] transition-all cursor-pointer relative ${
                    !notification.isRead
                      ? "bg-[rgba(212,175,55,0.03)]"
                      : ""
                  }`}
                >
                  {/* Unread left bar */}
                  {!notification.isRead && (
                    <span className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#d4af37] rounded-r-full" />
                  )}

                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${getIconBg(notification.type)}`}>
                    {getIcon(notification.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-0.5">
                      <h4 className={`text-sm leading-snug ${
                        !notification.isRead
                          ? "font-bold text-[#f7f3e8]"
                          : "font-semibold text-[#f7f3e8]/80"
                      }`}>
                        {notification.title}
                      </h4>
                      <span className="text-[10px] font-semibold text-[#9d9b95] whitespace-nowrap shrink-0 mt-0.5">
                        {formatRelativeTime(notification.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-[#9d9b95] leading-relaxed line-clamp-2">
                      {notification.message}
                    </p>
                  </div>

                  {/* Unread dot */}
                  {!notification.isRead && (
                    <div className="w-2 h-2 rounded-full bg-[#d4af37] shadow-[0_0_8px_rgba(212,175,55,0.7)] mt-2 shrink-0 animate-pulse" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-white/[0.08] bg-[#0c0c0b] shrink-0">
          <p className="text-[10px] text-[#9d9b95] text-center font-medium">
            {filteredNotifications.length} notification{filteredNotifications.length !== 1 ? "s" : ""} · click to navigate
          </p>
        </div>
      </div>

      <style>{`
        @keyframes notif-slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @media (max-width: 639px) {
          @keyframes notif-slide-in {
            from { transform: translateY(60px); opacity: 0; }
            to   { transform: translateY(0);    opacity: 1; }
          }
        }
      `}</style>
    </div>
  )
}
