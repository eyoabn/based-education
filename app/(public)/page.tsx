"use client";

import Link from "next/link";
import Image from "next/image";
import logo from "../../public/logo.jpg";

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
        className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 pt-20"
        style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% 30%, #1A1200 0%, #080808 70%)',
        }}
      >
        {/* Glow orb */}
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, #C9A94A18 0%, transparent 70%)', filter: 'blur(40px)' }}
        />

        {/* Decorative line */}
        <div className="flex items-center gap-4 mb-10">
          <div className="h-px w-16" style={{ background: 'linear-gradient(to right, transparent, #C9A94A)' }} />
          <span className="text-xs uppercase tracking-[0.3em]" style={{ color: '#C9A94A', fontFamily: 'var(--font-display)' }}>
            Walk In The Light
          </span>
          <div className="h-px w-16" style={{ background: 'linear-gradient(to left, transparent, #C9A94A)' }} />
        </div>

        <Image
          src={logo}
          alt="Spiritual Academy Logo"
          className="w-32 h-32 object-contain mb-10 drop-shadow-2xl"
          style={{ filter: 'drop-shadow(0 0 32px #C9A94A66)' }}
        />

        <h1
          className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6 max-w-4xl"
          style={{ fontFamily: 'var(--font-display)', color: '#F5F0E8', letterSpacing: '0.02em' }}
        >
          Discover the{' '}
          <span style={{ color: '#C9A94A' }}>Depths</span>{' '}
          of Spiritual Truth
        </h1>

        <p
          className="text-base md:text-lg max-w-xl mb-12 leading-relaxed"
          style={{ color: '#F5F0E8AA', fontWeight: 300 }}
        >
          Join a sacred community of seekers. Receive powerful, Scripture-rooted teachings
          that transform your mind, ignite your faith, and guide you into your divine purpose.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <Link
            href="/register"
            className="px-8 py-4 rounded-lg text-sm uppercase tracking-widest font-bold transition-all hover:brightness-110 hover:scale-105 active:scale-95"
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
            className="px-8 py-4 rounded-lg text-sm uppercase tracking-widest transition-all hover:bg-white/5"
            style={{
              color: '#C9A94A',
              fontFamily: 'var(--font-display)',
              border: '1px solid #C9A94A55',
            }}
          >
            Sign In
          </Link>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap justify-center gap-12 mt-20 pt-12" style={{ borderTop: '1px solid #C9A94A22' }}>
          {[
            { num: '2,400+', label: 'Students' },
            { num: '180+', label: 'Teachings' },
            { num: '12', label: 'Years of Ministry' },
          ].map(({ num, label }) => (
            <div key={label} className="text-center">
              <div
                className="text-3xl font-bold"
                style={{ fontFamily: 'var(--font-display)', color: '#C9A94A' }}
              >
                {num}
              </div>
              <div className="text-xs uppercase tracking-widest mt-1" style={{ color: '#F5F0E855' }}>
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-40">
          <span className="text-xs uppercase tracking-widest" style={{ fontFamily: 'var(--font-display)', color: '#C9A94A', fontSize: '0.6rem' }}>Scroll</span>
          <div className="w-px h-8" style={{ background: 'linear-gradient(to bottom, #C9A94A, transparent)' }} />
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-24 px-6 md:px-12 lg:px-24">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="h-px w-12" style={{ background: '#C9A94A55' }} />
              <span className="text-xs uppercase tracking-[0.3em]" style={{ color: '#C9A94A', fontFamily: 'var(--font-display)' }}>
                What We Offer
              </span>
              <div className="h-px w-12" style={{ background: '#C9A94A55' }} />
            </div>
            <h2
              className="text-3xl md:text-5xl font-bold"
              style={{ fontFamily: 'var(--font-display)', color: '#F5F0E8' }}
            >
              Everything You Need to Grow
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {FEATURES.map(({ icon, title, desc }) => (
              <div
                key={title}
                className="rounded-2xl p-8 transition-all hover:scale-[1.01] group"
                style={{
                  background: '#111111',
                  border: '1px solid #C9A94A22',
                  boxShadow: '0 4px 32px rgba(0,0,0,0.4)',
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = '#C9A94A66')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = '#C9A94A22')}
              >
                <div
                  className="text-3xl mb-4 w-14 h-14 rounded-xl flex items-center justify-center"
                  style={{ background: '#C9A94A11', border: '1px solid #C9A94A33' }}
                >
                  {icon}
                </div>
                <h3
                  className="text-xl font-semibold mb-3"
                  style={{ fontFamily: 'var(--font-display)', color: '#C9A94A' }}
                >
                  {title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: '#F5F0E8AA' }}>
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* QUOTE BANNER */}
      <section
        className="py-20 px-6 text-center relative overflow-hidden"
        style={{ background: '#0D0900' }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 60% 80% at 50% 50%, #C9A94A0A, transparent)' }}
        />
        <div className="max-w-3xl mx-auto relative z-10">
          <div className="text-5xl mb-6" style={{ color: '#C9A94A44', fontFamily: 'var(--font-display)' }}>"</div>
          <blockquote
            className="text-2xl md:text-3xl font-semibold leading-relaxed mb-6"
            style={{ fontFamily: 'var(--font-display)', color: '#F5F0E8' }}
          >
            Your word is a lamp to my feet and a light to my path.
          </blockquote>
          <cite className="text-sm uppercase tracking-widest" style={{ color: '#C9A94A', fontFamily: 'var(--font-display)' }}>
            — Psalm 119:105
          </cite>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-24 px-6 md:px-12 lg:px-24">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2
              className="text-3xl md:text-5xl font-bold"
              style={{ fontFamily: 'var(--font-display)', color: '#F5F0E8' }}
            >
              Lives Being Transformed
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map(({ name, role, quote }) => (
              <div
                key={name}
                className="rounded-2xl p-8"
                style={{
                  background: '#111111',
                  border: '1px solid #C9A94A22',
                }}
              >
                <div className="text-3xl mb-4" style={{ color: '#C9A94A44', fontFamily: 'var(--font-display)' }}>"</div>
                <p className="text-sm leading-relaxed mb-6" style={{ color: '#F5F0E8CC' }}>
                  {quote}
                </p>
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{ background: 'linear-gradient(135deg, #C9A94A, #9A7A2E)', color: '#080808', fontFamily: 'var(--font-display)' }}
                  >
                    {name[0]}
                  </div>
                  <div>
                    <div className="text-sm font-semibold" style={{ color: '#F5F0E8', fontFamily: 'var(--font-display)' }}>{name}</div>
                    <div className="text-xs" style={{ color: '#F5F0E855' }}>{role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section
        className="py-24 px-6 text-center relative overflow-hidden"
        style={{ background: '#0D0900' }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 50%, #C9A94A12, transparent)' }}
        />
        <div className="max-w-2xl mx-auto relative z-10">
          <Image src={logo} alt="Logo" className="w-20 h-20 object-contain mx-auto mb-8" style={{ filter: 'drop-shadow(0 0 20px #C9A94A55)' }} />
          <h2
            className="text-3xl md:text-5xl font-bold mb-6"
            style={{ fontFamily: 'var(--font-display)', color: '#F5F0E8' }}
          >
            Ready to Begin Your Journey?
          </h2>
          <p className="text-base mb-10 leading-relaxed" style={{ color: '#F5F0E8AA', fontWeight: 300 }}>
            Join thousands of believers who are growing in faith, wisdom, and divine purpose through anointed online teachings.
          </p>
          <Link
            href="/register"
            className="inline-block px-10 py-5 rounded-xl text-sm uppercase tracking-widest font-bold transition-all hover:brightness-110 hover:scale-105"
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
