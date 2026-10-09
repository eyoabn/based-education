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
    <div className="fixed inset-0 z-50 flex items-end sm:items-stretch sm:justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />
      
      {/* Drawer / Mobile Bottom Sheet */}
      <div className="relative w-full sm:max-w-md bg-[#111110] text-[#f7f3e8] max-h-[90vh] sm:max-h-full h-auto sm:h-full shadow-[0_25px_60px_rgba(0,0,0,0.8)] flex flex-col animate-in slide-in-from-bottom sm:slide-in-from-right duration-300 rounded-t-3xl sm:rounded-none sm:rounded-l-3xl border-t sm:border-t-0 sm:border-l border-white/[0.08] z-10">
        
        {/* Mobile Drag Indicator Bar */}
        <div className="sm:hidden pt-3 pb-1 flex justify-center">
          <div className="w-12 h-1.5 bg-white/20 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-white/[0.08] flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#f7f3e8] leading-tight">Notifications</h2>
            <p className="text-[11px] text-[#9d9b95] font-medium">Activity updates &amp; alerts</p>
          </div>
          <div className="flex items-center gap-2">
            {notifications.some(n => !n.isRead) && (
              <button 
                onClick={handleMarkAll}
                className="text-xs font-semibold text-[#d4af37] hover:bg-[rgba(212,175,55,0.12)] active:scale-95 px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 border border-[rgba(212,175,55,0.25)]"
              >
                <CheckCheck className="w-3.5 h-3.5" /> Mark read
              </button>
            )}
            <button 
              onClick={onClose} 
              className="w-8 h-8 flex items-center justify-center text-[#9d9b95] hover:text-[#f7f3e8] hover:bg-white/[0.06] rounded-xl transition-colors active:scale-95"
              aria-label="Close notifications"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-4 py-2.5 border-b border-white/[0.08] flex gap-1.5 overflow-x-auto scrollbar-none bg-[#0a0a09]">
          {[
            { id: 'all', label: 'All Activity' },
            { id: 'requests', label: 'Course Requests' },
            { id: 'live', label: 'Live Sessions' },
            { id: 'posts', label: 'Feed Posts' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl capitalize transition-all whitespace-nowrap active:scale-95 ${
                activeTab === tab.id 
                  ? 'bg-gradient-to-r from-[rgba(212,175,55,0.2)] to-[rgba(212,175,55,0.08)] text-[#f7f3e8] border border-[rgba(212,175,55,0.35)] shadow-[0_0_12px_rgba(212,175,55,0.15)]' 
                  : 'text-[#9d9b95] hover:bg-white/[0.05] hover:text-[#f7f3e8]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-[#9d9b95] text-sm">Loading activity stream...</div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] text-[#9d9b95] flex items-center justify-center mx-auto mb-3">
                <BellRing className="w-6 h-6 text-[#d4af37]" />
              </div>
              <p className="text-sm font-bold text-[#f7f3e8]">All caught up!</p>
              <p className="text-xs text-[#9d9b95] mt-1 max-w-xs mx-auto">
                There are no notifications in this category right now.
              </p>
            </div>
          ) : (
            filteredNotifications.map(notification => (
              <div 
                key={notification.id} 
                onClick={() => handleNotificationClick(notification)}
                className={`p-4 border-b border-white/[0.05] flex gap-3.5 hover:bg-[#181817] active:scale-[0.99] transition-all cursor-pointer ${
                  !notification.isRead 
                    ? 'bg-[rgba(212,175,55,0.04)] border-l-2 border-l-[#d4af37]' 
                    : ''
                }`}
              >
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${getIconBg(notification.type)}`}>
                  {getIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className={`text-sm truncate ${!notification.isRead ? 'font-bold text-[#f7f3e8]' : 'font-semibold text-[#f7f3e8]/80'}`}>
                      {notification.title}
                    </h4>
                    <span className="text-[10px] font-semibold text-[#9d9b95] whitespace-nowrap shrink-0">
                      {formatRelativeTime(notification.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-[#9d9b95] leading-snug line-clamp-2">{notification.message}</p>
                </div>
                {!notification.isRead && (
                  <div className="w-2 h-2 rounded-full bg-[#d4af37] shadow-[0_0_8px_rgba(212,175,55,0.8)] mt-2 shrink-0 animate-pulse" />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
