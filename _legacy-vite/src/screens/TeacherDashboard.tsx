import { useState } from 'react'
import type { Screen } from '../App'

interface Props {
  onNavigate: (s: Screen) => void
}

const CALENDAR_EVENTS = [
  { day: 1, type: 'live', label: 'Live: Calculus' },
  { day: 3, type: 'exam', label: 'Exam: Calculus' },
  { day: 5, type: 'deadline', label: 'Due: Lab Report' },
  { day: 8, type: 'live', label: 'Live: Quantum' },
  { day: 10, type: 'live', label: 'Live: Literature' },
  { day: 12, type: 'exam', label: 'Exam: Physics' },
  { day: 15, type: 'deadline', label: 'Due: Essay' },
  { day: 17, type: 'live', label: 'Live: Calculus' },
  { day: 19, type: 'live', label: 'Live: Quantum' },
  { day: 22, type: 'live', label: 'Live: Literature' },
  { day: 24, type: 'deadline', label: 'Due: Problem Set' },
  { day: 26, type: 'live', label: 'Live: Calculus' },
  { day: 29, type: 'exam', label: 'Final Exam' },
]

const SUBMISSIONS = [
  {
    id: 1,
    name: 'Emma Wilson',
    avatar: 'https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=40&h=40&fit=crop&auto=format',
    assignment: "L'Hôpital's Rule — Problem Set 4",
    submitted: 'Aug 1, 2026 at 10:24 AM',
    pages: 6,
    grade: null,
    preview: 'Student demonstrates strong grasp of composite function notation. Several creative solution approaches on problems 7–9...',
  },
  {
    id: 2,
    name: 'Noah Kim',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=40&h=40&fit=crop&auto=format',
    assignment: "L'Hôpital's Rule — Problem Set 4",
    submitted: 'Aug 1, 2026 at 8:45 AM',
    pages: 5,
    grade: 78,
    preview: 'Good work on the basic applications. Some confusion around cases involving infinity — see feedback on pg. 4...',
  },
  {
    id: 3,
    name: 'Liam Torres',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=40&h=40&fit=crop&auto=format',
    assignment: "L'Hôpital's Rule — Problem Set 4",
    submitted: 'Jul 31, 2026 at 11:50 PM',
    pages: 7,
    grade: null,
    preview: 'Very thorough attempt. Question 9 partially correct — needs to apply the rule twice for the nested form...',
  },
]

type CalendarEvent = { day: number; type: string; label: string }

function eventColor(type: string) {
  if (type === 'live') return { bg: 'rgba(79,70,229,0.12)', border: '#4F46E5', text: '#4F46E5' }
  if (type === 'exam') return { bg: 'rgba(239,68,68,0.1)', border: '#EF4444', text: '#EF4444' }
  return { bg: 'rgba(245,158,11,0.1)', border: '#F59E0B', text: '#F59E0B' }
}

