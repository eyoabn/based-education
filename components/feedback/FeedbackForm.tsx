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
      <div className="max-w-2xl mx-auto mt-10 p-8 bg-white rounded-2xl shadow-sm border border-slate-200 text-center">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Send className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Report Submitted</h2>
        <p className="text-slate-500 mb-6">Thank you for your feedback! Our admin team will look into it shortly.</p>
        <button
          onClick={() => setStatus("idle")}
          className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors"
        >
          Submit Another Report
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto mt-6">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-900 p-6 sm:p-8 text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-300">
              <Bug className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold">Report a Bug</h1>
          </div>
          <p className="text-slate-400">
            Help us improve BasedEducation by reporting bugs, glitches, or suggesting improvements.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          {status === "error" && (
            <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm font-medium flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700" htmlFor="title">Issue Summary</label>
            <input
              id="title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Cannot join live video room"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700" htmlFor="description">Details</label>
            <textarea
              id="description"
              required
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please describe what happened, what you expected to happen, and steps to reproduce..."
              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none resize-y"
            />
          </div>

          <button
            type="submit"
            disabled={status === "submitting"}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
          >
            {status === "submitting" ? (
              <>Sending...</>
            ) : (
              <>
                <Send className="w-5 h-5" /> Submit Report
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
