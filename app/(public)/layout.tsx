"use client";

import { type ReactNode, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Check, Send } from "lucide-react";
import { toast } from "sonner";

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
          <Image src="/logo.png" alt="Logo" width={40} height={40} className="h-10 w-10 object-contain" />
          <span
            className="text-lg font-semibold hidden sm:block"
            style={{ fontFamily: 'var(--font-display)', color: '#C9A94A', letterSpacing: '0.08em' }}
          >
            Spiritual Academy
          </span>
        </Link>

        <div className="flex items-center gap-3">
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
      </nav>

      {/* Main Content */}
      <main>
        {children}
      </main>

      {/* FOOTER */}
      <footer className="py-12 px-6 text-center" style={{ borderTop: '1px solid #C9A94A22' }}>
        <div className="flex items-center justify-center gap-3 mb-4">
          <Image src="/logo.png" alt="Logo" width={32} height={32} className="h-8 w-8 object-contain opacity-70" />
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
