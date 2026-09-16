"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  Video, 
  BookOpen, 
  ShieldCheck, 
  Sparkles, 
  ArrowRight, 
  ChevronDown 
} from "lucide-react";

export default function LandingPage() {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  return (
    <div className="flex flex-col gap-24 py-12 overflow-hidden">
      
      {/* ==================== HERO SECTION ==================== */}
      <section className="container mx-auto px-4 max-w-7xl relative">
        {/* Ambient Glow Elements */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/10 rounded-full blur-[140px] pointer-events-none" />
        
        <div className="text-center relative z-10 max-w-4xl mx-auto">
          {/* Release Badge */}
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-8 backdrop-blur-md">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
            </span>
            <span>Welcome to the New Spiritual Sanctuary</span>
            <Sparkles className="w-3.5 h-3.5 text-primary" />
          </div>

          {/* Main Headline */}
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-[1.1] text-white">
            Illuminate Your Path with <br className="hidden md:block" />
            <span className="text-primary">Live Spiritual Guidance</span>
          </h1>

          {/* Subheading */}
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Experience high-quality, uninterrupted live broadcasts. No more network dropouts—just deep, meaningful connection and community.
          </p>

          {/* Call to Actions */}
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-16">
            <Link
              href="/register"
              className="w-full sm:w-auto px-8 py-4 text-base font-bold text-black bg-primary hover:bg-[#FCE69B] rounded-2xl shadow-xl shadow-primary/20 transition-all hover:shadow-primary/40 hover:-translate-y-0.5 flex items-center justify-center gap-2"
            >
              <span>Join the Community</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>



      {/* ==================== FEATURE GRID ==================== */}
      <section id="features" className="container mx-auto px-4 max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4">
            A Premium Sanctuary Experience
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto text-sm">
            Everything you need for uninterrupted spiritual growth and connection.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="bg-[#111] border border-white/10 p-8 rounded-3xl flex flex-col justify-between hover:border-primary/50 transition-colors">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center mb-6">
                <Video className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Flawless Live Broadcasts</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Forget network issues on Telegram. Our dedicated stream ensures you never miss a word of the teaching.
              </p>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-[#111] border border-white/10 p-8 rounded-3xl flex flex-col justify-between hover:border-primary/50 transition-colors">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center mb-6">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Spiritual Reflections</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Complete guided reflections directly within the platform. Your insights are securely stored for personal growth.
              </p>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-[#111] border border-white/10 p-8 rounded-3xl flex flex-col justify-between hover:border-primary/50 transition-colors">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center mb-6">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Community Stream</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Stay connected with the community through shared announcements, study materials, and fellowship discussions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== JOIN SECTION ==================== */}
      <section id="pricing" className="container mx-auto px-4 max-w-4xl text-center">
         <div className="bg-[#111] border border-primary/30 rounded-3xl p-12">
            <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-6">
              Step Into The Sanctuary
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto text-sm mb-8">
              Join our exclusive spiritual community today. Access high-quality live broadcasts, deep reflections, and a supportive network of seekers.
            </p>
            <Link
              href="/register"
              className="inline-block px-10 py-4 text-lg font-bold text-black bg-primary hover:bg-[#FCE69B] rounded-2xl shadow-xl shadow-primary/20 transition-all"
            >
              Become a Member
            </Link>
         </div>
      </section>

      {/* ==================== FAQ ACCORDION ==================== */}
      <section id="faq" className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-3">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-3">
          {[
            {
              q: "Why move away from Telegram Live?",
              a: "Our new dedicated platform provides ultra-low latency, stable streaming, and integrated community tools that Telegram cannot offer. It ensures you receive uninterrupted teachings."
            },
            {
              q: "Do I need to download an app?",
              a: "No! The Sanctuary is fully accessible through any modern web browser on your phone, tablet, or computer."
            },
            {
              q: "How do I access the live broadcasts?",
              a: "Once you register and sign in, upcoming broadcasts will appear on your dashboard. Simply click 'Join' when the session begins."
            }
          ].map((item, idx) => (
            <div key={idx} className="bg-[#111] border border-white/10 rounded-2xl overflow-hidden">
              <button
                onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                className="w-full p-5 text-left flex justify-between items-center text-sm font-bold text-white cursor-pointer hover:bg-white/5 transition-colors"
              >
                <span>{item.q}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedFaq === idx ? "rotate-180 text-primary" : ""}`} />
              </button>
              {expandedFaq === idx && (
                <div className="p-5 pt-0 text-xs text-slate-400 leading-relaxed border-t border-white/5 mt-1">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
