import { useState } from 'react'
import AuthScreen from './screens/AuthScreen'
import FeedScreen from './screens/FeedScreen'
import ClassroomScreen from './screens/ClassroomScreen'
import NotificationsScreen from './screens/NotificationsScreen'
import TeacherDashboard from './screens/TeacherDashboard'
import ExamPortal from './screens/ExamPortal'
import AdminPortal from './screens/AdminPortal'

export type Screen =
  | 'auth'
  | 'feed'
  | 'classroom'
  | 'notifications'
  | 'dashboard'
  | 'exam'
  | 'admin'

const NAV_ITEMS: { id: Screen; label: string; icon: string; role?: string }[] = [
  { id: 'auth', label: 'Auth / Onboarding', icon: '🔐' },
  { id: 'feed', label: 'Teacher Feed', icon: '📝', role: 'Teacher' },
  { id: 'classroom', label: 'Live Classroom', icon: '🎥', role: 'Teacher' },
  { id: 'notifications', label: 'Notifications', icon: '🔔' },
  { id: 'dashboard', label: 'Teacher Dashboard', icon: '📊', role: 'Teacher' },
  { id: 'exam', label: 'Exam Portal', icon: '📋', role: 'Student' },
  { id: 'admin', label: 'Admin Portal', icon: '⚙️', role: 'Admin' },
]

export default function App() {
  const [screen, setScreen] = useState<Screen>('auth')

  if (screen === 'classroom') {
    return <ClassroomScreen onExit={() => setScreen('feed')} />
  }

  if (screen === 'exam') {
    return <ExamPortal onExit={() => setScreen('feed')} />
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#F8FAFC' }}>
      {/* Sidebar Navigator */}
      <aside style={{
        width: 220,
        flexShrink: 0,
        background: '#1E1B4B',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 0',
        position: 'relative',
        zIndex: 10,
      }}>
        {/* Logo */}
        <div style={{ padding: '0 20px 28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              boxShadow: '0 4px 12px rgba(99,102,241,0.4)',
            }}>⚡</div>
            <span style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 800,
              fontSize: 17,
              color: '#FFFFFF',
              letterSpacing: '-0.02em',
            }}>EduConnect</span>
          </div>
        </div>

        {/* Section label */}
        <div style={{
          padding: '0 20px 8px',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'rgba(165,180,252,0.5)',
        }}>Screen Preview</div>

        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, padding: '0 10px' }}>
          {NAV_ITEMS.map(item => {
            const active = screen === item.id
            return (
              <button
                key={item.id}
                onClick={() => setScreen(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 12px',
                  borderRadius: 8,
                  border: 'none',
                  cursor: 'pointer',
                  background: active ? 'rgba(99,102,241,0.2)' : 'transparent',
                  color: active ? '#A5B4FC' : 'rgba(148,163,184,0.7)',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 13,
                  fontWeight: active ? 600 : 400,
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                  position: 'relative',
                }}
                onMouseEnter={e => {
                  if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'
                }}
                onMouseLeave={e => {
                  if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'
                }}
              >
                {active && (
                  <div style={{
                    position: 'absolute',
                    left: 0,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 3,
                    height: 18,
                    borderRadius: '0 3px 3px 0',
                    background: '#6366F1',
                  }} />
                )}
                <span style={{ fontSize: 14 }}>{item.icon}</span>
                <div>
                  <div>{item.label}</div>
                  {item.role && (
                    <div style={{
                      fontSize: 10,
                      fontWeight: 500,
                      color: active ? 'rgba(165,180,252,0.6)' : 'rgba(100,116,139,0.5)',
                      marginTop: 1,
                    }}>{item.role}</div>
                  )}
                </div>
              </button>
            )
          })}
        </nav>

        {/* User pill at bottom */}
        <div style={{ padding: '16px 16px 0', borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img
              src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=40&h=40&fit=crop&auto=format"
              alt="User avatar"
              style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(99,102,241,0.5)' }}
            />
            <div>
              <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 12, fontWeight: 600, color: '#E2E8F0' }}>Alex Morgan</div>
              <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 11, color: 'rgba(148,163,184,0.6)' }}>Teacher</div>
            </div>
            <div style={{ marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%', background: '#10B981', boxShadow: '0 0 6px rgba(16,185,129,0.6)' }} />
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
        {screen === 'auth' && <AuthScreen onNavigate={setScreen} />}
        {screen === 'feed' && <FeedScreen onNavigate={setScreen} />}
        {screen === 'notifications' && <NotificationsScreen onNavigate={setScreen} />}
        {screen === 'dashboard' && <TeacherDashboard onNavigate={setScreen} />}
        {screen === 'admin' && <AdminPortal onNavigate={setScreen} />}
      </main>
    </div>
  )
}
