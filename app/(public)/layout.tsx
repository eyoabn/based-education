"use client";

import { type ReactNode, useState } from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, Check, Globe, Shield, Video, BookOpen, Send } from "lucide-react";
import { toast } from "sonner";
import DemoContactModal from "@/components/ui/DemoContactModal";

export default function PublicLayout({ children }: { children: ReactNode }) {
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;
    setSubscribed(true);
    toast.success("Subscribed! You will receive our monthly EdTech updates.");
    setNewsletterEmail("");
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-50 font-sans relative selection:bg-indigo-500 selection:text-white">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-indigo-900/60 via-purple-900/60 to-indigo-900/60 border-b border-indigo-500/20 py-2 px-4 text-center text-xs font-medium text-indigo-200 flex items-center justify-center gap-2">
        <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span>EduConnect 2.0 Released: Next-Gen Low-Latency SFU Live Classrooms & Proctored Exams</span>
        <button
          onClick={() => setIsDemoModalOpen(true)}
          className="ml-2 font-semibold text-white underline hover:text-indigo-300 transition-colors flex items-center gap-1 cursor-pointer"
        >
          <span>Book Institutional Demo</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl supports-[backdrop-filter]:bg-slate-950/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-7xl">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-indigo-200">
                EduConnect
              </span>
              <span className="text-[10px] uppercase tracking-widest text-indigo-400 font-semibold -mt-1">
                Global Learning OS
              </span>
            </div>
          </Link>
          
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <Link href="#simulator" className="hover:text-white hover:text-indigo-400 transition-colors">
              Platform Preview
            </Link>
            <Link href="#features" className="hover:text-white hover:text-indigo-400 transition-colors">
              Features
            </Link>
            <Link href="#calculator" className="hover:text-white hover:text-indigo-400 transition-colors">
              Impact Calculator
            </Link>
            <Link href="#pricing" className="hover:text-white hover:text-indigo-400 transition-colors">
              Pricing
            </Link>
            <Link href="#faq" className="hover:text-white hover:text-indigo-400 transition-colors">
              FAQ
            </Link>
          </nav>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsDemoModalOpen(true)}
              className="hidden lg:inline-flex px-3.5 py-1.5 text-xs font-semibold text-indigo-300 bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-500/30 rounded-lg transition-all"
            >
              Enterprise Demo
            </button>
            <Link 
              href="/login" 
              className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link 
              href="/register" 
              className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-500/25 transition-all hover:shadow-indigo-500/40 hover:-translate-y-0.5"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 pt-16 pb-12 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />
        
        <div className="container mx-auto px-4 max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-10 mb-12">
            {/* Brand Col */}
            <div className="md:col-span-2 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
                  <Sparkles className="w-4 h-4" />
                </div>
                <span className="font-bold text-xl text-white">EduConnect</span>
              </div>
              <p className="text-slate-400 text-sm max-w-sm leading-relaxed">
                The world's leading real-time virtual classroom and anti-cheat examination platform. Empowering educators and institutions in 120+ countries.
              </p>
              
              {/* Operational Status Pill */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="w-2 h-2 rounded-full bg-emerald-500 -ml-4" />
                <span>All Systems Operational (99.99% Uptime)</span>
              </div>
            </div>

            {/* Links Col 1 */}
            <div>
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-4">Platform</h4>
              <ul className="space-y-2.5 text-sm text-slate-400">
                <li><Link href="#features" className="hover:text-white transition-colors">SFU Live Video</Link></li>
                <li><Link href="#features" className="hover:text-white transition-colors">Proctored Exams</Link></li>
                <li><Link href="#features" className="hover:text-white transition-colors">Social Stream & Feed</Link></li>
                <li><Link href="#calculator" className="hover:text-white transition-colors">Analytics & Grading</Link></li>
              </ul>
            </div>

            {/* Links Col 2 */}
            <div>
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-4">Solutions</h4>
              <ul className="space-y-2.5 text-sm text-slate-400">
                <li><Link href="/register?role=teacher" className="hover:text-white transition-colors">For Educators</Link></li>
                <li><button onClick={() => setIsDemoModalOpen(true)} className="hover:text-white transition-colors text-left">For Universities</button></li>
                <li><button onClick={() => setIsDemoModalOpen(true)} className="hover:text-white transition-colors text-left">Enterprise Training</button></li>
                <li><Link href="#pricing" className="hover:text-white transition-colors">Pricing Plans</Link></li>
              </ul>
            </div>

            {/* Newsletter Col */}
            <div>
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-4">Stay Informed</h4>
              <p className="text-slate-400 text-xs mb-3">
                Subscribe for monthly EdTech insights, product updates, and teaching guides.
              </p>
              {subscribed ? (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
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
                    placeholder="name@university.edu"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
                  />
                  <button
                    type="submit"
                    className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Send className="w-3 h-3" />
                    <span>Subscribe</span>
                  </button>
                </form>
              )}
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800/80 flex flex-col md:flex-row items-center justify-between text-slate-500 text-xs gap-4">
            <p>© {new Date().getFullYear()} EduConnect Inc. All international rights reserved.</p>
            <div className="flex items-center gap-6">
              <span className="hover:text-slate-400 transition-colors cursor-pointer">Privacy Policy</span>
              <span className="hover:text-slate-400 transition-colors cursor-pointer">Terms of Service</span>
              <span className="hover:text-slate-400 transition-colors cursor-pointer">Security & Compliance</span>
              <span className="hover:text-slate-400 transition-colors cursor-pointer">FERPA / GDPR</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Demo Contact Modal */}
      <DemoContactModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
      />
    </div>
  );
}
