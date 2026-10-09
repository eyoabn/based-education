"use client"

import { useState } from "react"
import { Bug, Send, AlertCircle } from "lucide-react"

export default function FeedbackForm() {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !description) return

    setStatus("submitting")
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description })
      })

      if (res.ok) {
        setStatus("success")
        setTitle("")
        setDescription("")
      } else {
        const data = await res.json()
        setErrorMessage(data.error || "Failed to submit report")
        setStatus("error")
      }
    } catch (err) {
      setErrorMessage("Network error occurred. Please try again.")
      setStatus("error")
    }
  }

  if (status === "success") {
    return (
      <div className="max-w-2xl mx-auto mt-10 p-8 sm:p-12 bg-[#111110] rounded-3xl shadow-2xl border border-white/[0.08] text-center animate-fade-in">
        <div className="w-16 h-16 bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.25)] text-[#d4af37] rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-black/30">
          <Send className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-[#f7f3e8] tracking-tight mb-2">Report Transmitted</h2>
        <p className="text-sm text-[#9d9b95] mb-6 max-w-md mx-auto">
          Thank you for helping us refine BasedEducation. Our engineering and administrative team will triage your report immediately.
        </p>
        <button
          onClick={() => setStatus("idle")}
          className="px-6 py-3 bg-[#181817] hover:bg-[#20201e] border border-white/[0.08] text-[#f7f3e8] font-bold text-sm rounded-xl transition-all shadow-sm min-h-[44px]"
        >
          Submit Another Report
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto mt-6">
      <div className="bg-[#111110] rounded-3xl shadow-2xl border border-white/[0.08] overflow-hidden">
        <div className="bg-gradient-to-r from-[#181817] via-[#141413] to-[#111110] p-6 sm:p-8 border-b border-white/[0.08] text-[#f7f3e8]">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.25)] rounded-2xl text-[#d4af37]">
              <Bug className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black tracking-tight">Report an Incident or Bug</h1>
          </div>
          <p className="text-sm text-[#9d9b95]">
            Notice a bug or glitch? Dispatch the telemetry to our administrative team for expedited resolution.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          {status === "error" && (
            <div className="p-4 bg-rose-950/25 text-rose-300 border border-rose-500/30 rounded-2xl text-sm font-medium flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-[#f7f3e8]" htmlFor="title">
              Issue Summary <span className="text-[#d4af37]">*</span>
            </label>
            <input
              id="title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Audio cut out during live video stream"
              className="w-full px-4 py-3 rounded-xl bg-[#181817] border border-white/[0.08] text-[#f7f3e8] placeholder-[#9d9b95]/50 focus:border-[#d4af37] focus:outline-none transition-all text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-[#f7f3e8]" htmlFor="description">
              Diagnostic Details <span className="text-[#d4af37]">*</span>
            </label>
            <textarea
              id="description"
              required
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please describe what occurred, expected outcome, and exact steps to reproduce..."
              className="w-full px-4 py-3 rounded-xl bg-[#181817] border border-white/[0.08] text-[#f7f3e8] placeholder-[#9d9b95]/50 focus:border-[#d4af37] focus:outline-none transition-all text-sm resize-y"
            />
          </div>

          <button
            type="submit"
            disabled={status === "submitting"}
            className="w-full py-3.5 bg-gradient-to-r from-[#d4af37] to-[#b38f2a] hover:brightness-110 disabled:opacity-50 text-black font-extrabold text-sm rounded-xl shadow-lg shadow-[rgba(212,175,55,0.15)] transition-all flex items-center justify-center gap-2 min-h-[46px]"
          >
            {status === "submitting" ? (
              <>Sending Transmission...</>
            ) : (
              <>
                <Send className="w-4 h-4" /> Dispatch Bug Report
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
