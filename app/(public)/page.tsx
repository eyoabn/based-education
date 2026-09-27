"use client";

import Link from "next/link";
import Image from "next/image";

const FEATURES = [
  {
    icon: '✝',
    title: 'Spiritual Teachings',
    desc: 'Deep, scripture-rooted lessons delivered live and on-demand. Grow in faith at your own pace.',
  },
  {
    icon: '💡',
    title: 'Divine Wisdom',
    desc: 'Practical wisdom for everyday life — grounded in timeless spiritual truth and guided by the Word.',
  },
  {
    icon: '🛡',
    title: 'Community & Protection',
    desc: 'Join a caring community of believers. Find encouragement, accountability, and spiritual covering.',
  },
  {
    icon: '📖',
    title: 'Bible Study',
    desc: "Structured Bible studies designed to take you deeper into God's Word, verse by verse.",
  },
];

const TESTIMONIALS = [
  {
    name: 'Sarah Mitchell',
    role: 'Community Member',
    quote: 'These teachings transformed my relationship with God. I finally understand the depth of Scripture.',
  },
  {
    name: 'David Okonkwo',
    role: 'Student',
    quote: 'Clear, powerful, and life-changing. Every session leaves me hungry for more of the Word.',
  },
  {
    name: 'Maria Santos',
    role: 'Community Member',
    quote: "I've grown more spiritually in three months here than I had in years. Truly anointed teaching.",
  },
];

