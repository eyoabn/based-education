import { useState } from 'react'
import type { Screen } from '../App'

interface Props {
  onNavigate: (s: Screen) => void
}

type VerificationStatus = 'pending' | 'approved' | 'rejected'

const TEACHERS = [
  {
    id: 1,
    name: 'Dr. Rachel Nguyen',
    email: 'r.nguyen@edu.com',
    expertise: 'Advanced Chemistry',
    submitted: 'Aug 1, 2026',
    avatar: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=40&h=40&fit=crop&auto=format',
    credentials: 'PhD_Chemistry_MIT.pdf',
    institution: 'MIT',
    status: 'pending' as VerificationStatus,
  },
  {
    id: 2,
    name: 'Mr. Carlos Reyes',
    email: 'c.reyes@edu.com',
    expertise: 'Spanish Literature',
    submitted: 'Jul 31, 2026',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&auto=format',
    credentials: 'MA_Literature_Columbia.pdf',
    institution: 'Columbia University',
    status: 'pending' as VerificationStatus,
  },
  {
    id: 3,
    name: 'Ms. Anna Kowalski',
    email: 'a.kowalski@edu.com',
    expertise: 'Data Science & ML',
    submitted: 'Jul 29, 2026',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=40&h=40&fit=crop&auto=format',
    credentials: 'MSc_DataScience_Stanford.pdf',
    institution: 'Stanford University',
    status: 'approved' as VerificationStatus,
  },
  {
    id: 4,
    name: 'Prof. Ethan Brooks',
    email: 'e.brooks@edu.com',
    expertise: 'Advanced Mathematics',
    submitted: 'Jul 28, 2026',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&auto=format',
    credentials: 'PhD_Math_Cambridge.pdf',
    institution: 'Cambridge University',
    status: 'rejected' as VerificationStatus,
  },
  {
    id: 5,
    name: 'Dr. Priya Menon',
    email: 'p.menon@edu.com',
    expertise: 'Neuroscience & Biology',
    submitted: 'Jul 27, 2026',
    avatar: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=40&h=40&fit=crop&auto=format',
    credentials: 'PhD_Neuroscience_Johns_Hopkins.pdf',
    institution: 'Johns Hopkins',
    status: 'pending' as VerificationStatus,
  },
]

const statusStyle = (s: VerificationStatus) => {
  if (s === 'approved') return { bg: 'rgba(16,185,129,0.1)', color: '#10B981', border: 'rgba(16,185,129,0.2)', label: '✓ Approved' }
  if (s === 'rejected') return { bg: 'rgba(239,68,68,0.1)', color: '#EF4444', border: 'rgba(239,68,68,0.2)', label: '✕ Rejected' }
  return { bg: 'rgba(245,158,11,0.1)', color: '#F59E0B', border: 'rgba(245,158,11,0.2)', label: '⏳ Pending' }
}

