import { useState } from 'react'
import type { Screen } from '../App'

interface Props {
  onNavigate: (s: Screen) => void
}

type Category = 'all' | 'announcements' | 'live' | 'submissions' | 'system'

const NOTIFICATIONS = [
  {
    id: 1,
    category: 'live' as Category,
    title: 'Live Class Starting Now',
    body: 'Advanced Calculus with Dr. Sarah Chen is starting. Join now to not miss the session.',
    time: 'Just now',
    read: false,
    icon: '🔴',
    action: 'Join Live Now',
    actionScreen: 'classroom' as Screen,
    color: '#10B981',
  },
  {
    id: 2,
    category: 'announcements' as Category,
    title: 'New Assignment Posted',
    body: 'Dr. Sarah Chen posted a new problem set in Advanced Calculus. Due Friday, Aug 5 at 11:59 PM.',
    time: '15m ago',
    read: false,
    icon: '📝',
    action: 'View Assignment',
    actionScreen: 'dashboard' as Screen,
    color: '#4F46E5',
  },
  {
    id: 3,
    category: 'submissions' as Category,
    title: 'Assignment Graded',
    body: 'Your Quantum Mechanics Lab Report has been graded: 88/100. Feedback is available.',
    time: '1h ago',
    read: false,
    icon: '✅',
    action: 'View Grade',
    actionScreen: 'dashboard' as Screen,
    color: '#10B981',
  },
  {
    id: 4,
    category: 'live' as Category,
    title: 'Upcoming: Quantum Mechanics',
    body: 'Prof. James Okoye\'s live class starts in 30 minutes. Topic: Wave-Particle Duality.',
    time: '29m ago',
    read: false,
    icon: '⏰',
    action: 'Set Reminder',
    actionScreen: 'feed' as Screen,
    color: '#F59E0B',
  },
  {
    id: 5,
    category: 'announcements' as Category,
    title: 'New Post in World Literature',
    body: 'Ms. Priya Sharma shared results for the comparative essay. Check your score in the dashboard.',
    time: '3h ago',
    read: true,
    icon: '📢',
    action: 'View Post',
    actionScreen: 'feed' as Screen,
    color: '#4F46E5',
  },
  {
    id: 6,
    category: 'system' as Category,
    title: 'System Maintenance Tonight',
    body: 'EduConnect will undergo scheduled maintenance from 2:00–4:00 AM UTC. Live sessions during this window may be affected.',
    time: '5h ago',
    read: true,
    icon: '⚙️',
    action: null,
    actionScreen: null,
    color: '#94A3B8',
  },
  {
    id: 7,
    category: 'submissions' as Category,
    title: 'Submission Deadline Reminder',
    body: 'Your Physics Lab Report is due in 2 days. Don\'t forget to submit before the deadline.',
    time: '1d ago',
    read: true,
    icon: '📋',
    action: 'View Submission',
    actionScreen: 'dashboard' as Screen,
    color: '#EF4444',
  },
  {
    id: 8,
    category: 'system' as Category,
    title: 'Profile Verified',
    body: 'Your student account has been fully verified. You now have access to all platform features.',
    time: '2d ago',
    read: true,
    icon: '🛡',
    action: null,
    actionScreen: null,
    color: '#10B981',
  },
]

const FILTERS: { id: Category; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'announcements', label: 'Announcements' },
  { id: 'live', label: 'Live Class' },
  { id: 'submissions', label: 'Submissions' },
  { id: 'system', label: 'System' },
]

