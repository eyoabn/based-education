import { useState } from 'react'
import type { Screen } from '../App'

interface Props {
  onNavigate: (s: Screen) => void
}

type Step = 'login' | 'pending'

export default function AuthScreen({ onNavigate }: Props) {
  const [role, setRole] = useState<'student' | 'teacher'>('student')
  const [step, setStep] = useState<Step>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [expertise, setExpertise] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      if (role === 'teacher') setStep('pending')
      else onNavigate('feed')
    }, 1200)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    borderRadius: 10,
    border: '1.5px solid #E2E8F0',
    background: '#F8FAFC',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontSize: 14,
    color: '#0F172A',
    outline: 'none',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
  }

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: '100vh' }}>
      {/* Left branding panel */}
      <div style={{
        flex: '0 0 55%',
        background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 40%, #4F46E5 100%)',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        padding: '48px',
      }}>
        {/* Background illustration */}
        <img
          src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=900&h=700&fit=crop&auto=format"
          alt="Students collaborating"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: 0.12,
          }}
        />

        {/* Floating grid overlay */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(circle, rgba(165,180,252,0.15) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }} />

        {/* Glowing orbs */}
        <div style={{
          position: 'absolute',
          top: '15%',
          right: '10%',
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.3) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }} />
        <div style={{
          position: 'absolute',
          bottom: '30%',
          left: '-5%',
          width: 200,
          height: 200,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16,185,129,0.2) 0%, transparent 70%)',
          filter: 'blur(30px)',
        }} />

        {/* Logo top */}
        <div style={{ position: 'absolute', top: 40, left: 48, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            background: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            border: '1px solid rgba(255,255,255,0.2)',
          }}>⚡</div>
          <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 20, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
            EduConnect
          </span>
        </div>

        {/* Stat cards */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 40, position: 'relative', zIndex: 1 }}>
          {[
            { val: '42K+', label: 'Active Learners' },
            { val: '1.2K+', label: 'Expert Teachers' },
            { val: '98%', label: 'Satisfaction Rate' },
          ].map(s => (
            <div key={s.label} style={{
              background: 'rgba(255,255,255,0.08)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 12,
              padding: '16px 20px',
              flex: 1,
            }}>
              <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 22, color: '#FFFFFF' }}>{s.val}</div>
              <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 12, color: 'rgba(165,180,252,0.8)', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <h1 style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontWeight: 800,
          fontSize: 38,
          lineHeight: 1.15,
          color: '#FFFFFF',
          letterSpacing: '-0.03em',
          margin: '0 0 16px',
          position: 'relative',
          zIndex: 1,
        }}>
          Learn without<br />
          <span style={{ color: '#A5B4FC' }}>limits.</span>
        </h1>
        <p style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 15,
          color: 'rgba(165,180,252,0.75)',
          lineHeight: 1.6,
          margin: 0,
          maxWidth: 380,
          position: 'relative',
          zIndex: 1,
        }}>
          Live classrooms, expert teachers, and a community that grows together — all in one premium platform.
        </p>
      </div>

      {/* Right auth panel */}
      <div style={{
        flex: 1,
        background: '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px',
      }}>
        {step === 'pending' ? (
          <PendingVerification onBack={() => setStep('login')} />
        ) : (
          <div style={{ width: '100%', maxWidth: 380, animation: 'fade-up 0.4s ease' }}>
            <h2 style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 800,
              fontSize: 26,
              color: '#0F172A',
              letterSpacing: '-0.03em',
              marginBottom: 6,
            }}>Welcome back</h2>
            <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 14, color: '#64748B', marginBottom: 28 }}>
              Sign in to your EduConnect account
            </p>

            {/* Role toggle */}
            <div style={{
              display: 'flex',
              background: '#F1F5F9',
              borderRadius: 10,
              padding: 4,
              marginBottom: 24,
              gap: 4,
            }}>
              {(['student', 'teacher'] as const).map(r => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: 7,
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontSize: 13,
                    fontWeight: 600,
                    transition: 'all 0.2s ease',
                    background: role === r ? '#FFFFFF' : 'transparent',
                    color: role === r ? '#4F46E5' : '#64748B',
                    boxShadow: role === r ? '0 1px 6px rgba(0,0,0,0.08)' : 'none',
                  }}
                >
                  {r === 'student' ? '🎓 Student' : '👩‍🏫 Teacher'}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  style={inputStyle}
                  onFocus={e => { e.target.style.borderColor = '#4F46E5'; e.target.style.boxShadow = '0 0 0 3px rgba(79,70,229,0.1)' }}
                  onBlur={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.boxShadow = 'none' }}
                  required
                />
              </div>

              <div>
                <label style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    style={{ ...inputStyle, paddingRight: 44 }}
                    onFocus={e => { e.target.style.borderColor = '#4F46E5'; e.target.style.boxShadow = '0 0 0 3px rgba(79,70,229,0.1)' }}
                    onBlur={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.boxShadow = 'none' }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#94A3B8',
                      fontSize: 16,
                      lineHeight: 1,
                    }}
                  >{showPassword ? '🙈' : '👁'}</button>
                </div>
              </div>

              {/* Teacher-only fields */}
              {role === 'teacher' && (
                <div style={{ animation: 'fade-up 0.3s ease', display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 4 }}>
                  <div style={{ height: 1, background: 'linear-gradient(90deg, #E2E8F0, transparent)' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(79,70,229,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>🎓</div>
                    <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 12, fontWeight: 600, color: '#4F46E5' }}>Teacher Verification Required</span>
                  </div>
                  <div>
                    <label style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                      Teaching Expertise
                    </label>
                    <input
                      type="text"
                      value={expertise}
                      onChange={e => setExpertise(e.target.value)}
                      placeholder="e.g. Advanced Mathematics, Physics"
                      style={inputStyle}
                      onFocus={e => { e.target.style.borderColor = '#4F46E5'; e.target.style.boxShadow = '0 0 0 3px rgba(79,70,229,0.1)' }}
                      onBlur={e => { e.target.style.borderColor = '#E2E8F0'; e.target.style.boxShadow = 'none' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                      Resume / Credentials
                    </label>
                    <div style={{
                      border: '1.5px dashed #CBD5E1',
                      borderRadius: 10,
                      padding: '20px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      background: '#FAFBFF',
                    }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#4F46E5'; (e.currentTarget as HTMLElement).style.background = 'rgba(79,70,229,0.03)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#CBD5E1'; (e.currentTarget as HTMLElement).style.background = '#FAFBFF' }}
                    >
                      <div style={{ fontSize: 24, marginBottom: 6 }}>📎</div>
                      <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 12, fontWeight: 600, color: '#4F46E5' }}>Click to upload PDF or DOCX</div>
                      <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 11, color: '#94A3B8', marginTop: 2 }}>Max 10MB</div>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <a href="#" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, color: '#4F46E5', textDecoration: 'none', fontWeight: 500 }}>
                  Forgot password?
                </a>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '13px',
                  borderRadius: 10,
                  border: 'none',
                  background: loading ? '#A5B4FC' : 'linear-gradient(135deg, #4F46E5, #6366F1)',
                  color: '#FFFFFF',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: loading ? 'none' : '0 4px 16px rgba(79,70,229,0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                {loading ? (
                  <>
                    <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#FFF', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    Signing in...
                  </>
                ) : (
                  role === 'teacher' ? 'Submit for Verification →' : 'Sign In →'
                )}
              </button>
            </form>

            <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 20 }}>
              {"Don't have an account? "}
              <a href="#" style={{ color: '#4F46E5', fontWeight: 600, textDecoration: 'none' }}>Create one free</a>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function PendingVerification({ onBack }: { onBack: () => void }) {
  const steps = [
    { label: 'Application Submitted', done: true },
    { label: 'Document Review', done: true, active: false },
    { label: 'Admin Verification', done: false, active: true },
    { label: 'Account Activation', done: false },
  ]
  return (
    <div style={{ width: '100%', maxWidth: 400, animation: 'fade-up 0.4s ease', textAlign: 'center' }}>
      <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, #EEF2FF, #C7D2FE)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, margin: '0 auto 20px', boxShadow: '0 4px 20px rgba(79,70,229,0.15)' }}>
        ⏳
      </div>
      <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, fontSize: 22, color: '#0F172A', letterSpacing: '-0.02em', marginBottom: 8 }}>
        Verification In Progress
      </h2>
      <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 14, color: '#64748B', lineHeight: 1.6, marginBottom: 32 }}>
        Our admin team is reviewing your credentials. You'll receive an email notification once approved — usually within 24–48 hours.
      </p>

      {/* Step indicator */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 32, textAlign: 'left' }}>
        {steps.map((s, i) => (
          <div key={s.label} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                background: s.done ? '#4F46E5' : s.active ? 'rgba(79,70,229,0.12)' : '#F1F5F9',
                border: s.active ? '2px solid #4F46E5' : '2px solid transparent',
                color: s.done ? '#FFF' : s.active ? '#4F46E5' : '#94A3B8',
                fontWeight: 700,
                flexShrink: 0,
                position: 'relative',
              }}>
                {s.done ? '✓' : s.active ? (
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4F46E5', animation: 'pulse-dot 1.5s ease-in-out infinite' }} />
                ) : i + 1}
              </div>
              {i < steps.length - 1 && (
                <div style={{ width: 2, height: 28, background: s.done ? '#4F46E5' : '#E2E8F0', margin: '3px 0' }} />
              )}
            </div>
            <div style={{ paddingTop: 4, paddingBottom: 20 }}>
              <div style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: 13,
                fontWeight: s.active ? 700 : 500,
                color: s.done ? '#4F46E5' : s.active ? '#0F172A' : '#94A3B8',
              }}>
                {s.label}
              </div>
              {s.active && (
                <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 11, color: '#64748B', marginTop: 2 }}>
                  Under review by the Super Admin
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onBack}
        style={{
          padding: '10px 24px',
          borderRadius: 8,
          border: '1.5px solid #E2E8F0',
          background: '#FFFFFF',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 13,
          fontWeight: 600,
          color: '#374151',
          cursor: 'pointer',
        }}
      >← Back to Sign In</button>
    </div>
  )
}
