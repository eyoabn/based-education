import { useState } from 'react'
import type { Screen } from '../App'

interface Props {
  onNavigate: (s: Screen) => void
}

const POSTS = [
  {
    id: 1,
    author: 'Dr. Sarah Chen',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=40&h=40&fit=crop&auto=format',
    role: 'Mathematics',
    verified: true,
    time: '2h ago',
    class: 'Advanced Calculus — Grade 12',
    body: "Today we explored the concept of L'Hôpital's Rule and its application in evaluating indeterminate forms. Make sure to review the attached problem set before Thursday's exam. Focus especially on the composite function examples on pages 7–9.",
    attachment: { type: 'pdf', name: 'LHopital_Problem_Set.pdf', size: '2.4 MB' },
    likes: 47,
    comments: 12,
    bookmarks: 8,
    liked: false,
    bookmarked: false,
  },
  {
    id: 2,
    author: 'Prof. James Okoye',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&auto=format',
    role: 'Physics',
    verified: true,
    time: '5h ago',
    class: 'Quantum Mechanics — Grade 11',
    body: "Reminder: Our live lab session on double-slit experiment simulation is scheduled for tomorrow at 3:00 PM. I've uploaded the pre-lab reading material and a short quiz that must be completed before joining. The session will be recorded.",
    attachment: { type: 'slides', name: 'QuantumLab_Preread.pptx', size: '8.1 MB' },
    likes: 63,
    comments: 24,
    bookmarks: 19,
    liked: true,
    bookmarked: false,
  },
  {
    id: 3,
    author: 'Ms. Priya Sharma',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&h=40&fit=crop&auto=format',
    role: 'Literature',
    verified: true,
    time: '1d ago',
    class: 'World Literature — Grade 10',
    body: 'Excellent submissions on the comparative essay this week — I was genuinely impressed by the depth of analysis. Check your grades in the dashboard. Top essays will be featured in our next school newsletter.',
    attachment: null,
    likes: 91,
    comments: 33,
    bookmarks: 27,
    liked: false,
    bookmarked: true,
  },
]

const UPCOMING = [
  { title: 'Advanced Calculus', time: 'Today, 3:00 PM', subject: 'Differential Equations', live: true },
  { title: 'Quantum Mechanics', time: 'Tomorrow, 10:00 AM', subject: 'Wave-Particle Duality', live: false },
  { title: 'World Literature', time: 'Thu, 2:00 PM', subject: 'Romanticism in Modern Poetry', live: false },
]