export default function AdminPortal({ onNavigate }: Props) {
  const [teachers, setTeachers] = useState(TEACHERS)
  const [filterStatus, setFilterStatus] = useState<'all' | VerificationStatus>('all')
  const [search, setSearch] = useState('')
  const [selectedTeacher, setSelectedTeacher] = useState<typeof TEACHERS[0] | null>(null)

  const updateStatus = (id: number, status: VerificationStatus) => {
    setTeachers(ts => ts.map(t => t.id === id ? { ...t, status } : t))
    if (selectedTeacher?.id === id) setSelectedTeacher(t => t ? { ...t, status } : null)
  }

  const filtered = teachers.filter(t => {
    const matchStatus = filterStatus === 'all' || t.status === filterStatus
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.email.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  const pendingCount = teachers.filter(t => t.status === 'pending').length
  const approvedCount = teachers.filter(t => t.status === 'approved').length

  return (
    <div style={{ padding: '28px', fontFamily: "'Plus Jakarta Sans', sans-serif", overflowY: 'auto', height: '100%' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontWeight: 800, fontSize: 24, color: '#0F172A', letterSpacing: '-0.03em', marginBottom: 4 }}>Super Admin Portal</h1>
        <p style={{ fontSize: 13, color: '#64748B' }}>Manage teacher verifications, users, and platform settings</p>
      </div>

      {/* Metric cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
        {[
          { label: 'Total Users', val: '8,429', sub: '+312 this week', icon: '👥', color: '#4F46E5', bg: '#EEF2FF' },
          { label: 'Pending Verifications', val: String(pendingCount), sub: 'Requires review', icon: '⏳', color: '#F59E0B', bg: 'rgba(245,158,11,0.08)', urgent: true },
          { label: 'Active Teachers', val: String(approvedCount + 1142), sub: '+8 this month', icon: '👩‍🏫', color: '#10B981', bg: 'rgba(16,185,129,0.08)' },
          { label: 'Monthly Revenue', val: '$48.2K', sub: '+19% vs last month', icon: '💰', color: '#6366F1', bg: '#F5F3FF' },
        ].map(s => (
          <div key={s.label} style={{
            background: '#FFFFFF',
            borderRadius: 14,
            border: `1px solid ${s.urgent ? 'rgba(245,158,11,0.2)' : '#E2E8F0'}`,
            padding: '18px',
            boxShadow: s.urgent ? '0 2px 12px rgba(245,158,11,0.1)' : '0 2px 10px rgba(0,0,0,0.04)',
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
              {s.urgent && pendingCount > 0 && (
                <div style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#F59E0B',
                  animation: 'pulse-dot 1.5s ease-in-out infinite',
                }} />
              )}
            </div>
            <div style={{ fontWeight: 800, fontSize: 26, color: s.color, letterSpacing: '-0.02em', lineHeight: 1 }}>{s.val}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginTop: 4 }}>{s.label}</div>
            <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Verification table */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: 14,
        border: '1px solid #E2E8F0',
        overflow: 'hidden',
        boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
      }}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ fontWeight: 700, fontSize: 15, color: '#0F172A', margin: 0 }}>Teacher Verification Requests</h2>
            <p style={{ fontSize: 12, color: '#94A3B8', margin: '2px 0 0' }}>{pendingCount} pending review</p>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#94A3B8' }}>🔍</span>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or email..."
                style={{
                  padding: '7px 12px 7px 30px',
                  borderRadius: 8,
                  border: '1.5px solid #E2E8F0',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 13,
                  color: '#374151',
                  outline: 'none',
                  width: 220,
                }}
                onFocus={e => e.target.style.borderColor = '#4F46E5'}
                onBlur={e => e.target.style.borderColor = '#E2E8F0'}
              />
            </div>

            {/* Filter */}
            {(['all', 'pending', 'approved', 'rejected'] as const).map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 7,
                  border: `1.5px solid ${filterStatus === s ? '#4F46E5' : '#E2E8F0'}`,
                  background: filterStatus === s ? '#EEF2FF' : 'transparent',
                  color: filterStatus === s ? '#4F46E5' : '#64748B',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >{s}</button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #F1F5F9' }}>
                {['Teacher', 'Expertise', 'Institution', 'Credentials', 'Submitted', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{
                    padding: '10px 16px',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#94A3B8',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    textAlign: 'left',
                    whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => {
                const ss = statusStyle(t.status)
                return (
                  <tr
                    key={t.id}
                    style={{
                      borderBottom: '1px solid #F8FAFC',
                      transition: 'background 0.15s',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#FAFBFF')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    onClick={() => setSelectedTeacher(selectedTeacher?.id === t.id ? null : t)}
                  >
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <img src={t.avatar} alt={t.name} style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                        <div>
                          <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{t.name}</div>
                          <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 11, color: '#94A3B8' }}>{t.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, color: '#374151' }}>{t.expertise}</span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 12, color: '#64748B' }}>{t.institution}</span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <button
                        onClick={e => e.stopPropagation()}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 5,
                          padding: '4px 10px',
                          borderRadius: 6,
                          border: '1px solid #E2E8F0',
                          background: '#F8FAFC',
                          fontFamily: "'Plus Jakarta Sans', sans-serif",
                          fontSize: 11,
                          fontWeight: 600,
                          color: '#4F46E5',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#EEF2FF' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#F8FAFC' }}
                      >📄 {t.credentials}</button>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 12, color: '#64748B' }}>{t.submitted}</span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '3px 10px',
                        borderRadius: 100,
                        fontSize: 11,
                        fontWeight: 700,
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        background: ss.bg,
                        color: ss.color,
                        border: `1px solid ${ss.border}`,
                        whiteSpace: 'nowrap',
                      }}>{ss.label}</span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {t.status === 'pending' ? (
                        <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => updateStatus(t.id, 'approved')}
                            style={{
                              padding: '5px 12px',
                              borderRadius: 7,
                              border: '1px solid rgba(16,185,129,0.2)',
                              background: 'rgba(16,185,129,0.1)',
                              color: '#10B981',
                              fontFamily: "'Plus Jakarta Sans', sans-serif",
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: 'pointer',
                              transition: 'all 0.15s',
                            } as React.CSSProperties}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(16,185,129,0.2)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(16,185,129,0.1)')}
                          >✓ Approve</button>
                          <button
                            onClick={() => updateStatus(t.id, 'rejected')}
                            style={{
                              padding: '5px 12px',
                              borderRadius: 7,
                              border: '1px solid rgba(239,68,68,0.2)',
                              background: 'rgba(239,68,68,0.08)',
                              color: '#EF4444',
                              fontFamily: "'Plus Jakarta Sans', sans-serif",
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: 'pointer',
                              transition: 'all 0.15s',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.15)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
                          >✕ Reject</button>
                        </div>
                      ) : (
                        <button
                          onClick={e => { e.stopPropagation(); updateStatus(t.id, 'pending') }}
                          style={{
                            padding: '5px 12px',
                            borderRadius: 7,
                            border: '1px solid #E2E8F0',
                            background: 'transparent',
                            color: '#94A3B8',
                            fontFamily: "'Plus Jakarta Sans', sans-serif",
                            fontSize: 12,
                            fontWeight: 500,
                            cursor: 'pointer',
                          }}
                        >↺ Reset</button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div style={{ padding: '48px', textAlign: 'center', color: '#94A3B8', fontSize: 14 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
              No results found
            </div>
          )}
        </div>

        {/* Expanded row detail */}
        {selectedTeacher && (
          <div style={{
            padding: '20px',
            background: '#FAFBFF',
            borderTop: '1px solid #EEF2FF',
            animation: 'fade-up 0.3s ease',
          }}>
            <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
              <img src={selectedTeacher.avatar} alt={selectedTeacher.name} style={{ width: 56, height: 56, borderRadius: 12, objectFit: 'cover', border: '2px solid #E2E8F0' }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 6 }}>
                  <h3 style={{ fontWeight: 800, fontSize: 16, color: '#0F172A', margin: 0 }}>{selectedTeacher.name}</h3>
                  <span style={{ fontSize: 12, color: '#4F46E5', fontWeight: 600 }}>{selectedTeacher.email}</span>
                </div>
                <div style={{ display: 'flex', gap: 20 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Expertise</div>
                    <div style={{ fontSize: 13, color: '#374151' }}>{selectedTeacher.expertise}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Institution</div>
                    <div style={{ fontSize: 13, color: '#374151' }}>{selectedTeacher.institution}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Submitted</div>
                    <div style={{ fontSize: 13, color: '#374151' }}>{selectedTeacher.submitted}</div>
                  </div>
                </div>
              </div>
              {selectedTeacher.status === 'pending' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => updateStatus(selectedTeacher.id, 'approved')} style={{
                    padding: '9px 20px',
                    borderRadius: 8,
                    border: 'none',
                    background: 'linear-gradient(135deg, #10B981, #059669)',
                    color: '#FFF',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 2px 10px rgba(16,185,129,0.3)',
                  }}>✓ Approve Teacher</button>
                  <button onClick={() => updateStatus(selectedTeacher.id, 'rejected')} style={{
                    padding: '9px 20px',
                    borderRadius: 8,
                    border: '1.5px solid rgba(239,68,68,0.3)',
                    background: 'rgba(239,68,68,0.08)',
                    color: '#EF4444',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}>✕ Reject</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
