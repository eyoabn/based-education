import { useState, useEffect } from 'react'

interface Props {
  onExit: () => void
}

const QUESTIONS = [
  {
    id: 1,
    question: "Which of the following correctly states L'Hôpital's Rule?",
    type: 'single',
    options: [
      "If lim f(x) = lim g(x) = 0, then lim[f(x)/g(x)] = lim[f'(x)/g'(x)]",
      "If lim f(x) = lim g(x) = ∞, then lim[f(x)/g(x)] = f'(x)/g'(x)",
      "For any differentiable functions, lim[f(x)/g(x)] = lim[f'(x)/g'(x)]",
      "L'Hôpital's Rule only applies when both limits equal zero",
    ],
    correct: 0,
  },
  {
    id: 2,
    question: "Evaluate: lim[x→0] (sin(3x) / x)",
    type: 'single',
    options: ['0', '1', '3', 'undefined'],
    correct: 2,
  },
  {
    id: 3,
    question: "Which indeterminate forms can L'Hôpital's Rule be directly applied to?",
    type: 'multi',
    options: ['0/0', '∞/∞', '0 × ∞', '1^∞'],
    correct: [0, 1],
  },
  {
    id: 4,
    question: "Evaluate: lim[x→∞] (ln x / x)",
    type: 'single',
    options: ['∞', '1', '0', 'ln(∞)'],
    correct: 2,
  },
  {
    id: 5,
    question: "For the function f(x) = e^x / x^2 as x → ∞, the limit equals:",
    type: 'single',
    options: ['0', '1/2', '∞', 'e'],
    correct: 2,
  },
]

