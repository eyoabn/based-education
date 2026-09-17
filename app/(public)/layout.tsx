"use client";

import { type ReactNode, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Check, Send } from "lucide-react";
import { toast } from "sonner";
import logo from "../../public/logo.jpg";

const NAV_LINKS = ['Teachings', 'About', 'Community', 'Contact'];

export default function PublicLayout({ children }: { children: ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen" style={{ background: '#080808', fontFamily: 'var(--font-body)' }}>
      {/* NAV */}
      <nav
        className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-6 md:px-12 py-4"
        style={{
          background: 'rgba(8,8,8,0.92)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid #C9A94A22',
        }}
      >
        <Link href="/" className="flex items-center gap-3">
          <Image src={logo} alt="Logo" className="h-10 w-10 object-contain" />
          <span
            className="text-lg font-semibold hidden sm:block"
            style={{ fontFamily: 'var(--font-display)', color: '#C9A94A', letterSpacing: '0.08em' }}
          >
            Spiritual Academy
          </span>
        </Link>

        {/* Desktop links */}
        <ul className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <li key={link}>
              <Link
                href="#"
                className="text-sm uppercase tracking-widest transition-colors hover:text-yellow-400"
                style={{ color: '#F5F0E8AA', fontFamily: 'var(--font-display)', fontSize: '0.7rem' }}
              >
                {link}
              </Link>
            </li>
          ))}
        </ul>

        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/login"
            className="px-5 py-2 rounded-lg text-sm uppercase tracking-widest transition-all hover:bg-white/5"
            style={{ color: '#C9A94A', fontFamily: 'var(--font-display)', fontSize: '0.7rem', border: '1px solid #C9A94A55' }}
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="px-5 py-2 rounded-lg text-sm uppercase tracking-widest transition-all hover:brightness-110 flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #C9A94A, #9A7A2E)',
              color: '#080808',
              fontFamily: 'var(--font-display)',
              fontSize: '0.7rem',
              fontWeight: 700,
            }}
          >
            Get Started
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden flex flex-col gap-1.5 p-2"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {[0, 1, 2].map((i) => (
            <span key={i} className="block w-5 h-px" style={{ background: '#C9A94A' }} />
          ))}
        </button>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 pt-20 px-6 flex flex-col gap-6"
          style={{ background: '#080808EE', backdropFilter: 'blur(16px)' }}
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link}
              href="#"
              className="text-xl uppercase tracking-widest py-3 border-b"
              style={{ fontFamily: 'var(--font-display)', color: '#F5F0E8', borderColor: '#C9A94A22' }}
              onClick={() => setMobileMenuOpen(false)}
            >
              {link}
            </Link>
          ))}
          <Link
            href="/register"
            onClick={() => setMobileMenuOpen(false)}
            className="mt-4 py-4 rounded-lg uppercase tracking-widest font-bold text-center"
            style={{ background: 'linear-gradient(135deg, #C9A94A, #9A7A2E)', color: '#080808', fontFamily: 'var(--font-display)' }}
          >
            Get Started
          </Link>
        </div>
      )}

      {/* Main Content */}
      <main>
        {children}
      </main>

      {/* FOOTER */}
      <footer className="py-12 px-6 text-center" style={{ borderTop: '1px solid #C9A94A22' }}>
        <div className="flex items-center justify-center gap-3 mb-4">
          <Image src={logo} alt="Logo" className="h-8 w-8 object-contain opacity-70" />
          <span className="text-sm" style={{ fontFamily: 'var(--font-display)', color: '#C9A94A88', letterSpacing: '0.1em' }}>
            Spiritual Academy
          </span>
        </div>
        <p className="text-xs" style={{ color: '#F5F0E822' }}>
          © {new Date().getFullYear()} Spiritual Academy. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
