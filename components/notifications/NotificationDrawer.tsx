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
        return <Video className="w-4 h-4 text-red-500" />
      case 'NEW_POST':
      case 'post':
        return <FileText className="w-4 h-4 text-indigo-500" />
      case 'GRADE_RELEASED':
      case 'grade':
        return <Award className="w-4 h-4 text-emerald-500" />
      case 'COURSE_JOIN_REQUESTED':
        return <UserPlus className="w-4 h-4 text-amber-500" />
      case 'COURSE_JOIN_APPROVED':
        return <CheckCircle className="w-4 h-4 text-emerald-500" />
      case 'COURSE_JOIN_REJECTED':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      default:
        return <BellRing className="w-4 h-4 text-slate-500" />
    }
  }

  const getIconBg = (type: string) => {
    switch (type) {
      case 'LIVE_CLASS_STARTING':
      case 'live':
        return 'bg-red-100'
      case 'NEW_POST':
      case 'post':
        return 'bg-indigo-100'
      case 'GRADE_RELEASED':
      case 'grade':
        return 'bg-emerald-100'
      case 'COURSE_JOIN_REQUESTED':
        return 'bg-amber-100'
      case 'COURSE_JOIN_APPROVED':
        return 'bg-emerald-100'
      case 'COURSE_JOIN_REJECTED':
        return 'bg-red-100'
      default:
        return 'bg-slate-100'
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
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Drawer / Mobile Bottom Sheet */}
      <div className="relative w-full sm:max-w-md bg-white max-h-[90vh] sm:max-h-full h-auto sm:h-full shadow-2xl flex flex-col animate-in slide-in-from-bottom sm:slide-in-from-right duration-300 rounded-t-3xl sm:rounded-none sm:rounded-l-3xl border-t sm:border-t-0 sm:border-l border-slate-200/80 z-10">
        
        {/* Mobile Drag Indicator Bar */}
        <div className="sm:hidden pt-3 pb-1 flex justify-center">
          <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="px-5 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">Notifications</h2>
            <p className="text-[11px] text-slate-400 font-medium">Activity updates &amp; alerts</p>
          </div>
          <div className="flex items-center gap-2">
            {notifications.some(n => !n.isRead) && (
              <button 
                onClick={handleMarkAll}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 active:scale-95 px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1"
              >
                <CheckCheck className="w-3.5 h-3.5" /> Mark read
              </button>
            )}
            <button 
              onClick={onClose} 
              className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors active:scale-95"
              aria-label="Close notifications"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-4 py-2 border-b border-slate-100 flex gap-1.5 overflow-x-auto scrollbar-none">
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
                activeTab === tab.id ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-sm">Loading activity stream...</div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <BellRing className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-700">All caught up!</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                There are no notifications in this category right now.
              </p>
            </div>
          ) : (
            filteredNotifications.map(notification => (
              <div 
                key={notification.id} 
                onClick={() => handleNotificationClick(notification)}
                className={`p-4 border-b border-slate-100/70 flex gap-3.5 hover:bg-slate-50 active:scale-[0.99] transition-all cursor-pointer ${!notification.isRead ? 'bg-indigo-50/30' : ''}`}
              >
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${getIconBg(notification.type)}`}>
                  {getIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className={`text-sm truncate ${!notification.isRead ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>
                      {notification.title}
                    </h4>
                    <span className="text-[10px] font-semibold text-slate-400 whitespace-nowrap shrink-0">
                      {formatRelativeTime(notification.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-500 leading-snug line-clamp-2">{notification.message}</p>
                </div>
                {!notification.isRead && (
                  <div className="w-2 h-2 rounded-full bg-indigo-500 mt-2 shrink-0 animate-pulse" />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