export default function FeedScreen({ onNavigate }: Props) {
  const [posts, setPosts] = useState(POSTS)
  const [postText, setPostText] = useState('')
  const [selectedClass, setSelectedClass] = useState('all')
  const [expandedComments, setExpandedComments] = useState<number[]>([])

  const toggleLike = (id: number) => {
    setPosts(ps => ps.map(p => p.id === id ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 } : p))
  }
  const toggleBookmark = (id: number) => {
    setPosts(ps => ps.map(p => p.id === id ? { ...p, bookmarked: !p.bookmarked, bookmarks: p.bookmarked ? p.bookmarks - 1 : p.bookmarks + 1 } : p))
  }

  return (
    <div style={{ display: 'flex', height: '100%', background: '#F8FAFC' }}>
      {/* Left sidebar */}
      <aside style={{ width: 220, flexShrink: 0, padding: '24px 16px', borderRight: '1px solid #E2E8F0', overflowY: 'auto' }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: 10 }}>
            My Classes
          </div>
          {[
            { id: 'all', label: 'All Posts', count: 3 },
            { id: 'calc', label: 'Advanced Calculus', count: 1 },
            { id: 'quantum', label: 'Quantum Mechanics', count: 1 },
            { id: 'lit', label: 'World Literature', count: 1 },
          ].map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedClass(c.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '8px 10px',
                borderRadius: 8,
                border: 'none',
                cursor: 'pointer',
                background: selectedClass === c.id ? '#EEF2FF' : 'transparent',
                color: selectedClass === c.id ? '#4F46E5' : '#374151',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: 13,
                fontWeight: selectedClass === c.id ? 600 : 400,
                textAlign: 'left',
                transition: 'all 0.15s',
              }}
            >
              <span>{c.label}</span>
              <span style={{
                background: selectedClass === c.id ? '#4F46E5' : '#F1F5F9',
                color: selectedClass === c.id ? '#FFF' : '#64748B',
                borderRadius: 100,
                padding: '1px 7px',
                fontSize: 11,
                fontWeight: 700,
              }}>{c.count}</span>
            </button>
          ))}
        </div>

        <div style={{ height: 1, background: '#E2E8F0', margin: '16px 0' }} />

        <div>
          <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: 10 }}>
            Quick Links
          </div>
          {['📌 Pinned Posts', '🔖 Bookmarked', '📁 My Resources', '📊 Class Analytics'].map(l => (
            <button key={l} style={{
              display: 'block',
              width: '100%',
              padding: '8px 10px',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              background: 'transparent',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 13,
              color: '#374151',
              textAlign: 'left',
              transition: 'background 0.15s',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = '#F1F5F9')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >{l}</button>
          ))}
        </div>
      </aside>

      {/* Center feed */}
      <main style={{ flex: 1, overflowY: 'auto', padding: '24px 24px' }}>
        {/* Post composer */}
        <div style={{
          background: '#FFFFFF',
          borderRadius: 14,
          border: '1px solid #E2E8F0',
          padding: '16px 20px',
          marginBottom: 20,
          boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
        }}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            <img
              src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=40&h=40&fit=crop&auto=format"
              alt="Your avatar"
              style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
            />
            <textarea
              value={postText}
              onChange={e => setPostText(e.target.value)}
              placeholder="Share an update, resource, or announcement with your class..."
              style={{
                flex: 1,
                border: 'none',
                background: 'transparent',
                resize: 'none',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: 14,
                color: '#374151',
                outline: 'none',
                minHeight: 56,
                lineHeight: 1.6,
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { icon: '📎', label: 'Attach PDF' },
                { icon: '📊', label: 'Slides' },
                { icon: '🔗', label: 'Link' },
              ].map(a => (
                <button key={a.label} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px',
                  borderRadius: 7,
                  border: '1px solid #E2E8F0',
                  background: '#FAFAFA',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 12,
                  fontWeight: 500,
                  color: '#64748B',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#4F46E5'; (e.currentTarget as HTMLElement).style.color = '#4F46E5' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#E2E8F0'; (e.currentTarget as HTMLElement).style.color = '#64748B' }}
                >
                  <span>{a.icon}</span>{a.label}
                </button>
              ))}
              <select style={{
                padding: '6px 12px',
                borderRadius: 7,
                border: '1px solid #E2E8F0',
                background: '#FAFAFA',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: 12,
                color: '#64748B',
                cursor: 'pointer',
                outline: 'none',
              }}>
                <option>📚 Select Class</option>
                <option>Advanced Calculus</option>
                <option>Quantum Mechanics</option>
                <option>World Literature</option>
              </select>
            </div>
            <button style={{
              padding: '8px 20px',
              borderRadius: 8,
              border: 'none',
              background: postText ? 'linear-gradient(135deg, #4F46E5, #6366F1)' : '#E2E8F0',
              color: postText ? '#FFF' : '#94A3B8',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 13,
              fontWeight: 700,
              cursor: postText ? 'pointer' : 'default',
              transition: 'all 0.2s',
              boxShadow: postText ? '0 2px 10px rgba(79,70,229,0.3)' : 'none',
            }}>Post →</button>
          </div>
        </div>

        {/* Posts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {posts.map(post => (
            <article key={post.id} style={{
              background: '#FFFFFF',
              borderRadius: 14,
              border: '1px solid #E2E8F0',
              padding: '20px',
              boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
              transition: 'box-shadow 0.2s',
            }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.08)')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.04)')}
            >
              <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <img src={post.avatar} alt={post.author} style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover' }} />
                  {post.verified && (
                    <div style={{
                      position: 'absolute',
                      bottom: -2,
                      right: -2,
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      background: '#4F46E5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 9,
                      border: '2px solid #FFF',
                    }}>✓</div>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700, fontSize: 14, color: '#0F172A' }}>{post.author}</span>
                    <span style={{
                      background: '#EEF2FF',
                      color: '#4F46E5',
                      borderRadius: 100,
                      padding: '2px 8px',
                      fontSize: 11,
                      fontWeight: 600,
                    }}>{post.role}</span>
                    <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 12, color: '#94A3B8', marginLeft: 'auto' }}>{post.time}</span>
                  </div>
                  <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 12, color: '#64748B', marginTop: 2 }}>
                    📚 {post.class}
                  </div>
                </div>
              </div>

              <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 14, color: '#374151', lineHeight: 1.65, margin: '0 0 14px' }}>
                {post.body}
              </p>

              {post.attachment && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  background: '#F8FAFC',
                  borderRadius: 10,
                  border: '1px solid #E2E8F0',
                  padding: '10px 14px',
                  marginBottom: 14,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#EEF2FF'; (e.currentTarget as HTMLElement).style.borderColor = '#4F46E5' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#F8FAFC'; (e.currentTarget as HTMLElement).style.borderColor = '#E2E8F0' }}
                >
                  <div style={{ fontSize: 24 }}>{post.attachment.type === 'pdf' ? '📄' : '📊'}</div>
                  <div>
                    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, fontWeight: 600, color: '#374151' }}>{post.attachment.name}</div>
                    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 11, color: '#94A3B8' }}>{post.attachment.size}</div>
                  </div>
                  <div style={{ marginLeft: 'auto', fontSize: 13, color: '#4F46E5', fontWeight: 600 }}>↓ Download</div>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: 4, paddingTop: 12, borderTop: '1px solid #F1F5F9' }}>
                <button onClick={() => toggleLike(post.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: 'none',
                  background: post.liked ? 'rgba(79,70,229,0.08)' : 'transparent',
                  color: post.liked ? '#4F46E5' : '#64748B',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}>
                  <span>{post.liked ? '❤️' : '🤍'}</span> {post.likes}
                </button>
                <button onClick={() => setExpandedComments(p => p.includes(post.id) ? p.filter(x => x !== post.id) : [...p, post.id])} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'transparent',
                  color: '#64748B',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#F1F5F9')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  💬 {post.comments}
                </button>
                <button onClick={() => toggleBookmark(post.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: 'none',
                  background: post.bookmarked ? 'rgba(245,158,11,0.08)' : 'transparent',
                  color: post.bookmarked ? '#F59E0B' : '#64748B',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}>
                  <span>{post.bookmarked ? '🔖' : '📌'}</span> {post.bookmarks}
                </button>
              </div>

              {/* Expanded comments */}
              {expandedComments.includes(post.id) && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #F1F5F9', animation: 'fade-up 0.3s ease' }}>
                  {[
                    { name: 'Emma Wilson', text: 'Thank you! The problem set is really helpful.', avatar: 'https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=32&h=32&fit=crop&auto=format', time: '1h ago' },
                    { name: 'Liam Torres', text: 'Could you clarify question 9 in the problem set?', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=32&h=32&fit=crop&auto=format', time: '45m ago' },
                  ].map(c => (
                    <div key={c.name} style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                      <img src={c.avatar} alt={c.name} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                      <div style={{
                        background: '#F8FAFC',
                        borderRadius: 10,
                        padding: '8px 12px',
                        flex: 1,
                      }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3 }}>
                          <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 12, fontWeight: 700, color: '#374151' }}>{c.name}</span>
                          <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 11, color: '#94A3B8' }}>{c.time}</span>
                        </div>
                        <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, color: '#374151', margin: 0 }}>{c.text}</p>
                      </div>
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=28&h=28&fit=crop&auto=format" alt="me" style={{ width: 28, height: 28, borderRadius: '50%' }} />
                    <input
                      placeholder="Write a comment..."
                      style={{
                        flex: 1,
                        padding: '7px 12px',
                        borderRadius: 20,
                        border: '1.5px solid #E2E8F0',
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        fontSize: 13,
                        color: '#374151',
                        background: '#F8FAFC',
                        outline: 'none',
                      }}
                      onFocus={e => { e.target.style.borderColor = '#4F46E5' }}
                      onBlur={e => { e.target.style.borderColor = '#E2E8F0' }}
                    />
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      </main>

      {/* Right panel */}
      <aside style={{ width: 260, flexShrink: 0, padding: '24px 16px', borderLeft: '1px solid #E2E8F0', overflowY: 'auto' }}>
        {/* Upcoming live */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: 12 }}>
            Upcoming Sessions
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {UPCOMING.map(u => (
              <div key={u.title} style={{
                background: '#FFFFFF',
                borderRadius: 10,
                border: '1px solid #E2E8F0',
                padding: '12px 14px',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#4F46E5'; (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 10px rgba(79,70,229,0.1)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#E2E8F0'; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                  <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{u.title}</span>
                  {u.live && <span className="live-indicator"><span className="live-dot" />LIVE</span>}
                </div>
                <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 11, color: '#64748B', marginBottom: 6 }}>{u.subject}</div>
                <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 11, fontWeight: 600, color: u.live ? '#10B981' : '#94A3B8' }}>{u.time}</div>
                {u.live && (
                  <button
                    onClick={() => {}}
                    style={{
                      marginTop: 8,
                      width: '100%',
                      padding: '7px',
                      borderRadius: 7,
                      border: 'none',
                      background: 'linear-gradient(135deg, #4F46E5, #6366F1)',
                      color: '#FFF',
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >🔴 Join Now</button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94A3B8', marginBottom: 12 }}>
          Quick Stats
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { val: '148', label: 'Students', icon: '👥', color: '#4F46E5' },
            { val: '94%', label: 'Attendance', icon: '📈', color: '#10B981' },
            { val: '23', label: 'Pending', icon: '📝', color: '#F59E0B' },
            { val: '4.8★', label: 'Rating', icon: '⭐', color: '#EF4444' },
          ].map(s => (
            <div key={s.label} style={{
              background: '#FFFFFF',
              borderRadius: 10,
              border: '1px solid #E2E8F0',
              padding: '12px',
            }}>
              <div style={{ fontSize: 18, marginBottom: 4 }}>{s.icon}</div>
              <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 17, color: s.color }}>{s.val}</div>
              <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 11, color: '#94A3B8', marginTop: 1 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  )
}
