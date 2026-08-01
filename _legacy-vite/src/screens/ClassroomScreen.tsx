import { useState } from 'react'

interface Props {
  onExit: () => void
}

const PARTICIPANTS = [
  { id: 1, name: 'Dr. Sarah Chen', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&auto=format', role: 'host', muted: false, video: true, hand: false, minutes: 48 },
  { id: 2, name: 'Emma Wilson', avatar: 'https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=80&h=80&fit=crop&auto=format', role: 'student', muted: false, video: true, hand: true, minutes: 46 },
  { id: 3, name: 'Liam Torres', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&auto=format', role: 'student', muted: true, video: false, hand: false, minutes: 44 },
  { id: 4, name: 'Zara Ahmed', avatar: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=80&h=80&fit=crop&auto=format', role: 'student', muted: false, video: true, hand: false, minutes: 48 },
  { id: 5, name: 'Noah Kim', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=80&h=80&fit=crop&auto=format', role: 'student', muted: true, video: true, hand: true, minutes: 31 },
  { id: 6, name: 'Maya Patel', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&auto=format', role: 'student', muted: false, video: false, hand: false, minutes: 28 },
]

const CHAT_MESSAGES = [
  { id: 1, author: 'Dr. Sarah Chen', text: '📌 Welcome everyone! Today we cover L\'Hôpital\'s Rule. Please keep mics muted unless speaking.', time: '3:01 PM', pinned: true, isHost: true },
  { id: 2, author: 'Emma Wilson', text: 'Could you repeat the formula for the second case?', time: '3:08 PM', pinned: false, isHost: false },
  { id: 3, author: 'Liam Torres', text: 'The slides are really clear, thank you!', time: '3:12 PM', pinned: false, isHost: false },
  { id: 4, author: 'Noah Kim', text: 'I have a question about the composite function example', time: '3:15 PM', pinned: false, isHost: false },
  { id: 5, author: 'Dr. Sarah Chen', text: 'Great question Noah — I\'ll address that in the next example.', time: '3:16 PM', pinned: false, isHost: true },
]

export default function ClassroomScreen({ onExit }: Props) {
  const [muted, setMuted] = useState(false)
  const [videoOn, setVideoOn] = useState(true)
  const [sharing, setSharing] = useState(false)
  const [drawerTab, setDrawerTab] = useState<'chat' | 'participants'>('chat')
  const [drawerOpen, setDrawerOpen] = useState(true)
  const [showModMenu, setShowModMenu] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [participants, setParticipants] = useState(PARTICIPANTS)
  const [chatMessages, setChatMessages] = useState(CHAT_MESSAGES)
  const [activeParticipant, setActiveParticipant] = useState(1)
  const [elapsed, _setElapsed] = useState('48:12')

  const muteAll = () => {
    setParticipants(ps => ps.map(p => p.role === 'student' ? { ...p, muted: true } : p))
  }

  const sendMessage = () => {
    if (!chatInput.trim()) return
    setChatMessages(msgs => [...msgs, {
      id: msgs.length + 1,
      author: 'Dr. Sarah Chen',
      text: chatInput,
      time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      pinned: false,
      isHost: true,
    }])
    setChatInput('')
  }

  const bgStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: '#090D16',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 100,
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  }

  return (
    <div style={bgStyle}>
      {/* Top bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 20px',
        background: 'rgba(15,23,42,0.8)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="live-indicator"><span className="live-dot" />LIVE</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#F1F5F9' }}>Advanced Calculus — Grade 12</div>
            <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>Dr. Sarah Chen · {participants.length} participants</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 15,
            fontWeight: 500,
            color: '#10B981',
            background: 'rgba(16,185,129,0.1)',
            padding: '4px 12px',
            borderRadius: 6,
            border: '1px solid rgba(16,185,129,0.2)',
          }}>⏱ {elapsed}</div>
          <button
            onClick={() => setDrawerOpen(!drawerOpen)}
            style={{
              padding: '6px 14px',
              borderRadius: 7,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.05)',
              color: '#94A3B8',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >{drawerOpen ? '⇥ Hide Panel' : '⇤ Show Panel'}</button>
          <button
            onClick={onExit}
            style={{
              padding: '6px 16px',
              borderRadius: 7,
              border: '1px solid rgba(239,68,68,0.2)',
              background: 'rgba(239,68,68,0.12)',
              color: '#EF4444',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            } as React.CSSProperties}
          >← Exit Preview</button>
        </div>
      </div>

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Video grid */}
        <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: 16, overflow: 'hidden' }}>
          {/* Active speaker */}
          <div style={{
            flex: 1,
            borderRadius: 16,
            overflow: 'hidden',
            position: 'relative',
            background: '#0F172A',
            border: '2px solid rgba(99,102,241,0.6)',
            boxShadow: '0 0 0 4px rgba(99,102,241,0.12)',
          }}>
            <img
              src="https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=900&h=500&fit=crop&auto=format"
              alt="Active speaker video"
              style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }}
            />
            {/* Active speaker name */}
            <div style={{
              position: 'absolute',
              bottom: 14,
              left: 14,
              background: 'rgba(9,13,22,0.8)',
              backdropFilter: 'blur(8px)',
              borderRadius: 8,
              padding: '5px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', animation: 'pulse-dot 1.5s infinite' }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#F1F5F9' }}>Dr. Sarah Chen</span>
              <span style={{ fontSize: 11, color: '#A5B4FC', marginLeft: 4 }}>Host · Speaking</span>
            </div>
            {/* Screen share badge */}
            {sharing && (
              <div style={{
                position: 'absolute',
                top: 14,
                left: 14,
                background: 'rgba(16,185,129,0.9)',
                borderRadius: 7,
                padding: '4px 10px',
                fontSize: 11,
                fontWeight: 700,
                color: '#FFF',
              }}>📺 Screen Share Active</div>
            )}
          </div>

          {/* Participant thumbnails */}
          <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
            {participants.slice(1).map(p => (
              <div
                key={p.id}
                onClick={() => setActiveParticipant(p.id)}
                style={{
                  width: 120,
                  height: 80,
                  borderRadius: 10,
                  overflow: 'hidden',
                  position: 'relative',
                  cursor: 'pointer',
                  border: activeParticipant === p.id ? '2px solid #6366F1' : '2px solid rgba(255,255,255,0.06)',
                  transition: 'border-color 0.2s',
                  background: '#1E293B',
                  flexShrink: 0,
                }}
              >
                {p.video ? (
                  <img src={p.avatar} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1E293B' }}>
                    <div style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #4F46E5, #6366F1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 16,
                      fontWeight: 700,
                      color: '#FFF',
                    }}>{p.name[0]}</div>
                  </div>
                )}
                <div style={{
                  position: 'absolute',
                  bottom: 4,
                  left: 4,
                  right: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: '#F1F5F9', background: 'rgba(0,0,0,0.6)', borderRadius: 4, padding: '2px 5px' }}>
                    {p.name.split(' ')[0]}
                  </span>
                  <div style={{ display: 'flex', gap: 3 }}>
                    {p.muted && <span style={{ fontSize: 10, background: 'rgba(239,68,68,0.8)', borderRadius: 3, padding: '1px 4px', color: '#FFF' }}>🔇</span>}
                    {p.hand && <span style={{ fontSize: 10, background: 'rgba(245,158,11,0.8)', borderRadius: 3, padding: '1px 4px' }}>✋</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right drawer */}
        {drawerOpen && (
          <div style={{
            width: 320,
            background: '#0F172A',
            borderLeft: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            flexDirection: 'column',
            animation: 'slide-in-right 0.3s ease',
          }}>
            {/* Tabs */}
            <div style={{ display: 'flex', padding: '12px 12px 0', gap: 4, flexShrink: 0 }}>
              {(['chat', 'participants'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setDrawerTab(tab)}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '8px 8px 0 0',
                    border: 'none',
                    background: drawerTab === tab ? '#1E293B' : 'transparent',
                    color: drawerTab === tab ? '#A5B4FC' : '#64748B',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                    borderBottom: drawerTab === tab ? '2px solid #6366F1' : '2px solid transparent',
                    transition: 'all 0.15s',
                  }}
                >
                  {tab === 'chat' ? '💬 Live Chat' : `👥 Participants (${participants.length})`}
                </button>
              ))}
            </div>

            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#1E293B', borderRadius: '0 0 0 0' }}>
              {drawerTab === 'chat' ? (
                <>
                  <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
                    {chatMessages.map(msg => (
                      <div key={msg.id} style={{ marginBottom: 12 }}>
                        {msg.pinned && (
                          <div style={{
                            background: 'rgba(79,70,229,0.12)',
                            border: '1px solid rgba(99,102,241,0.2)',
                            borderRadius: 8,
                            padding: '8px 10px',
                            marginBottom: 4,
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 8,
                          }}>
                            <span style={{ fontSize: 12 }}>📌</span>
                            <div>
                              <div style={{ fontSize: 10, fontWeight: 700, color: '#A5B4FC', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Pinned Announcement</div>
                              <div style={{ fontSize: 12, color: '#CBD5E1', lineHeight: 1.5 }}>{msg.text}</div>
                            </div>
                          </div>
                        )}
                        {!msg.pinned && (
                          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                            <div style={{
                              width: 28,
                              height: 28,
                              borderRadius: '50%',
                              background: msg.isHost ? 'linear-gradient(135deg, #4F46E5, #6366F1)' : '#334155',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 11,
                              fontWeight: 700,
                              color: '#FFF',
                              flexShrink: 0,
                            }}>{msg.author[0]}</div>
                            <div>
                              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 2 }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: msg.isHost ? '#A5B4FC' : '#94A3B8' }}>{msg.author}</span>
                                <span style={{ fontSize: 10, color: '#475569' }}>{msg.time}</span>
                              </div>
                              <div style={{ fontSize: 13, color: '#CBD5E1', lineHeight: 1.5 }}>{msg.text}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div style={{ padding: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && sendMessage()}
                        placeholder="Send a message..."
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          borderRadius: 8,
                          border: '1px solid rgba(255,255,255,0.08)',
                          background: '#0F172A',
                          color: '#F1F5F9',
                          fontFamily: "'Plus Jakarta Sans', sans-serif",
                          fontSize: 13,
                          outline: 'none',
                        }}
                      />
                      <button onClick={sendMessage} style={{
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: 'none',
                        background: '#4F46E5',
                        color: '#FFF',
                        fontSize: 14,
                        cursor: 'pointer',
                      }}>→</button>
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
                  {participants.map(p => (
                    <div key={p.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px',
                      borderRadius: 8,
                      marginBottom: 4,
                      transition: 'background 0.15s',
                    }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <img src={p.avatar} alt={p.name} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                        <div style={{ position: 'absolute', bottom: 0, right: 0, width: 9, height: 9, borderRadius: '50%', background: '#10B981', border: '1.5px solid #1E293B' }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#F1F5F9', display: 'flex', alignItems: 'center', gap: 5 }}>
                          {p.name}
                          {p.role === 'host' && <span style={{ fontSize: 9, background: '#4F46E5', color: '#FFF', borderRadius: 3, padding: '1px 5px', fontWeight: 700 }}>HOST</span>}
                          {p.hand && <span style={{ fontSize: 12 }}>✋</span>}
                        </div>
                        <div style={{ fontSize: 10, color: '#64748B', marginTop: 1 }}>
                          <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{p.minutes}m</span> active
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <div style={{ fontSize: 12 }}>{p.muted ? '🔇' : '🎙'}</div>
                        <div style={{ fontSize: 12 }}>{p.video ? '📹' : '📷'}</div>
                        {p.role !== 'host' && (
                          <button style={{
                            padding: '2px 8px',
                            borderRadius: 4,
                            border: '1px solid rgba(239,68,68,0.2)',
                            background: 'rgba(239,68,68,0.08)',
                            color: '#EF4444',
                            fontSize: 10,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}>✕</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Control bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px 24px',
        background: 'rgba(9,13,22,0.95)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        gap: 10,
        position: 'relative',
        flexShrink: 0,
      }}>
        {/* Control buttons */}
        {[
          { icon: muted ? '🔇' : '🎙', label: muted ? 'Unmute' : 'Mute', action: () => setMuted(!muted), active: muted, danger: false },
          { icon: videoOn ? '📹' : '📷', label: videoOn ? 'Stop Video' : 'Start Video', action: () => setVideoOn(!videoOn), active: !videoOn, danger: false },
          { icon: '🖥', label: 'Share Screen', action: () => setSharing(!sharing), active: sharing, danger: false },
          { icon: '✋', label: 'Raise Hand', action: () => {}, active: false, danger: false },
        ].map(btn => (
          <button
            key={btn.label}
            onClick={btn.action}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              padding: '10px 16px',
              borderRadius: 10,
              border: btn.active ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(255,255,255,0.08)',
              background: btn.active ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.04)',
              color: btn.active ? '#EF4444' : '#94A3B8',
              cursor: 'pointer',
              transition: 'all 0.15s',
              minWidth: 72,
            }}
            onMouseEnter={e => { if (!btn.active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)' }}
            onMouseLeave={e => { if (!btn.active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)' }}
          >
            <span style={{ fontSize: 20 }}>{btn.icon}</span>
            <span style={{ fontSize: 10, fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{btn.label}</span>
          </button>
        ))}

        {/* Separator */}
        <div style={{ width: 1, height: 48, background: 'rgba(255,255,255,0.08)', margin: '0 6px' }} />

        {/* Moderation */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowModMenu(!showModMenu)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              padding: '10px 16px',
              borderRadius: 10,
              border: '1px solid rgba(245,158,11,0.2)',
              background: showModMenu ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.06)',
              color: '#F59E0B',
              cursor: 'pointer',
              minWidth: 72,
            }}
          >
            <span style={{ fontSize: 20 }}>🛡</span>
            <span style={{ fontSize: 10, fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Moderate</span>
          </button>

          {showModMenu && (
            <div style={{
              position: 'absolute',
              bottom: 'calc(100% + 10px)',
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#1E293B',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.08)',
              padding: '8px',
              minWidth: 200,
              boxShadow: '0 -8px 32px rgba(0,0,0,0.4)',
              animation: 'fade-up 0.2s ease',
              zIndex: 50,
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748B', padding: '4px 8px 8px', borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: 6 }}>
                Host Controls
              </div>
              <button onClick={muteAll} style={{
                display: 'block', width: '100%', padding: '9px 12px', borderRadius: 8, border: 'none',
                background: 'transparent', color: '#CBD5E1', fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: 13, fontWeight: 500, textAlign: 'left', cursor: 'pointer', transition: 'background 0.15s',
              }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >🔇 Mute All Students</button>
              <button style={{
                display: 'block', width: '100%', padding: '9px 12px', borderRadius: 8, border: 'none',
                background: 'transparent', color: '#CBD5E1', fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: 13, fontWeight: 500, textAlign: 'left', cursor: 'pointer', transition: 'background 0.15s',
              }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >👤 Kick Participant...</button>
              <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '6px 0' }} />
              <button
                onClick={onExit}
                style={{
                  display: 'block', width: '100%', padding: '9px 12px', borderRadius: 8,
                  border: '1px solid rgba(239,68,68,0.2)',
                  background: 'rgba(239,68,68,0.1)', color: '#EF4444',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 13, fontWeight: 700, textAlign: 'left', cursor: 'pointer',
                  transition: 'background 0.15s',
                } as React.CSSProperties}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.2)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.1)')}
              >🔴 End Meeting for All</button>
            </div>
          )}
        </div>

        {/* Right side info */}
        <div style={{ position: 'absolute', right: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 13, color: '#64748B', fontFamily: "'JetBrains Mono', monospace" }}>
            {participants.length} <span style={{ fontSize: 10 }}>participants</span>
          </div>
        </div>
      </div>
    </div>
  )
}