export default function TeacherDashboard({ onNavigate }: Props) {
  const [activeSubmission, setActiveSubmission] = useState(SUBMISSIONS[0])
  const [gradeInput, setGradeInput] = useState(activeSubmission.grade?.toString() || '')
  const [feedbackInput, setFeedbackInput] = useState('')
  const [savedGrades, setSavedGrades] = useState<Record<number, number>>({})
  const today = 1

  const saveGrade = () => {
    const g = parseInt(gradeInput)
    if (!isNaN(g) && g >= 0 && g <= 100) {
      setSavedGrades(p => ({ ...p, [activeSubmission.id]: g }))
    }
  }

  const daysInMonth = 31
  const firstDay = 6 // Saturday start for Aug 2026
  const calendarDays: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]

  const getEventForDay = (day: number): CalendarEvent | undefined =>
    CALENDAR_EVENTS.find(e => e.day === day)

  return (
    <div style={{ padding: '28px', fontFamily: "'Plus Jakarta Sans', sans-serif", overflowY: 'auto', height: '100%' }}>
      <h1 style={{ fontWeight: 800, fontSize: 24, color: '#0F172A', letterSpacing: '-0.03em', marginBottom: 4 }}>Teacher Dashboard</h1>
      <p style={{ fontSize: 13, color: '#64748B', marginBottom: 24 }}>August 2026 · Advanced Calculus, Quantum Mechanics, World Literature</p>

      {/* Bento stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Active Students', val: '148', sub: '+12 this month', icon: '👥', color: '#4F46E5', bg: '#EEF2FF' },
          { label: 'Completion Rate', val: '89%', sub: '+3% vs last month', icon: '📈', color: '#10B981', bg: 'rgba(16,185,129,0.08)' },
          { label: 'Pending Grading', val: '23', sub: '7 new today', icon: '📝', color: '#F59E0B', bg: 'rgba(245,158,11,0.08)' },
          { label: 'Avg. Score', val: '82.4', sub: 'Out of 100', icon: '🏆', color: '#6366F1', bg: '#F5F3FF' },
        ].map(s => (
          <div key={s.label} style={{
            background: '#FFFFFF',
            borderRadius: 14,
            border: '1px solid #E2E8F0',
            padding: '18px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: s.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
              }}>{s.icon}</div>
            </div>
            <div style={{ fontWeight: 800, fontSize: 26, color: s.color, letterSpacing: '-0.02em', lineHeight: 1 }}>{s.val}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginTop: 4 }}>{s.label}</div>
            <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Main grid: calendar + grading */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 20, alignItems: 'start' }}>
        {/* Calendar */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: 14,
          border: '1px solid #E2E8F0',
          padding: '20px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontWeight: 700, fontSize: 16, color: '#0F172A', margin: 0 }}>August 2026</h2>
            <div style={{ display: 'flex', gap: 12, fontSize: 11, fontWeight: 600 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#4F46E5' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4F46E5', display: 'inline-block' }} /> Live
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#EF4444' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444', display: 'inline-block' }} /> Exam
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#F59E0B' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#F59E0B', display: 'inline-block' }} /> Deadline
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <div key={i} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#94A3B8', padding: '4px 0 8px' }}>{d}</div>
            ))}
            {calendarDays.map((day, i) => {
              if (!day) return <div key={`empty-${i}`} />
              const event = getEventForDay(day)
              const isToday = day === today
              const colors = event ? eventColor(event.type) : null
              return (
                <div
                  key={day}
                  title={event?.label}
                  style={{
                    aspectRatio: '1',
                    borderRadius: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: isToday ? 800 : event ? 700 : 400,
                    color: isToday ? '#FFFFFF' : event ? colors!.text : '#374151',
                    background: isToday ? '#4F46E5' : event ? colors!.bg : 'transparent',
                    border: isToday ? 'none' : event ? `1px solid ${colors!.border}22` : '1px solid transparent',
                    cursor: event ? 'pointer' : 'default',
                    transition: 'all 0.15s',
                    boxShadow: isToday ? '0 2px 8px rgba(79,70,229,0.4)' : 'none',
                    position: 'relative',
                  }}
                >
                  {day}
                  {event && !isToday && (
                    <div style={{ width: 4, height: 4, borderRadius: '50%', background: colors!.border, marginTop: 2 }} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Grading drawer */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: 14,
          border: '1px solid #E2E8F0',
          boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
          overflow: 'hidden',
        }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontWeight: 700, fontSize: 15, color: '#0F172A', margin: 0 }}>Submissions & Grading</h2>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#F59E0B', background: 'rgba(245,158,11,0.1)', padding: '3px 10px', borderRadius: 100 }}>
              {SUBMISSIONS.filter(s => !s.grade && !savedGrades[s.id]).length} Pending
            </span>
          </div>

          {/* Submission list */}
          <div style={{ display: 'flex', gap: 0, height: 420 }}>
            <div style={{ width: 180, borderRight: '1px solid #F1F5F9', overflowY: 'auto', flexShrink: 0 }}>
              {SUBMISSIONS.map(sub => {
                const graded = savedGrades[sub.id] || sub.grade
                return (
                  <button
                    key={sub.id}
                    onClick={() => { setActiveSubmission(sub); setGradeInput(graded?.toString() || ''); setFeedbackInput('') }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '12px 14px',
                      width: '100%',
                      border: 'none',
                      background: activeSubmission.id === sub.id ? '#EEF2FF' : 'transparent',
                      borderRight: activeSubmission.id === sub.id ? '2px solid #4F46E5' : '2px solid transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s',
                    }}
                  >
                    <img src={sub.avatar} alt={sub.name} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: activeSubmission.id === sub.id ? '#4F46E5' : '#374151' }}>{sub.name.split(' ')[0]}</div>
                      <div style={{ fontSize: 10, color: graded ? '#10B981' : '#F59E0B', fontWeight: 600, marginTop: 1 }}>
                        {graded ? `${graded}/100 ✓` : 'Pending'}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Grading panel */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* PDF preview */}
              <div style={{
                flex: 1,
                background: '#F8FAFC',
                borderBottom: '1px solid #F1F5F9',
                padding: '14px',
                overflowY: 'auto',
                position: 'relative',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{activeSubmission.name}</div>
                    <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>{activeSubmission.assignment}</div>
                    <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 1 }}>Submitted {activeSubmission.submitted} · {activeSubmission.pages} pages</div>
                  </div>
                  <div style={{ fontSize: 22 }}>📄</div>
                </div>

                {/* Simulated PDF */}
                <div style={{
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: 8,
                  padding: '16px',
                  fontSize: 12,
                  color: '#374151',
                  lineHeight: 1.7,
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', marginBottom: 8, borderBottom: '1px solid #F1F5F9', paddingBottom: 8 }}>
                    L{"'"}Hôpital{"'"}s Rule — Problem Set 4 · Student Submission
                  </div>
                  <div style={{ color: '#475569', marginBottom: 8 }}>
                    <strong>Problem 1:</strong> Evaluate lim[x→0] (sin x / x)
                  </div>
                  <div style={{ color: '#374151', marginBottom: 6 }}>
                    Solution: Since both numerator and denominator approach 0, apply L{"'"}Hôpital{"'"}s Rule:
                    lim[x→0] (cos x / 1) = cos(0) = <strong style={{ color: '#10B981' }}>1</strong> ✓
                  </div>
                  <div style={{ color: '#94A3B8', fontSize: 11, marginTop: 10, fontStyle: 'italic' }}>
                    Teacher note: {activeSubmission.preview}
                  </div>
                </div>
              </div>

              {/* Grading inputs */}
              <div style={{ padding: '12px 14px', flexShrink: 0 }}>
                <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                  <div style={{ flex: '0 0 100px' }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Score</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={gradeInput}
                        onChange={e => setGradeInput(e.target.value)}
                        placeholder="—"
                        style={{
                          width: '100%',
                          padding: '7px 10px',
                          borderRadius: 8,
                          border: '1.5px solid #E2E8F0',
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 15,
                          fontWeight: 700,
                          color: '#0F172A',
                          outline: 'none',
                          background: '#FAFAFA',
                          textAlign: 'center',
                        }}
                        onFocus={e => e.target.style.borderColor = '#4F46E5'}
                        onBlur={e => e.target.style.borderColor = '#E2E8F0'}
                      />
                      <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600 }}>/100</span>
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Feedback</label>
                    <input
                      value={feedbackInput}
                      onChange={e => setFeedbackInput(e.target.value)}
                      placeholder="Write feedback..."
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        borderRadius: 8,
                        border: '1.5px solid #E2E8F0',
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        fontSize: 12,
                        color: '#374151',
                        outline: 'none',
                        background: '#FAFAFA',
                      }}
                      onFocus={e => e.target.style.borderColor = '#4F46E5'}
                      onBlur={e => e.target.style.borderColor = '#E2E8F0'}
                    />
                  </div>
                </div>
                <button
                  onClick={saveGrade}
                  style={{
                    width: '100%',
                    padding: '9px',
                    borderRadius: 8,
                    border: 'none',
                    background: 'linear-gradient(135deg, #4F46E5, #6366F1)',
                    color: '#FFF',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 2px 10px rgba(79,70,229,0.25)',
                  }}
                >Submit Grade →</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
