"use client"

import { useState } from "react"
import { X, CheckCheck, Video, FileText, BellRing, Award } from "lucide-react"

export default function NotificationDrawer({ onClose, onMarkAllRead }: { onClose: () => void, onMarkAllRead: () => void }) {
  const [activeTab, setActiveTab] = useState("all")

  // Mock Notifications
  const [notifications, setNotifications] = useState([
    { id: 1, type: 'live', title: 'Live Class Starting', message: 'Dr. Morgan is starting Advanced Calculus now.', time: 'Just now', read: false },
    { id: 2, type: 'post', title: 'New Announcement', message: 'Midterm syllabus has been updated.', time: '2h ago', read: false },
    { id: 3, type: 'grade', title: 'Grade Released', message: 'Your score for Physics 101 Midterm is available.', time: 'Yesterday', read: true },
  ])

  const handleMarkAll = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })))
    onMarkAllRead()
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'live': return <Video className="w-4 h-4 text-red-500" />
      case 'post': return <FileText className="w-4 h-4 text-indigo-500" />
      case 'grade': return <Award className="w-4 h-4 text-emerald-500" />
      default: return <BellRing className="w-4 h-4 text-slate-500" />
    }
  }

  const getIconBg = (type: string) => {
    switch (type) {
      case 'live': return 'bg-red-100'
      case 'post': return 'bg-indigo-100'
      case 'grade': return 'bg-emerald-100'
      default: return 'bg-slate-100'
    }
  }

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
            <button 
              onClick={handleMarkAll}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-2 py-1 rounded transition-colors flex items-center gap-1"
            >
              <CheckCheck className="w-3.5 h-3.5" /> Mark all read
            </button>
            <button onClick={onClose} className="p-1 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-4 py-2 border-b border-slate-100 flex gap-1 overflow-x-auto">
          {['all', 'posts', 'live', 'grades'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-full capitalize transition-colors whitespace-nowrap ${
                activeTab === tab ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {tab === 'all' ? 'All Activity' : tab}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {notifications.map(notification => (
            <div 
              key={notification.id} 
              className={`p-4 border-b border-slate-50 flex gap-4 hover:bg-slate-50 transition-colors cursor-pointer ${!notification.read ? 'bg-indigo-50/30' : ''}`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${getIconBg(notification.type)}`}>
                {getIcon(notification.type)}
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h4 className={`text-sm ${!notification.read ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>
                    {notification.title}
                  </h4>
                  <span className="text-[10px] font-medium text-slate-400 whitespace-nowrap">{notification.time}</span>
                </div>
                <p className="text-sm text-slate-500 leading-snug">{notification.message}</p>
              </div>
              {!notification.read && (
                <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