export default function NotificationsScreen({ onNavigate }: Props) {
  const [filter, setFilter] = useState<Category>('all')
  const [notifications, setNotifications] = useState(NOTIFICATIONS)

  const markAllRead = () => setNotifications(ns => ns.map(n => ({ ...n, read: true })))
  const markRead = (id: number) => setNotifications(ns => ns.map(n => n.id === id ? { ...n, read: true } : n))
  const dismiss = (id: number) => setNotifications(ns => ns.filter(n => n.id !== id))

  const filtered = filter === 'all' ? notifications : notifications.filter(n => n.category === filter)
  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div style={{ padding: '32px', maxWidth: 720, margin: '0 auto', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontWeight: 800, fontSize: 26, color: '#0F172A', letterSpacing: '-0.03em', margin: 0 }}>
            Notifications
          </h1>
          <p style={{ fontSize: 14, color: '#64748B', margin: '4px 0 0' }}>
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        <button
          onClick={markAllRead}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: '1.5px solid #E2E8F0',
            background: '#FFFFFF',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 13,
            fontWeight: 600,
            color: '#374151',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#4F46E5'; (e.currentTarget as HTMLElement).style.color = '#4F46E5' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#E2E8F0'; (e.currentTarget as HTMLElement).style.color = '#374151' }}
        >
          ✓ Mark all read
        </button>
      </div>

      {/* Category filter pills */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
        {FILTERS.map(f => {
          const count = f.id === 'all' ? notifications.filter(n => !n.read).length : notifications.filter(n => n.category === f.id && !n.read).length
          const active = filter === f.id
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 14px',
                borderRadius: 100,
                border: active ? '1.5px solid #4F46E5' : '1.5px solid #E2E8F0',
                background: active ? '#4F46E5' : '#FFFFFF',
                color: active ? '#FFFFFF' : '#374151',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s',
                boxShadow: active ? '0 2px 10px rgba(79,70,229,0.25)' : 'none',
              }}
            >
              {f.label}
              {count > 0 && (
                <span style={{
                  background: active ? 'rgba(255,255,255,0.2)' : '#EEF2FF',
                  color: active ? '#FFF' : '#4F46E5',
                  borderRadius: 100,
                  padding: '1px 7px',
                  fontSize: 11,
                  fontWeight: 700,
                }}>{count}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Notification list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#94A3B8', fontSize: 14 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔔</div>
            No notifications in this category
          </div>
        ) : (
          filtered.map(n => (
            <div
              key={n.id}
              onClick={() => markRead(n.id)}
              style={{
                display: 'flex',
                gap: 14,
                padding: '16px 18px',
                borderRadius: 12,
                border: `1px solid ${n.read ? '#E2E8F0' : 'rgba(79,70,229,0.15)'}`,
                background: n.read ? '#FFFFFF' : 'rgba(79,70,229,0.03)',
                cursor: 'pointer',
                transition: 'all 0.15s',
                position: 'relative',
                animation: 'fade-up 0.3s ease',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(0,0,0,0.07)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)' }}
            >
              {/* Unread dot */}
              {!n.read && (
                <div style={{
                  position: 'absolute',
                  top: 18,
                  right: 18,
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#4F46E5',
                  animation: 'pulse-dot 2s ease-in-out infinite',
                }} />
              )}

              {/* Icon */}
              <div style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: `${n.color}14`,
                border: `1px solid ${n.color}22`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                flexShrink: 0,
              }}>{n.icon}</div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
                  <div style={{ fontWeight: n.read ? 600 : 700, fontSize: 14, color: '#0F172A', lineHeight: 1.3 }}>{n.title}</div>
                  <span style={{ fontSize: 11, color: '#94A3B8', flexShrink: 0, marginTop: 2 }}>{n.time}</span>
                </div>
                <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.55, margin: '0 0 10px' }}>{n.body}</p>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {n.action && n.actionScreen && (
                    <button
                      onClick={e => { e.stopPropagation(); onNavigate(n.actionScreen!) }}
                      style={{
                        padding: '5px 12px',
                        borderRadius: 7,
                        border: 'none',
                        background: n.color === '#10B981' ? 'rgba(16,185,129,0.1)' : n.color === '#EF4444' ? 'rgba(239,68,68,0.1)' : 'rgba(79,70,229,0.1)',
                        color: n.color === '#10B981' ? '#10B981' : n.color === '#EF4444' ? '#EF4444' : '#4F46E5',
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >{n.action} →</button>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); dismiss(n.id) }}
                    style={{
                      padding: '5px 10px',
                      borderRadius: 7,
                      border: '1px solid #E2E8F0',
                      background: 'transparent',
                      color: '#94A3B8',
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontSize: 12,
                      cursor: 'pointer',
                    }}
                  >Dismiss</button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
