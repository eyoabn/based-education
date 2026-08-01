import Link from "next/link"
import { Video, BookOpen, ShieldCheck } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="flex flex-col gap-24 py-16">
      {/* Hero Section */}
      <section className="container mx-auto px-4 max-w-7xl text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-sm font-medium mb-8 border border-indigo-500/20">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
          </span>
          Educonnect 2.0 is live
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-400">
          The Next-Gen Unlimited <br className="hidden md:block" /> Live Learning Platform
        </h1>
        
        <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10">
          Experience seamless SFU WebRTC classrooms, interactive social streams, and secure examinations. Built for modern educators and students.
        </p>
        
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link href="/register" className="px-8 py-4 text-base font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-500/25 transition-all hover:shadow-indigo-500/40">
            Get Started Free
          </Link>
          <Link href="#demo" className="px-8 py-4 text-base font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all">
            Watch Live Demo
          </Link>
        </div>

        {/* Glassmorphic Platform Preview */}
        <div className="mt-20 relative mx-auto max-w-5xl">
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent z-10" />
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur p-4 shadow-2xl overflow-hidden aspect-video">
            <div className="w-full h-full rounded-xl bg-slate-800/50 border border-slate-700/50 flex flex-col">
              {/* Fake UI Header */}
              <div className="h-12 border-b border-slate-700/50 flex items-center px-4 gap-4">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                </div>
                <div className="h-6 w-64 bg-slate-700/50 rounded-md mx-auto" />
              </div>
              <div className="flex-1 p-6 flex gap-6">
                <div className="w-64 bg-slate-700/30 rounded-lg hidden md:block" />
                <div className="flex-1 flex flex-col gap-4">
                  <div className="flex-1 bg-slate-700/30 rounded-lg" />
                  <div className="h-32 bg-slate-700/30 rounded-lg" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid (3-column Bento style) */}
      <section id="features" className="container mx-auto px-4 max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">Everything you need to teach online</h2>
          <p className="text-slate-400 max-w-xl mx-auto">Powerful tools designed for engagement, security, and growth.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Feature 1 */}
          <div className="p-8 rounded-2xl bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800 transition-colors group">
            <div className="w-12 h-12 bg-indigo-500/10 text-indigo-400 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Video className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-3">Unlimited Live Rooms</h3>
            <p className="text-slate-400">High-performance SFU WebRTC engine with robust host moderation, screen sharing, and recording.</p>
          </div>

          {/* Feature 2 */}
          <div className="p-8 rounded-2xl bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800 transition-colors group">
            <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-3">Post & Social Stream</h3>
            <p className="text-slate-400">Keep students engaged with a continuous feed of announcements, resources, and discussions.</p>
          </div>

          {/* Feature 3 */}
          <div className="p-8 rounded-2xl bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800 transition-colors group">
            <div className="w-12 h-12 bg-red-500/10 text-red-400 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-3">Secure Examinations</h3>
            <p className="text-slate-400">Anti-cheating exam engine tracks tab switches and provides detailed insights on student performance.</p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="container mx-auto px-4 max-w-7xl mb-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">Simple, transparent pricing</h2>
          <p className="text-slate-400 max-w-xl mx-auto">Choose the plan that best fits your educational needs.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Tier 1 */}
          <div className="p-8 rounded-2xl bg-slate-800/30 border border-slate-700/50 flex flex-col">
            <h3 className="text-xl font-medium text-slate-300 mb-2">Free Student</h3>
            <div className="text-4xl font-bold mb-6">$0<span className="text-lg text-slate-500 font-normal">/mo</span></div>
            <ul className="flex-1 space-y-4 mb-8 text-slate-400">
              <li className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-indigo-400" /> Access all free courses
              </li>
              <li className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-indigo-400" /> Join live classes
              </li>
              <li className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-indigo-400" /> Take exams
              </li>
            </ul>
            <Link href="/register" className="w-full py-3 rounded-xl font-medium text-center bg-slate-700 hover:bg-slate-600 transition-colors">
              Sign Up Free
            </Link>
          </div>

          {/* Tier 2 */}
          <div className="p-8 rounded-2xl bg-slate-800 border-2 border-indigo-500 relative flex flex-col shadow-2xl shadow-indigo-500/10 scale-105 z-10">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-indigo-500 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
              Most Popular
            </div>
            <h3 className="text-xl font-medium text-indigo-300 mb-2">Pro Teacher</h3>
            <div className="text-4xl font-bold mb-6">$29<span className="text-lg text-slate-400 font-normal">/mo</span></div>
            <ul className="flex-1 space-y-4 mb-8 text-slate-300">
              <li className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-indigo-400" /> Host unlimited live rooms
              </li>
              <li className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-indigo-400" /> 100 students per class
              </li>
              <li className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-indigo-400" /> Create secure exams
              </li>
              <li className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-indigo-400" /> Advanced analytics
              </li>
            </ul>
            <Link href="/register?role=teacher" className="w-full py-3 rounded-xl font-semibold text-center text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/25 transition-all">
              Apply as Teacher
            </Link>
          </div>

          {/* Tier 3 */}
          <div className="p-8 rounded-2xl bg-slate-800/30 border border-slate-700/50 flex flex-col">
            <h3 className="text-xl font-medium text-slate-300 mb-2">Enterprise</h3>
            <div className="text-4xl font-bold mb-6">Custom</div>
            <ul className="flex-1 space-y-4 mb-8 text-slate-400">
              <li className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-indigo-400" /> Dedicated SFU servers
              </li>
              <li className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-indigo-400" /> White-label branding
              </li>
              <li className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-indigo-400" /> API Access
              </li>
            </ul>
            <Link href="/contact" className="w-full py-3 rounded-xl font-medium text-center bg-slate-700 hover:bg-slate-600 transition-colors">
              Contact Sales
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
