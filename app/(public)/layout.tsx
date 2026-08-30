"use client";

import { type ReactNode, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Send } from "lucide-react";
import { toast } from "sonner";

export default function PublicLayout({ children }: { children: ReactNode }) {
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;
    setSubscribed(true);
    toast.success("Subscribed! You will receive our monthly spiritual updates.");
    setNewsletterEmail("");
  };

  return (
    <div className="min-h-screen flex flex-col bg-black text-slate-50 font-sans relative selection:bg-primary selection:text-black">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-yellow-900/40 via-yellow-700/40 to-yellow-900/40 border-b border-primary/20 py-2 px-4 text-center text-xs font-medium text-primary flex items-center justify-center gap-2">
        <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse" />
        <span>Welcome to the Private Learning Sanctuary for Live Spiritual Teachings</span>
        <Link
          href="/register"
          className="ml-2 font-semibold text-white underline hover:text-primary transition-colors flex items-center gap-1"
        >
          <span>Request Access</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-white/5 bg-black/80 backdrop-blur-xl supports-[backdrop-filter]:bg-black/60">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between max-w-7xl">
          <Link href="/" className="flex items-center gap-4 group">
            <div className="w-12 h-12 flex items-center justify-center overflow-hidden">
              {/* This img expects the user's provided logo saved as logo.png in the public folder */}
              <img src="/logo.png" alt="Sanctuary Logo" className="w-full h-full object-contain drop-shadow-[0_0_8px_rgba(212,175,55,0.4)] group-hover:scale-105 transition-transform" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-xl tracking-wide text-primary">
                Spiritual Sanctuary
              </span>
              <span className="text-[10px] uppercase tracking-widest text-primary/70 font-semibold mt-0.5">
                Live Teachings & Community
              </span>
            </div>
          </Link>
          
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <Link href="#simulator" className="hover:text-white hover:text-primary transition-colors">
              The Sanctuary
            </Link>
            <Link href="#features" className="hover:text-white hover:text-primary transition-colors">
              Features
            </Link>
            <Link href="#faq" className="hover:text-white hover:text-primary transition-colors">
              FAQ
            </Link>
          </nav>
          
          <div className="flex items-center gap-3">
            <Link 
              href="/login" 
              className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-primary transition-colors"
            >
              Sign In
            </Link>
            <Link 
              href="/register" 
              className="px-5 py-2.5 text-sm font-bold text-black bg-primary hover:bg-[#FCE69B] active:bg-[#A68222] rounded-xl shadow-lg shadow-primary/20 transition-all hover:shadow-primary/40 hover:-translate-y-0.5"
            >
              Join the Sanctuary
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-black pt-16 pb-12 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-10 mb-12">
            {/* Brand Col */}
            <div className="md:col-span-2 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 flex items-center justify-center">
                  <img src="/logo.png" alt="Sanctuary Logo" className="w-full h-full object-contain" />
                </div>
                <span className="font-bold text-xl text-primary">Spiritual Sanctuary</span>
              </div>
              <p className="text-slate-400 text-sm max-w-sm leading-relaxed">
                A dedicated space for deep spiritual learning, live broadcast teachings, and a community of faithful seekers.
              </p>
              
              {/* Operational Status Pill */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#111] border border-white/10 text-xs text-slate-300 font-medium">
                <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                <span className="w-2 h-2 rounded-full bg-primary -ml-4" />
                <span>Sanctuary is Online</span>
              </div>
            </div>

            {/* Links Col 1 */}
            <div>
              <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-4">Platform</h4>
              <ul className="space-y-2.5 text-sm text-slate-400">
                <li><Link href="#features" className="hover:text-primary transition-colors">Live Broadcasts</Link></li>
                <li><Link href="#features" className="hover:text-primary transition-colors">Spiritual Reflections</Link></li>
                <li><Link href="#features" className="hover:text-primary transition-colors">Community Feed</Link></li>
              </ul>
            </div>

            {/* Links Col 2 */}
            <div>
              <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-4">Community</h4>
              <ul className="space-y-2.5 text-sm text-slate-400">
                <li><Link href="/register" className="hover:text-primary transition-colors">Become a Member</Link></li>
                <li><Link href="/login" className="hover:text-primary transition-colors">Member Sign In</Link></li>
                <li><Link href="#faq" className="hover:text-primary transition-colors">Help & FAQ</Link></li>
              </ul>
            </div>

            {/* Newsletter Col */}
            <div>
              <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-4">Stay Informed</h4>
              <p className="text-slate-400 text-xs mb-3">
                Subscribe for monthly spiritual insights and schedule updates.
              </p>
              {subscribed ? (
                <div className="p-3 rounded-xl bg-primary/10 border border-primary/30 text-primary text-xs flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  <span>Subscribed successfully!</span>
                </div>
              ) : (
                <form onSubmit={handleSubscribe} className="space-y-2">
                  <input
                    type="email"
                    required
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full px-3 py-2 bg-[#111] border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-primary transition-all"
                  />
                  <button
                    type="submit"
                    className="w-full py-2 px-3 bg-primary hover:bg-[#FCE69B] text-black rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Send className="w-3 h-3" />
                    <span>Subscribe</span>
                  </button>
                </form>
              )}
            </div>
          </div>

          <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between text-slate-500 text-xs gap-4">
            <p>© {new Date().getFullYear()} Spiritual Sanctuary. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <span className="hover:text-primary transition-colors cursor-pointer">Privacy Policy</span>
              <span className="hover:text-primary transition-colors cursor-pointer">Terms of Service</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
