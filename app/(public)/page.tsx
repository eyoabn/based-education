"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  Video, 
  BookOpen, 
  ShieldCheck, 
  Sparkles, 
  ArrowRight, 
  Check, 
  MessageSquare, 
  AlertTriangle, 
  ChevronDown, 
  Clock, 
  FileText, 
  Lock, 
  Play
} from "lucide-react";

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState<"LIVE" | "REFLECTION" | "STREAM">("LIVE");
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  // Interactive Live Chat Simulator State
  const [chatMessages, setChatMessages] = useState([
    { sender: "Master Guide", text: "Welcome to the Sanctuary. Let's begin our meditation.", time: "10:00 AM", isTeacher: true },
    { sender: "Sarah", text: "Thank you for this beautiful session.", time: "10:02 AM", isTeacher: false }
  ]);
  const [newMsg, setNewMsg] = useState("");

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg.trim()) return;
    setChatMessages(prev => [
      ...prev,
      { sender: "You (Seeker)", text: newMsg, time: "Just now", isTeacher: false }
    ]);
    setNewMsg("");
  };

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

      {/* ==================== INTERACTIVE PLATFORM SIMULATOR ==================== */}
      <section id="simulator" className="container mx-auto px-4 max-w-7xl">
        <div className="text-center mb-10">
          <span className="text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
            Platform Preview
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mt-3 mb-3">
            Experience the Sanctuary
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto text-sm">
            Try our interactive preview below. Switch between live broadcasts, deep reflections, and our community feed.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex p-1.5 rounded-2xl bg-[#111] border border-white/10 backdrop-blur-lg">
            <button
              onClick={() => setActiveTab("LIVE")}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "LIVE"
                  ? "bg-primary text-black shadow-lg shadow-primary/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Video className="w-4 h-4" />
              <span>Live Broadcast</span>
            </button>
            <button
              onClick={() => setActiveTab("REFLECTION")}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "REFLECTION"
                  ? "bg-primary text-black shadow-lg shadow-primary/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Spiritual Reflection</span>
            </button>
            <button
              onClick={() => setActiveTab("STREAM")}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "STREAM"
                  ? "bg-primary text-black shadow-lg shadow-primary/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Community Feed</span>
            </button>
          </div>
        </div>

        {/* Simulator Frame */}
        <div className="relative mx-auto max-w-5xl rounded-3xl border border-white/10 bg-black p-3 shadow-2xl shadow-primary/10">
          <div className="rounded-2xl border border-white/10 bg-[#0A0A0A] overflow-hidden min-h-[480px] flex flex-col">
            
            {/* Fake Mac Window Bar */}
            <div className="h-11 bg-black border-b border-white/10 px-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-white/20" />
                <div className="w-3 h-3 rounded-full bg-white/20" />
                <div className="w-3 h-3 rounded-full bg-white/20" />
              </div>
              <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-[#111] border border-white/10 text-[11px] font-mono text-slate-400">
                <Lock className="w-3 h-3 text-primary" />
                <span>sanctuary.live/room/sunday-service</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="live-indicator border-primary/30 text-primary bg-primary/10">
                  <span className="live-dot bg-primary" />
                  LIVE HD
                </span>
              </div>
            </div>

            {/* TAB 1: LIVE BROADCAST SIMULATOR */}
            {activeTab === "LIVE" && (
              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 p-4 gap-4 bg-black">
                {/* Main Video Stream */}
                <div className="md:col-span-2 rounded-xl bg-[#111] border border-white/10 relative flex flex-col justify-between p-4 min-h-[340px]">
                  {/* Video Overlay Header */}
                  <div className="flex justify-between items-center z-10">
                    <div className="bg-black/80 backdrop-blur px-3 py-1.5 rounded-lg border border-white/10 text-xs text-primary font-medium flex items-center gap-2">
                      <Video className="w-3.5 h-3.5" />
                      <span>Master Guide (Host)</span>
                    </div>
                  </div>

                  {/* Center Presentation Visual */}
                  <div className="my-auto text-center py-8">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-3 text-primary">
                      <Sparkles className="w-8 h-8" />
                    </div>
                    <h4 className="text-primary font-bold text-base">Sunday Morning Meditation & Guidance</h4>
                    <p className="text-slate-400 text-xs mt-1">High-Definition Broadcast Active</p>
                  </div>

                  {/* Participant Avatars */}
                  <div className="flex justify-between items-center z-10 pt-2 border-t border-white/10">
                    <span className="text-xs text-primary/70 font-mono">1,245 Seekers Connected</span>
                  </div>
                </div>

                {/* Live Chat Panel */}
                <div className="rounded-xl bg-[#111] border border-white/10 flex flex-col h-full min-h-[340px]">
                  <div className="p-3 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-primary">
                      <MessageSquare className="w-4 h-4" />
                      <span>Fellowship Chat</span>
                    </div>
                  </div>

                  {/* Chat Message Feed */}
                  <div className="flex-1 p-3 space-y-3 overflow-y-auto max-h-[250px] text-xs">
                    {chatMessages.map((msg, i) => (
                      <div key={i} className="flex flex-col gap-0.5">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className={`font-semibold ${msg.isTeacher ? "text-primary" : "text-slate-300"}`}>
                            {msg.sender}
                          </span>
                          <span className="text-slate-500">{msg.time}</span>
                        </div>
                        <p className="bg-[#1a1a1a] p-2 rounded-lg text-slate-300 leading-snug border border-white/5">
                          {msg.text}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Input form */}
                  <form onSubmit={handleSendMessage} className="p-2 border-t border-white/10 flex gap-2">
                    <input
                      type="text"
                      value={newMsg}
                      onChange={(e) => setNewMsg(e.target.value)}
                      placeholder="Share your thoughts..."
                      className="flex-1 px-3 py-1.5 bg-black border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-primary"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-primary text-black rounded-lg text-xs font-bold cursor-pointer"
                    >
                      Send
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* TAB 2: REFLECTION SIMULATOR */}
            {activeTab === "REFLECTION" && (
              <div className="flex-1 p-6 bg-black flex flex-col justify-between">
                <div>
                  <div className="flex flex-wrap items-center justify-between pb-4 border-b border-white/10 gap-4 mb-6">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-primary tracking-wider">Weekly Reflection</span>
                      <h3 className="text-lg font-bold text-white">Understanding Inner Peace</h3>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-mono">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/30 text-primary">
                        <Clock className="w-4 h-4" />
                        <span>Self-Paced</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#111] border border-white/10 rounded-2xl p-6 mb-4">
                    <div className="text-xs text-primary font-semibold mb-2">Prompt 1</div>
                    <h4 className="text-white text-base font-semibold mb-4">
                      How did the morning meditation impact your state of mind today?
                    </h4>
                    <textarea 
                      className="w-full h-32 bg-black border border-white/10 rounded-xl p-4 text-slate-300 focus:outline-none focus:border-primary text-sm"
                      placeholder="Write your reflection here..."
                    ></textarea>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: SOCIAL STREAM SIMULATOR */}
            {activeTab === "STREAM" && (
              <div className="flex-1 p-6 bg-black">
                <div className="max-w-xl mx-auto space-y-4">
                  {/* Stream Card */}
                  <div className="bg-[#111] border border-white/10 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center font-bold text-black text-xs">
                        MG
                      </div>
                      <div>
                        <h4 className="text-white text-sm font-bold">Master Guide</h4>
                        <p className="text-slate-500 text-xs">Posted 2 hours ago</p>
                      </div>
                    </div>

                    <p className="text-slate-300 text-xs leading-relaxed">
                      Blessings to you all. I have uploaded the study materials for this week's focus. Please review them before our Sunday gathering.
                    </p>

                    {/* Attachment preview */}
                    <div className="p-3 rounded-xl bg-black border border-white/10 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-primary font-medium">
                        <FileText className="w-4 h-4" />
                        <span>Weekly_Study_Guide.pdf</span>
                      </div>
                      <span className="text-[10px] text-slate-500">2.4 MB</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

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
