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
          }
        }
      } catch (err) {
        console.error("Failed to load notifications", err)
      } finally {
        setLoading(false)
      }
    }
    fetchNotifications()
  }, [])

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
    if (!targetUrl) {
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
          targetUrl = '/dashboard/student/courses'
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
          if (notification.title.toLowerCase().includes('grade')) {
            targetUrl = '/dashboard/student/gradebook'
          } else if (notification.title.toLowerCase().includes('live')) {
            targetUrl = '/dashboard/student/calendar'
          } else if (notification.title.toLowerCase().includes('course')) {
            targetUrl = '/dashboard/student/courses'
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

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === "all") return true
    if (activeTab === "requests") return n.type.includes("COURSE_JOIN")
    if (activeTab === "live") return n.type.includes("LIVE")
    if (activeTab === "posts") return n.type.includes("POST")
    return true
  })

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Notifications</h2>
          <div className="flex items-center gap-2">
            {notifications.some(n => !n.isRead) && (
              <button 
                onClick={handleMarkAll}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-2 py-1 rounded transition-colors flex items-center gap-1"
              >
                <CheckCheck className="w-3.5 h-3.5" /> Mark all read
              </button>
            )}
            <button onClick={onClose} className="p-1 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-4 py-2 border-b border-slate-100 flex gap-1 overflow-x-auto">
          {[
            { id: 'all', label: 'All Activity' },
            { id: 'requests', label: 'Course Requests' },
            { id: 'live', label: 'Live Sessions' },
            { id: 'posts', label: 'Posts' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-full capitalize transition-colors whitespace-nowrap ${
                activeTab === tab.id ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-sm">Loading notifications...</div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">No notifications found</div>
          ) : (
            filteredNotifications.map(notification => (
              <div 
                key={notification.id} 
                onClick={() => handleNotificationClick(notification)}
                className={`p-4 border-b border-slate-50 flex gap-4 hover:bg-slate-50 transition-colors cursor-pointer ${!notification.isRead ? 'bg-indigo-50/30' : ''}`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${getIconBg(notification.type)}`}>
                  {getIcon(notification.type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className={`text-sm ${!notification.isRead ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>
                      {notification.title}
                    </h4>
                    <span className="text-[10px] font-medium text-slate-400 whitespace-nowrap">
                      {new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 leading-snug">{notification.message}</p>
                </div>
                {!notification.isRead && (
                  <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