export default function LandingPage() {
  return (
    <>
      {/* HERO */}
      <section
        className="relative min-h-screen flex flex-col items-center justify-center text-center px-4 sm:px-6 pt-24 sm:pt-28 pb-16"
        style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% 30%, #1A1200 0%, #080808 70%)',
        }}
      >
        {/* Glow orb */}
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 sm:w-96 h-72 sm:h-96 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, #C9A94A18 0%, transparent 70%)', filter: 'blur(40px)' }}
        />

        {/* Decorative line */}
        <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-10">
          <div className="h-px w-10 sm:w-16" style={{ background: 'linear-gradient(to right, transparent, #C9A94A)' }} />
          <span className="text-[10px] sm:text-xs uppercase tracking-[0.25em] sm:tracking-[0.3em]" style={{ color: '#C9A94A', fontFamily: 'var(--font-display)' }}>
            Walk In The Light
          </span>
          <div className="h-px w-10 sm:w-16" style={{ background: 'linear-gradient(to left, transparent, #C9A94A)' }} />
        </div>

        <Image
          src="/logo.png"
          alt="Spiritual Academy Logo"
          width={128}
          height={128}
          priority
          className="w-24 h-24 sm:w-32 sm:h-32 object-contain mb-6 sm:mb-10 drop-shadow-2xl"
          style={{ filter: 'drop-shadow(0 0 32px #C9A94A66)' }}
        />

        <h1
          className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-4 sm:mb-6 max-w-4xl"
          style={{ fontFamily: 'var(--font-display)', color: '#F5F0E8', letterSpacing: '0.02em' }}
        >
          Discover the{' '}
          <span style={{ color: '#C9A94A' }}>Depths</span>{' '}
          of Spiritual Truth
        </h1>

        <p
          className="text-sm sm:text-base md:text-lg max-w-xl mb-8 sm:mb-12 leading-relaxed px-2"
          style={{ color: '#F5F0E8AA', fontWeight: 300 }}
        >
          Join a sacred community of seekers. Receive powerful, Scripture-rooted teachings
          that transform your mind, ignite your faith, and guide you into your divine purpose.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-center w-full max-w-xs sm:max-w-none justify-center">
          <Link
            href="/register"
            className="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 rounded-lg text-xs sm:text-sm uppercase tracking-widest font-bold transition-all hover:brightness-110 active:scale-95 text-center"
            style={{
              background: 'linear-gradient(135deg, #C9A94A, #9A7A2E)',
              color: '#080808',
              fontFamily: 'var(--font-display)',
              boxShadow: '0 0 32px #C9A94A44',
            }}
          >
            Begin Your Journey
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 rounded-lg text-xs sm:text-sm uppercase tracking-widest transition-all hover:bg-white/5 active:scale-95 text-center"
            style={{
              color: '#C9A94A',
              fontFamily: 'var(--font-display)',
              border: '1px solid #C9A94A55',
            }}
          >
            Sign In
          </Link>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-14 sm:py-20 md:py-24 px-4 sm:px-8 md:px-12 lg:px-24">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10 sm:mb-16">
            <div className="flex items-center justify-center gap-3 sm:gap-4 mb-3 sm:mb-4">
              <div className="h-px w-8 sm:w-12" style={{ background: '#C9A94A55' }} />
              <span className="text-[10px] sm:text-xs uppercase tracking-[0.25em] sm:tracking-[0.3em]" style={{ color: '#C9A94A', fontFamily: 'var(--font-display)' }}>
                What We Offer
              </span>
              <div className="h-px w-8 sm:w-12" style={{ background: '#C9A94A55' }} />
            </div>
            <h2
              className="text-2xl sm:text-4xl md:text-5xl font-bold"
              style={{ fontFamily: 'var(--font-display)', color: '#F5F0E8' }}
            >
              Everything You Need to Grow
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {FEATURES.map(({ icon, title, desc }) => (
              <div
                key={title}
                className="rounded-2xl p-5 sm:p-8 transition-all hover:scale-[1.01] group"
                style={{
                  background: '#111111',
                  border: '1px solid #C9A94A22',
                  boxShadow: '0 4px 32px rgba(0,0,0,0.4)',
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = '#C9A94A66')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = '#C9A94A22')}
              >
                <div
                  className="text-2xl sm:text-3xl mb-3 sm:mb-4 w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center"
                  style={{ background: '#C9A94A11', border: '1px solid #C9A94A33' }}
                >
                  {icon}
                </div>
                <h3
                  className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3"
                  style={{ fontFamily: 'var(--font-display)', color: '#C9A94A' }}
                >
                  {title}
                </h3>
                <p className="text-xs sm:text-sm leading-relaxed" style={{ color: '#F5F0E8AA' }}>
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* QUOTE BANNER */}
      <section
        className="py-14 sm:py-20 px-4 sm:px-6 text-center relative overflow-hidden"
        style={{ background: '#0D0900' }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 60% 80% at 50% 50%, #C9A94A0A, transparent)' }}
        />
        <div className="max-w-3xl mx-auto relative z-10">
          <div className="text-4xl sm:text-5xl mb-4 sm:mb-6" style={{ color: '#C9A94A44', fontFamily: 'var(--font-display)' }}>"</div>
          <blockquote
            className="text-xl sm:text-2xl md:text-3xl font-semibold leading-relaxed mb-4 sm:mb-6"
            style={{ fontFamily: 'var(--font-display)', color: '#F5F0E8' }}
          >
            Your word is a lamp to my feet and a light to my path.
          </blockquote>
          <cite className="text-xs sm:text-sm uppercase tracking-widest" style={{ color: '#C9A94A', fontFamily: 'var(--font-display)' }}>
            — Psalm 119:105
          </cite>
        </div>
      </section>

      {/* CTA */}
      <section
        className="py-16 sm:py-24 px-4 sm:px-6 text-center relative overflow-hidden"
        style={{ background: '#0D0900' }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 50%, #C9A94A12, transparent)' }}
        />
        <div className="max-w-2xl mx-auto relative z-10">
          <Image
            src="/logo.png"
            alt="Logo"
            width={80}
            height={80}
            className="w-16 h-16 sm:w-20 sm:h-20 object-contain mx-auto mb-6 sm:mb-8"
            style={{ filter: 'drop-shadow(0 0 20px #C9A94A55)' }}
          />
          <h2
            className="text-2xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6"
            style={{ fontFamily: 'var(--font-display)', color: '#F5F0E8' }}
          >
            Ready to Begin Your Journey?
          </h2>
          <p className="text-sm sm:text-base mb-8 sm:mb-10 leading-relaxed max-w-lg mx-auto" style={{ color: '#F5F0E8AA', fontWeight: 300 }}>
            Join believers who are growing in faith, wisdom, and divine purpose through anointed online teachings.
          </p>
          <Link
            href="/register"
            className="inline-block w-full sm:w-auto px-8 sm:px-10 py-4 sm:py-5 rounded-xl text-xs sm:text-sm uppercase tracking-widest font-bold transition-all hover:brightness-110"
            style={{
              background: 'linear-gradient(135deg, #C9A94A, #9A7A2E)',
              color: '#080808',
              fontFamily: 'var(--font-display)',
              boxShadow: '0 0 40px #C9A94A44',
            }}
          >
            Create Your Free Account
          </Link>
        </div>
      </section>
    </>
  );
}
