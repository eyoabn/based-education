"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  Video, 
  BookOpen, 
  ShieldCheck, 
  Sparkles, 
  Users, 
  Zap, 
  Award, 
  ArrowRight, 
  Check, 
  MessageSquare, 
  AlertTriangle, 
  ChevronDown, 
  Clock, 
  FileText, 
  Globe, 
  Lock, 
  BarChart3, 
  Sliders,
  Play
} from "lucide-react";
import DemoContactModal from "@/components/ui/DemoContactModal";

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState<"LIVE" | "EXAM" | "STREAM">("LIVE");
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "ANNUAL">("ANNUAL");
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  // Interactive Live Chat Simulator State
  const [chatMessages, setChatMessages] = useState([
    { sender: "Prof. Sarah Lin", text: "Welcome to Quantum Physics 101! Let's start the live demonstration.", time: "10:00 AM", isTeacher: true },
    { sender: "Elena Rostova", text: "Can you clarify slide 4 regarding wave-particle duality?", time: "10:02 AM", isTeacher: false }
  ]);
  const [newMsg, setNewMsg] = useState("");

  // Interactive Anti-Cheat Exam Simulator State
  const [tabSwitches, setTabSwitches] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(1);
  const [examWarning, setExamWarning] = useState<string | null>(null);

  // ROI Calculator State
  const [studentCount, setStudentCount] = useState(250);
  const [weeklyClasses, setWeeklyClasses] = useState(12);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg.trim()) return;
    setChatMessages(prev => [
      ...prev,
      { sender: "You (Guest)", text: newMsg, time: "Just now", isTeacher: false }
    ]);
    setNewMsg("");
  };

  const triggerTabSwitchWarning = () => {
    const nextCount = tabSwitches + 1;
    setTabSwitches(nextCount);
    setExamWarning(`WARNING (${nextCount}/3): Tab switch detected! This incident has been logged to the proctoring dashboard.`);
  };

  // Calculations for ROI Calculator
  const estimatedHoursSaved = Math.round(studentCount * 0.35 + weeklyClasses * 2.5);
  const estimatedCostSaved = Math.round(studentCount * 14.5 + weeklyClasses * 80);

  return (
    <div className="flex flex-col gap-24 py-12 overflow-hidden">
      
      {/* ==================== HERO SECTION ==================== */}
      <section className="container mx-auto px-4 max-w-7xl relative">
        {/* Ambient Glow Elements */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-indigo-600/15 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute top-1/3 right-10 w-[300px] h-[300px] bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="text-center relative z-10 max-w-4xl mx-auto">
          {/* Release Badge */}
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold mb-8 backdrop-blur-md">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
            </span>
            <span>EduConnect 2.0 • Low Latency WebRTC & Proctored Exams</span>
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          </div>

          {/* Main Headline */}
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-[1.1] gradient-text-hero">
            The International Standard for <br className="hidden md:block" />
            <span className="gradient-text-accent">Live Virtual Classrooms</span>
          </h1>

          {/* Subheading */}
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Empower educators and institutions with SFU WebRTC real-time classrooms, automated anti-cheat exam proctoring, and interactive social streams.
          </p>

          {/* Call to Actions */}
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-16">
            <Link
              href="/register"
              className="w-full sm:w-auto px-8 py-4 text-base font-semibold text-white bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-600 rounded-2xl shadow-xl shadow-indigo-500/25 transition-all hover:shadow-indigo-500/40 hover:-translate-y-0.5 flex items-center justify-center gap-2"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
            <button
              onClick={() => setIsDemoModalOpen(true)}
              className="w-full sm:w-auto px-8 py-4 text-base font-semibold text-slate-200 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 rounded-2xl transition-all hover:border-slate-700 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-slate-300" />
              <span>Book Institutional Demo</span>
            </button>
          </div>

          {/* Trust Badges */}
          <div className="pt-8 border-t border-slate-800/60">
            <p className="text-xs uppercase tracking-widest text-slate-500 font-semibold mb-6">
              Trusted by 1,200+ universities, academies & educators worldwide
            </p>
            <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
              <span className="text-sm font-bold text-slate-300 tracking-wider">STANFORD ONLINE</span>
              <span className="text-sm font-bold text-slate-300 tracking-wider">MIT xPRO</span>
              <span className="text-sm font-bold text-slate-300 tracking-wider">OXFORD ACADEMY</span>
              <span className="text-sm font-bold text-slate-300 tracking-wider">ETH ZÜRICH</span>
              <span className="text-sm font-bold text-slate-300 tracking-wider">CAMBRIDGE ED</span>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== INTERACTIVE PLATFORM SIMULATOR ==================== */}
      <section id="simulator" className="container mx-auto px-4 max-w-7xl">
        <div className="text-center mb-10">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
            Interactive Product Preview
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mt-3 mb-3">
            Experience EduConnect in Action
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto text-sm">
            Try our interactive classroom simulator below. Click between live video streaming, anti-cheat exams, and social learning streams.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex p-1.5 rounded-2xl bg-slate-900 border border-slate-800 backdrop-blur-lg">
            <button
              onClick={() => setActiveTab("LIVE")}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "LIVE"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Video className="w-4 h-4" />
              <span>Live Class Room</span>
            </button>
            <button
              onClick={() => setActiveTab("EXAM")}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "EXAM"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Proctored Exam</span>
            </button>
            <button
              onClick={() => setActiveTab("STREAM")}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "STREAM"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Social Stream</span>
            </button>
          </div>
        </div>

        {/* Simulator Frame */}
        <div className="relative mx-auto max-w-5xl rounded-3xl border border-slate-800 bg-slate-950 p-3 shadow-2xl shadow-indigo-950/40">
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900 overflow-hidden min-h-[480px] flex flex-col">
            
            {/* Fake Mac Window Bar */}
            <div className="h-11 bg-slate-950 border-b border-slate-800 px-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              </div>
              <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-400">
                <Lock className="w-3 h-3 text-emerald-400" />
                <span>live.educonnect.app/room/quantum-101</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="live-indicator">
                  <span className="live-dot" />
                  LIVE HD
                </span>
              </div>
            </div>

            {/* TAB 1: LIVE CLASSROOM SIMULATOR */}
            {activeTab === "LIVE" && (
              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 p-4 gap-4 bg-slate-950">
                {/* Main Video Stream */}
                <div className="md:col-span-2 rounded-xl bg-slate-900 border border-slate-800 relative flex flex-col justify-between p-4 min-h-[340px]">
                  {/* Video Overlay Header */}
                  <div className="flex justify-between items-center z-10">
                    <div className="bg-slate-950/80 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-800 text-xs text-white font-medium flex items-center gap-2">
                      <Video className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Prof. Sarah Lin (Host)</span>
                    </div>
                    {/* Audio Waveform Indicator */}
                    <div className="bg-slate-950/80 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-800 text-xs text-slate-300 flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-400">MIC</span>
                      <div className="flex items-end gap-0.5 h-4">
                        <span className="w-1 bg-emerald-400 rounded-full animate-sound-wave-1" />
                        <span className="w-1 bg-emerald-400 rounded-full animate-sound-wave-2" />
                        <span className="w-1 bg-emerald-400 rounded-full animate-sound-wave-3" />
                        <span className="w-1 bg-emerald-400 rounded-full animate-sound-wave-4" />
                      </div>
                    </div>
                  </div>

                  {/* Center Presentation Visual */}
                  <div className="my-auto text-center py-8">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center mx-auto mb-3 text-indigo-400">
                      <Sparkles className="w-8 h-8" />
                    </div>
                    <h4 className="text-white font-bold text-base">Lecture: Quantum Superposition & Qubits</h4>
                    <p className="text-slate-400 text-xs mt-1">Screen sharing active from Host Workstation • 1080p 60fps</p>
                  </div>

                  {/* Participant Avatars */}
                  <div className="flex justify-between items-center z-10 pt-2 border-t border-slate-800/60">
                    <div className="flex items-center -space-x-2">
                      <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center text-[10px] font-bold text-white border border-slate-900">SL</div>
                      <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center text-[10px] font-bold text-white border border-slate-900">ER</div>
                      <div className="w-7 h-7 rounded-full bg-purple-500 flex items-center justify-center text-[10px] font-bold text-white border border-slate-900">MK</div>
                      <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center text-[10px] font-bold text-white border border-slate-900">+42</div>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">45 Participants Connected</span>
                  </div>
                </div>

                {/* Live Chat Panel */}
                <div className="rounded-xl bg-slate-900 border border-slate-800 flex flex-col h-full min-h-[340px]">
                  <div className="p-3 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-white">
                      <MessageSquare className="w-4 h-4 text-indigo-400" />
                      <span>Class Chat</span>
                    </div>
                    <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded">Live</span>
                  </div>

                  {/* Chat Message Feed */}
                  <div className="flex-1 p-3 space-y-3 overflow-y-auto max-h-[250px] text-xs">
                    {chatMessages.map((msg, i) => (
                      <div key={i} className="flex flex-col gap-0.5">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className={`font-semibold ${msg.isTeacher ? "text-indigo-400" : "text-slate-300"}`}>
                            {msg.sender}
                          </span>
                          <span className="text-slate-500">{msg.time}</span>
                        </div>
                        <p className="bg-slate-800/60 p-2 rounded-lg text-slate-300 leading-snug border border-slate-800">
                          {msg.text}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Input form */}
                  <form onSubmit={handleSendMessage} className="p-2 border-t border-slate-800 flex gap-2">
                    <input
                      type="text"
                      value={newMsg}
                      onChange={(e) => setNewMsg(e.target.value)}
                      placeholder="Type simulated chat message..."
                      className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      Send
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* TAB 2: PROCTORED EXAM SIMULATOR */}
            {activeTab === "EXAM" && (
              <div className="flex-1 p-6 bg-slate-950 flex flex-col justify-between">
                <div>
                  {/* Warning Banner if Tab Switched */}
                  {examWarning && (
                    <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium flex items-center justify-between animate-fade-up">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>{examWarning}</span>
                      </div>
                      <button onClick={() => setExamWarning(null)} className="text-slate-400 hover:text-white text-xs">Dismiss</button>
                    </div>
                  )}

                  {/* Exam Header Status Bar */}
                  <div className="flex flex-wrap items-center justify-between pb-4 border-b border-slate-800 gap-4 mb-6">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">Midterm Assessment</span>
                      <h3 className="text-lg font-bold text-white">Advanced Data Structures & Algorithms</h3>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-mono">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
                        <Clock className="w-4 h-4" />
                        <span>Time Remaining: 42:15</span>
                      </div>
                      <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
                        Tab Switches: <span className="text-red-400 font-bold">{tabSwitches}</span>
                      </div>
                    </div>
                  </div>

                  {/* Question View */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-4">
                    <div className="text-xs text-indigo-400 font-semibold mb-2">Question 4 of 20</div>
                    <h4 className="text-white text-base font-semibold mb-4">
                      What is the worst-case time complexity of lookup in a balanced Red-Black Search Tree?
                    </h4>

                    <div className="space-y-3">
                      {[
                        { id: 1, text: "O(log n) - Guaranteed logarithmic height" },
                        { id: 2, text: "O(n) - Linear in worst case collision" },
                        { id: 3, text: "O(1) - Constant time lookup" },
                        { id: 4, text: "O(n log n) - Linearithmic sorting required" }
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => setSelectedOption(opt.id)}
                          className={`w-full p-3.5 rounded-xl border text-left text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${
                            selectedOption === opt.id
                              ? "bg-indigo-600/10 border-indigo-500 text-white"
                              : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                          }`}
                        >
                          <span>{opt.text}</span>
                          {selectedOption === opt.id && <Check className="w-4 h-4 text-indigo-400" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Interactive Trigger Button */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                  <button
                    onClick={triggerTabSwitchWarning}
                    className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Simulate Tab Switch (Test Anti-Cheat Detector)</span>
                  </button>
                  <div className="text-xs text-slate-500">
                    Proctoring Active • Auto-grading enabled on submit
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: SOCIAL STREAM SIMULATOR */}
            {activeTab === "STREAM" && (
              <div className="flex-1 p-6 bg-slate-950">
                <div className="max-w-xl mx-auto space-y-4">
                  {/* Stream Card */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-white text-xs">
                        DR
                      </div>
                      <div>
                        <h4 className="text-white text-sm font-bold">Dr. Robert Vance</h4>
                        <p className="text-slate-500 text-xs">Posted 2 hours ago in Physics Department</p>
                      </div>
                    </div>

                    <p className="text-slate-300 text-xs leading-relaxed">
                      Hello everyone! I've uploaded the supplemental reading materials and Python notebooks for this week's lab on Wave Mechanics. Please review before Friday's live session!
                    </p>

                    {/* Attachment preview */}
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-indigo-400 font-medium">
                        <FileText className="w-4 h-4" />
                        <span>Lab_04_Wave_Mechanics_Guide.pdf</span>
                      </div>
                      <span className="text-[10px] text-slate-500">2.4 MB</span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-400 pt-2 border-t border-slate-800">
                      <span className="hover:text-indigo-400 cursor-pointer flex items-center gap-1">
                        ❤️ 24 Likes
                      </span>
                      <span className="hover:text-indigo-400 cursor-pointer flex items-center gap-1">
                        💬 8 Comments
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </section>

      {/* ==================== ROI CALCULATOR WIDGET ==================== */}
      <section id="calculator" className="container mx-auto px-4 max-w-7xl">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 md:p-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="grid md:grid-cols-2 gap-10 items-center relative z-10">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold mb-4 border border-emerald-500/20">
                <Sliders className="w-3.5 h-3.5" />
                <span>Institutional ROI Calculator</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
                Calculate Time & Cost Savings
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed mb-8">
                Adjust your institution's size to see how EduConnect's automated exam grading, live class automation, and attendance tracking reduce overhead.
              </p>

              {/* Sliders */}
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-300 mb-2">
                    <span>Enrolled Students</span>
                    <span className="text-indigo-400 font-bold">{studentCount} Students</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="2000"
                    step="25"
                    value={studentCount}
                    onChange={(e) => setStudentCount(Number(e.target.value))}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-300 mb-2">
                    <span>Classes Per Week</span>
                    <span className="text-indigo-400 font-bold">{weeklyClasses} Classes</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="50"
                    step="1"
                    value={weeklyClasses}
                    onChange={(e) => setWeeklyClasses(Number(e.target.value))}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Calculated Output Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800/80 flex flex-col justify-between">
                <span className="text-slate-400 text-xs font-medium">Est. Teaching Hours Saved</span>
                <div className="text-4xl font-extrabold text-white my-3">{estimatedHoursSaved} <span className="text-sm text-indigo-400 font-semibold">hrs/mo</span></div>
                <span className="text-[11px] text-slate-500">Automated grading & attendance</span>
              </div>

              <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800/80 flex flex-col justify-between">
                <span className="text-slate-400 text-xs font-medium">Est. Institutional Savings</span>
                <div className="text-4xl font-extrabold text-emerald-400 my-3">${estimatedCostSaved.toLocaleString()} <span className="text-sm text-slate-400 font-semibold">/mo</span></div>
                <span className="text-[11px] text-slate-500">Reduced physical infrastructure</span>
              </div>

              <div className="sm:col-span-2 p-6 rounded-2xl bg-gradient-to-r from-indigo-950/60 to-purple-950/60 border border-indigo-500/30 flex items-center justify-between">
                <div>
                  <div className="text-xs text-indigo-300 font-semibold">Ready to scale your institution?</div>
                  <div className="text-white text-sm font-bold">Request a custom institutional trial</div>
                </div>
                <button
                  onClick={() => setIsDemoModalOpen(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap"
                >
                  Contact Sales
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== FEATURE GRID (BENTO CARDS) ==================== */}
      <section id="features" className="container mx-auto px-4 max-w-7xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4">
            Built for High-Stakes Education
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto text-sm">
            Everything your school, academy, or university needs to deliver seamless online learning.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="glass-card-premium p-8 rounded-3xl flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mb-6">
                <Video className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Unlimited SFU Live Rooms</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Ultra-low latency SFU WebRTC video streaming. Host up to 500 participants with screen sharing, breakout rooms, and cloud recording.
              </p>
            </div>
            <div className="mt-8 pt-4 border-t border-slate-800 text-xs text-indigo-400 font-semibold flex items-center gap-1">
              <span>Explore LiveKit Integration</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Card 2 */}
          <div className="glass-card-premium p-8 rounded-3xl flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mb-6">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Anti-Cheat Proctored Exams</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Integrated browser locking, tab-switch monitoring, and automated instant grading for objective quizzes and subjective essay evaluation.
              </p>
            </div>
            <div className="mt-8 pt-4 border-t border-slate-800 text-xs text-emerald-400 font-semibold flex items-center gap-1">
              <span>Proctoring Security Specs</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Card 3 */}
          <div className="glass-card-premium p-8 rounded-3xl flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center mb-6">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Social Learning Feed</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Threaded announcements, PDF resource sharing, comment discussions, and instant notification broadcasts to enrolled students.
              </p>
            </div>
            <div className="mt-8 pt-4 border-t border-slate-800 text-xs text-purple-400 font-semibold flex items-center gap-1">
              <span>Community Stream Feature</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </section>

      {/* ==================== PRICING SECTION ==================== */}
      <section id="pricing" className="container mx-auto px-4 max-w-7xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4">
            Transparent, Predictable Pricing
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto text-sm mb-8">
            Choose the right tier for individual educators or entire university departments.
          </p>

          {/* Monthly / Annual Switcher */}
          <div className="inline-flex items-center gap-3 p-1.5 bg-slate-900 border border-slate-800 rounded-2xl">
            <button
              onClick={() => setBillingCycle("MONTHLY")}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                billingCycle === "MONTHLY" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingCycle("ANNUAL")}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                billingCycle === "ANNUAL" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              <span>Annual Billing</span>
              <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full font-bold">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Student Tier */}
          <div className="glass-card-premium p-8 rounded-3xl flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-white mb-2">Student Access</h3>
              <p className="text-slate-400 text-xs mb-6">For enrolled students taking courses and exams.</p>
              <div className="text-4xl font-extrabold text-white mb-6">$0</div>

              <ul className="space-y-3 text-xs text-slate-300 mb-8">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-indigo-400" /> Join live virtual classes</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-indigo-400" /> Participate in social feed</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-indigo-400" /> Take proctored exams</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-indigo-400" /> Gradebook & progress reports</li>
              </ul>
            </div>
            <Link
              href="/register"
              className="w-full py-3 rounded-xl font-semibold text-center bg-slate-800 hover:bg-slate-700 text-white text-xs transition-all"
            >
              Create Free Account
            </Link>
          </div>

          {/* Pro Educator Tier */}
          <div className="glass-card-premium p-8 rounded-3xl flex flex-col justify-between border-2 border-indigo-500 relative shadow-2xl shadow-indigo-500/10">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-indigo-500 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
              Most Popular for Educators
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-2">Pro Educator</h3>
              <p className="text-slate-400 text-xs mb-6">For teachers hosting live classes and creating exams.</p>
              <div className="text-4xl font-extrabold text-white mb-6">
                ${billingCycle === "ANNUAL" ? "23" : "29"}
                <span className="text-xs text-slate-500 font-normal"> / month</span>
              </div>

              <ul className="space-y-3 text-xs text-slate-300 mb-8">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-indigo-400" /> Host unlimited SFU live rooms</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-indigo-400" /> Up to 250 students per class</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-indigo-400" /> Anti-cheat exam builder</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-indigo-400" /> Automated & essay grading</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-indigo-400" /> Real-time attendance reports</li>
              </ul>
            </div>
            <Link
              href="/register?role=teacher"
              className="w-full py-3 rounded-xl font-semibold text-center bg-indigo-600 hover:bg-indigo-500 text-white text-xs shadow-lg shadow-indigo-500/25 transition-all"
            >
              Apply as Educator
            </Link>
          </div>

          {/* Enterprise Tier */}
          <div className="glass-card-premium p-8 rounded-3xl flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold text-white mb-2">University Enterprise</h3>
              <p className="text-slate-400 text-xs mb-6">For universities, districts & large academies.</p>
              <div className="text-4xl font-extrabold text-white mb-6">Custom</div>

              <ul className="space-y-3 text-xs text-slate-300 mb-8">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-indigo-400" /> Unlimited students & teachers</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-indigo-400" /> Dedicated SFU LiveKit cluster</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-indigo-400" /> Custom SSO (SAML / OAuth)</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-indigo-400" /> FERPA / GDPR compliance SLA</li>
              </ul>
            </div>
            <button
              onClick={() => setIsDemoModalOpen(true)}
              className="w-full py-3 rounded-xl font-semibold text-center bg-slate-800 hover:bg-slate-700 text-white text-xs transition-all cursor-pointer"
            >
              Request Custom Demo
            </button>
          </div>
        </div>
      </section>

      {/* ==================== FAQ ACCORDION ==================== */}
      <section id="faq" className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-3">
            Frequently Asked Questions
          </h2>
          <p className="text-slate-400 text-sm">
            Everything you need to know about EduConnect features and setup.
          </p>
        </div>

        <div className="space-y-3">
          {[
            {
              q: "How does the anti-cheat proctoring engine work?",
              a: "EduConnect monitors browser tab focus, window blur events, and full-screen state during timed exams. Every incident is timestamped and flagged on the teacher's grading dashboard."
            },
            {
              q: "What is the maximum capacity for live virtual classes?",
              a: "With our Selective Forwarding Unit (SFU) WebRTC architecture, live classes support up to 500 interactive participants per room with low-latency HD video and screen sharing."
            },
            {
              q: "How does the teacher verification process work?",
              a: "When a new educator signs up, their account enters a PENDING status. Administrators review their specialty and credential documentation before approving access to class creation."
            },
            {
              q: "Is EduConnect compliant with international data standards?",
              a: "Yes. EduConnect adheres to FERPA and GDPR standards, enforcing secure HTTP-only JWT sessions, encrypted data transit, and audit logging."
            }
          ].map((item, idx) => (
            <div key={idx} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <button
                onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                className="w-full p-5 text-left flex justify-between items-center text-sm font-semibold text-white cursor-pointer hover:bg-slate-800/40 transition-colors"
              >
                <span>{item.q}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedFaq === idx ? "rotate-180 text-indigo-400" : ""}`} />
              </button>
              {expandedFaq === idx && (
                <div className="p-5 pt-0 text-xs text-slate-400 leading-relaxed border-t border-slate-800/60 mt-1">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Demo Contact Modal */}
      <DemoContactModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
      />
    </div>
  );
}