export default function ExamPortal({ onExit }: Props) {
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState<Record<number, number | number[]>>({})
  const [flagged, setFlagged] = useState<number[]>([])
  const [timeLeft, setTimeLeft] = useState(45 * 60) // 45 minutes
  const [submitted, setSubmitted] = useState(false)
  const [tabWarnings, setTabWarnings] = useState(0)
  const [showSubmitModal, setShowSubmitModal] = useState(false)

  useEffect(() => {
    if (submitted) return
    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 0) { setSubmitted(true); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [submitted])

  // Simulate tab-switch detection
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) setTabWarnings(w => w + 1)
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  const q = QUESTIONS[currentQ]

  const setAnswer = (idx: number) => {
    if (q.type === 'single') {
      setAnswers(a => ({ ...a, [q.id]: idx }))
    } else {
      setAnswers(a => {
        const prev = (a[q.id] as number[]) || []
        return { ...a, [q.id]: prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx] }
      })
    }
  }

  const isSelected = (idx: number) => {
    const ans = answers[q.id]
    if (q.type === 'single') return ans === idx
    return Array.isArray(ans) && ans.includes(idx)
  }

  const answered = Object.keys(answers).length
  const pct = Math.round((answered / QUESTIONS.length) * 100)

  if (submitted) {
    return (
      <div style={{
        position: 'fixed', inset: 0,
        background: '#0F172A',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        zIndex: 100,
      }}>
        <div style={{ textAlign: 'center', animation: 'fade-up 0.5s ease' }}>
          <div style={{ fontSize: 64, marginBottom: 20 }}>🎉</div>
          <h1 style={{ fontWeight: 800, fontSize: 28, color: '#F1F5F9', marginBottom: 10 }}>Exam Submitted!</h1>
          <p style={{ fontSize: 15, color: '#94A3B8', marginBottom: 32 }}>
            You answered {answered} of {QUESTIONS.length} questions.<br />
            Your results will be available within 24 hours.
          </p>
          <div style={{
            background: '#1E293B',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 12,
            padding: '20px 28px',
            marginBottom: 28,
            display: 'flex',
            gap: 32,
          }}>
            <div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 28, fontWeight: 700, color: '#A5B4FC' }}>{answered}/{QUESTIONS.length}</div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>Questions Answered</div>
            </div>
            <div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 28, fontWeight: 700, color: '#10B981' }}>{fmt(45 * 60 - timeLeft)}</div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>Time Used</div>
            </div>
            <div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 28, fontWeight: 700, color: tabWarnings > 0 ? '#EF4444' : '#10B981' }}>{tabWarnings}</div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>Tab Switches</div>
            </div>
          </div>
          <button onClick={onExit} style={{
            padding: '12px 28px',
            borderRadius: 10,
            border: 'none',
            background: 'linear-gradient(135deg, #4F46E5, #6366F1)',
            color: '#FFF',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(79,70,229,0.4)',
          }}>← Return to Dashboard</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: '#0F172A',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      zIndex: 100,
    }}>
      {/* Top bar */}
      <div style={{
        background: timeLeft < 300 ? 'rgba(239,68,68,0.15)' : '#111827',
        borderBottom: `1px solid ${timeLeft < 300 ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.06)'}`,
        padding: '0 24px',
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        transition: 'background 0.3s',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#F1F5F9' }}>Advanced Calculus — Final Examination</div>
          <div style={{
            fontSize: 11,
            fontWeight: 600,
            color: '#94A3B8',
            background: 'rgba(255,255,255,0.05)',
            padding: '3px 10px',
            borderRadius: 5,
            border: '1px solid rgba(255,255,255,0.06)',
          }}>
            Question {currentQ + 1} of {QUESTIONS.length}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Anti-cheat warning */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 11,
            fontWeight: 600,
            color: tabWarnings > 0 ? '#EF4444' : '#64748B',
            background: tabWarnings > 0 ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.04)',
            padding: '4px 10px',
            borderRadius: 6,
            border: `1px solid ${tabWarnings > 0 ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.06)'}`,
            transition: 'all 0.3s',
          }}>
            🛡 Full-Screen Guard Active
            {tabWarnings > 0 && <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>· {tabWarnings} switch{tabWarnings > 1 ? 'es' : ''} logged</span>}
          </div>

          {/* Timer */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 18,
            fontWeight: 700,
            color: timeLeft < 300 ? '#EF4444' : timeLeft < 600 ? '#F59E0B' : '#A5B4FC',
            background: 'rgba(255,255,255,0.05)',
            padding: '6px 14px',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            ⏱ {fmt(timeLeft)}
          </div>

          <button
            onClick={() => setShowSubmitModal(true)}
            style={{
              padding: '8px 18px',
              borderRadius: 8,
              border: 'none',
              background: 'linear-gradient(135deg, #4F46E5, #6366F1)',
              color: '#FFF',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 10px rgba(79,70,229,0.4)',
            }}
          >Submit Exam</button>
        </div>
      </div>

      {/* Tab-switch banner */}
      {tabWarnings > 0 && (
        <div style={{
          background: 'rgba(239,68,68,0.12)',
          borderBottom: '1px solid rgba(239,68,68,0.2)',
          padding: '8px 24px',
          fontSize: 12,
          fontWeight: 600,
          color: '#EF4444',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexShrink: 0,
        }}>
          ⚠️ Warning: Tab-switching detected and logged ({tabWarnings} time{tabWarnings > 1 ? 's' : ''}). This will be reported with your submission.
        </div>
      )}

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Question navigator */}
        <div style={{
          width: 200,
          flexShrink: 0,
          background: '#111827',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          padding: '20px 14px',
          overflowY: 'auto',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#475569', marginBottom: 14 }}>
            Questions
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 20 }}>
            {QUESTIONS.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentQ(i)}
                style={{
                  aspectRatio: '1',
                  borderRadius: 7,
                  border: flagged.includes(i) ? '1px solid rgba(245,158,11,0.3)' : '1px solid transparent',
                  background: i === currentQ
                    ? '#4F46E5'
                    : answers[QUESTIONS[i].id] !== undefined
                      ? 'rgba(16,185,129,0.15)'
                      : flagged.includes(i)
                        ? 'rgba(245,158,11,0.15)'
                        : 'rgba(255,255,255,0.04)',
                  color: i === currentQ ? '#FFF' : answers[QUESTIONS[i].id] !== undefined ? '#10B981' : flagged.includes(i) ? '#F59E0B' : '#64748B',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                } as React.CSSProperties}
              >{i + 1}</button>
            ))}
          </div>

          {/* Progress */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748B', marginBottom: 6, fontWeight: 600 }}>
              <span>Progress</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#A5B4FC' }}>{pct}%</span>
            </div>
            <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, #4F46E5, #10B981)', borderRadius: 3, transition: 'width 0.3s ease' }} />
            </div>
          </div>

          <div style={{ fontSize: 11, color: '#475569', fontWeight: 600, lineHeight: 1.6 }}>
            <div>✅ {answered} answered</div>
            <div>🚩 {flagged.length} flagged</div>
            <div>⬜ {QUESTIONS.length - answered} remaining</div>
          </div>
        </div>

        {/* Question panel */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: '100%', maxWidth: 680 }}>
            {/* Question header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
              <div style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#64748B',
                background: 'rgba(255,255,255,0.06)',
                padding: '4px 12px',
                borderRadius: 6,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}>
                {q.type === 'multi' ? 'Multi-select' : 'Single Choice'} · Question {currentQ + 1}
              </div>
              <button
                onClick={() => setFlagged(f => f.includes(currentQ) ? f.filter(i => i !== currentQ) : [...f, currentQ])}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '5px 12px',
                  borderRadius: 7,
                  border: `1px solid ${flagged.includes(currentQ) ? 'rgba(245,158,11,0.4)' : 'rgba(255,255,255,0.1)'}`,
                  background: flagged.includes(currentQ) ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.04)',
                  color: flagged.includes(currentQ) ? '#F59E0B' : '#64748B',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >🚩 {flagged.includes(currentQ) ? 'Flagged' : 'Flag for Review'}</button>
            </div>

            <h2 style={{ fontWeight: 700, fontSize: 20, color: '#F1F5F9', lineHeight: 1.5, marginBottom: 28, letterSpacing: '-0.01em' }}>
              {q.question}
            </h2>

            {q.type === 'multi' && (
              <div style={{ fontSize: 12, color: '#64748B', marginBottom: 16, fontStyle: 'italic' }}>
                Select all that apply
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {q.options.map((opt, idx) => {
                const selected = isSelected(idx)
                return (
                  <button
                    key={idx}
                    onClick={() => setAnswer(idx)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 14,
                      padding: '16px 18px',
                      borderRadius: 12,
                      border: selected ? '1.5px solid #6366F1' : '1.5px solid rgba(255,255,255,0.08)',
                      background: selected ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.03)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { if (!selected) (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.15)' }}
                    onMouseLeave={e => { if (!selected) (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)' }}
                  >
                    <div style={{
                      width: 22,
                      height: 22,
                      borderRadius: q.type === 'multi' ? 6 : '50%',
                      border: selected ? '2px solid #6366F1' : '2px solid rgba(255,255,255,0.2)',
                      background: selected ? '#4F46E5' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: 1,
                      transition: 'all 0.15s',
                    }}>
                      {selected && <div style={{ width: q.type === 'multi' ? 10 : 8, height: q.type === 'multi' ? 10 : 8, background: '#FFF', borderRadius: q.type === 'multi' ? 2 : '50%' }} />}
                    </div>
                    <div>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: selected ? '#A5B4FC' : '#475569', marginRight: 8, fontWeight: 600 }}>
                        {String.fromCharCode(65 + idx)}.
                      </span>
                      <span style={{ fontSize: 15, color: selected ? '#E2E8F0' : '#94A3B8', fontWeight: selected ? 600 : 400, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.5 }}>
                        {opt}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Navigation */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <button
                onClick={() => setCurrentQ(q => Math.max(0, q - 1))}
                disabled={currentQ === 0}
                style={{
                  padding: '10px 22px',
                  borderRadius: 9,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: currentQ === 0 ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.06)',
                  color: currentQ === 0 ? '#334155' : '#94A3B8',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: currentQ === 0 ? 'not-allowed' : 'pointer',
                }}
              >← Previous</button>

              <button
                onClick={() => setCurrentQ(q => Math.min(QUESTIONS.length - 1, q + 1))}
                disabled={currentQ === QUESTIONS.length - 1}
                style={{
                  padding: '10px 22px',
                  borderRadius: 9,
                  border: 'none',
                  background: currentQ === QUESTIONS.length - 1 ? 'rgba(255,255,255,0.04)' : 'linear-gradient(135deg, #4F46E5, #6366F1)',
                  color: currentQ === QUESTIONS.length - 1 ? '#334155' : '#FFF',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: currentQ === QUESTIONS.length - 1 ? 'not-allowed' : 'pointer',
                  boxShadow: currentQ === QUESTIONS.length - 1 ? 'none' : '0 2px 10px rgba(79,70,229,0.3)',
                }}
              >Next →</button>
            </div>
          </div>
        </div>
      </div>

      {/* Submit confirmation modal */}
      {showSubmitModal && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200,
        }}>
          <div style={{
            background: '#1E293B',
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.08)',
            padding: '32px',
            maxWidth: 400,
            width: '90%',
            animation: 'fade-up 0.3s ease',
          }}>
            <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 16 }}>📋</div>
            <h3 style={{ fontWeight: 700, fontSize: 18, color: '#F1F5F9', textAlign: 'center', marginBottom: 8 }}>Submit Exam?</h3>
            <p style={{ fontSize: 14, color: '#94A3B8', textAlign: 'center', lineHeight: 1.6, marginBottom: 24 }}>
              You have answered <strong style={{ color: '#A5B4FC' }}>{answered} of {QUESTIONS.length}</strong> questions.
              {QUESTIONS.length - answered > 0 && ` ${QUESTIONS.length - answered} question(s) unanswered.`} This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowSubmitModal(false)}
                style={{
                  flex: 1, padding: '11px',
                  borderRadius: 9,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'transparent',
                  color: '#94A3B8',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >Continue Exam</button>
              <button
                onClick={() => { setSubmitted(true); setShowSubmitModal(false) }}
                style={{
                  flex: 1, padding: '11px',
                  borderRadius: 9,
                  border: 'none',
                  background: 'linear-gradient(135deg, #4F46E5, #6366F1)',
                  color: '#FFF',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 10px rgba(79,70,229,0.3)',
                }}
              >Submit Now →</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
