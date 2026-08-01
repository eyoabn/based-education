"use client"

import { useEffect, useRef, useState } from "react"
import { Clock, TimerReset } from "lucide-react"
import { formatCountdown, secondsRemaining, timerTone } from "@/lib/exams"

/**
 * Phase 5 — the countdown.
 *
 * Ticks against the server-issued `deadline` rather than counting down from a
 * local number, so a paused tab, a slow render or a clock the student nudged
 * can't manufacture extra minutes. `onExpire` fires exactly once.
 */

interface ExamTimerProps {
  /** Server-authoritative ISO deadline. */
  deadline: string
  durationMins: number
  /** Called once when the clock reaches zero — triggers auto-submit. */
  onExpire: () => void
  /** Stops the clock once the paper is in flight. */
  paused?: boolean
}

const TONE_STYLES = {
  calm: "bg-slate-900 text-white border-slate-700",
  warn: "bg-amber-500 text-white border-amber-600",
  critical: "bg-red-600 text-white border-red-700 animate-pulse",
} as const

export default function ExamTimer({
  deadline,
  durationMins,
  onExpire,
  paused = false,
}: ExamTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(() => secondsRemaining(deadline))
  const hasExpired = useRef(false)
  const onExpireRef = useRef(onExpire)

  useEffect(() => {
    onExpireRef.current = onExpire
  }, [onExpire])

  useEffect(() => {
    if (paused) return

    const tick = () => {
      const remaining = secondsRemaining(deadline)
      setSecondsLeft(remaining)

      if (remaining <= 0 && !hasExpired.current) {
        hasExpired.current = true
        onExpireRef.current()
      }
    }

    tick() // don't wait a full second for the first paint
    const interval = setInterval(tick, 1_000)
    return () => clearInterval(interval)
  }, [deadline, paused])

  const tone = timerTone(secondsLeft, durationMins)
  const totalSec = Math.max(1, durationMins * 60)
  const pctLeft = Math.min(100, Math.max(0, (secondsLeft / totalSec) * 100))

  return (
    <div
      role="timer"
      aria-live={tone === "critical" ? "assertive" : "off"}
      className={`flex items-center gap-3 px-4 py-2 rounded-xl border shadow-sm transition-colors ${TONE_STYLES[tone]}`}
    >
      {tone === "critical" ? (
        <TimerReset className="w-4 h-4 shrink-0" />
      ) : (
        <Clock className="w-4 h-4 shrink-0" />
      )}

      <div className="min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-widest opacity-70 leading-none mb-1">
          {secondsLeft <= 0 ? "Time is up" : "Time Remaining"}
        </div>
        <div className="font-mono text-xl font-bold leading-none tabular-nums">
          {formatCountdown(secondsLeft)}
        </div>
      </div>

      {/* Drain bar */}
      <div className="w-16 h-1.5 rounded-full bg-white/25 overflow-hidden shrink-0 ml-1">
        <div
          className="h-full bg-white/90 rounded-full transition-[width] duration-1000 ease-linear"
          style={{ width: `${pctLeft}%` }}
        />
      </div>
    </div>
  )
}
