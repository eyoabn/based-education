"use client"

import { useState } from "react"
import { AlertCircle, Check, Loader2, Megaphone, Send, X } from "lucide-react"
import { formatCount, type PlatformMetrics } from "@/lib/admin"

type Audience = "ALL" | "STUDENT" | "TEACHER" | "ADMIN"

interface BroadcastModalProps {
  metrics: PlatformMetrics
  onClose: () => void
  onSent?: (count: number) => void
}

/**
 * Platform-wide announcement composer.
 *
 * A broadcast is irreversible and lands in every user's notification tray, so
 * the reach is shown next to the send button and the copy is capped — this is
 * a notice, not a newsletter. Suspended accounts are excluded server-side.
 */
export default function BroadcastModal({ metrics, onClose, onSent }: BroadcastModalProps) {
  const [title, setTitle] = useState("")
  const [message, setMessage] = useState("")
  const [audience, setAudience] = useState<Audience>("ALL")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sentCount, setSentCount] = useState<number | null>(null)

  const reach =
    audience === "ALL"
      ? metrics.totalUsers - metrics.bannedCount
      : audience === "STUDENT"
        ? metrics.studentCount
        : audience === "TEACHER"
          ? metrics.teacherCount
          : metrics.adminCount

  const audiences: { id: Audience; label: string }[] = [
    { id: "ALL", label: "Everyone" },
    { id: "STUDENT", label: "Students" },
    { id: "TEACHER", label: "Teachers" },
    { id: "ADMIN", label: "Admins" },
  ]

  async function send() {
    setSending(true)
    setError(null)

    try {
      const res = await fetch("/api/admin/platform", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), message: message.trim(), audience }),
      })
      const payload = await res.json()

      if (!res.ok) {
        setError(payload.error ?? "The broadcast could not be sent.")
        return
      }

      setSentCount(payload.sent ?? 0)
      onSent?.(payload.sent ?? 0)
    } catch {
      setError("Could not reach the server.")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={() => !sending && onClose()}
      />

      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 animate-fade-up">
        <button
          onClick={onClose}
          disabled={sending}
          className="absolute top-4 right-4 p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {sentCount !== null ? (
          <div className="text-center py-6">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
              <Check className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-1.5">Broadcast delivered</h2>
            <p className="text-sm text-slate-500 mb-6">
              {formatCount(sentCount)} {sentCount === 1 ? "person" : "people"} received the notice in
              their notification tray.
            </p>
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="w-12 h-12 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center mb-4">
              <Megaphone className="w-6 h-6" />
            </div>

            <h2 className="text-lg font-bold text-slate-900 mb-1.5">Broadcast a platform notice</h2>
            <p className="text-sm text-slate-500 mb-5">
              Delivered instantly to open dashboards and stored in the notification tray. Suspended
              accounts are skipped.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">
                  Audience
                </label>
                <div className="flex flex-wrap gap-2">
                  {audiences.map(option => (
                    <button
                      key={option.id}
                      onClick={() => setAudience(option.id)}
                      className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                        audience === option.id
                          ? "bg-slate-900 text-white"
                          : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label
                  htmlFor="broadcast-title"
                  className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-2"
                >
                  Title
                </label>
                <input
                  id="broadcast-title"
                  value={title}
                  onChange={event => setTitle(event.target.value.slice(0, 120))}
                  placeholder="Scheduled maintenance this Saturday"
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label
                  htmlFor="broadcast-message"
                  className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-2"
                >
                  Message
                  <span className="float-right font-normal normal-case tracking-normal text-slate-400 tabular-nums">
                    {message.length}/1000
                  </span>
                </label>
                <textarea
                  id="broadcast-message"
                  value={message}
                  onChange={event => setMessage(event.target.value.slice(0, 1000))}
                  rows={4}
                  placeholder="Live classes will be unavailable between 02:00 and 04:00 UTC while we upgrade the streaming infrastructure."
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 px-3 py-2 mt-4 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <div className="flex items-center justify-between gap-3 mt-6">
              <span className="text-xs text-slate-500">
                Reaches{" "}
                <span className="font-bold text-slate-700 tabular-nums">{formatCount(reach)}</span>{" "}
                {reach === 1 ? "person" : "people"}
              </span>

              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  disabled={sending}
                  className="px-4 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => void send()}
                  disabled={sending || !title.trim() || message.trim().length < 10}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Send broadcast
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
