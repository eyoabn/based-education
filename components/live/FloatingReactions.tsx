"use client"

import React, { useState, useEffect, useCallback, memo } from "react"
import { Room } from "livekit-client"
import { Smile, Sparkles, X } from "lucide-react"

export interface LiveReaction {
  id: string
  emoji: string
  senderName: string
  leftOffset: number // percentage 5% to 85%
  drift: number // horizontal sway in px (-40 to +40)
  size: number // font size rem
}

export const MEET_STICKERS = [
  { emoji: "👍", label: "Agree / Thumbs Up" },
  { emoji: "❤️", label: "Heart / Love" },
  { emoji: "👏", label: "Clap / Applause" },
  { emoji: "🎉", label: "Party / Celebrate" },
  { emoji: "😂", label: "Joy / Laugh" },
  { emoji: "😮", label: "Surprised / Wow" },
  { emoji: "🔥", label: "Fire / Amazing" },
  { emoji: "💡", label: "Insight / Idea" },
  { emoji: "💯", label: "100 / Perfect" },
  { emoji: "⭐", label: "Star / Brilliant" },
  { emoji: "🚀", label: "Rocket / Hype" },
  { emoji: "👎", label: "Disagree / Down" },
]

interface FloatingReactionsProps {
  room?: Room | null
  currentUserName: string
}

export default function FloatingReactions({ room, currentUserName }: FloatingReactionsProps) {
  const [reactions, setReactions] = useState<LiveReaction[]>([])

  const spawnReaction = useCallback((emoji: string, senderName: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    // Float up from bottom left-to-center area with organic spread
    const leftOffset = 6 + Math.random() * 42 // 6% to 48% on screen
    const drift = (Math.random() - 0.5) * 80 // -40px to +40px
    const size = 1.8 + Math.random() * 0.7 // 1.8rem to 2.5rem

    const newReaction: LiveReaction = {
      id,
      emoji,
      senderName,
      leftOffset,
      drift,
      size,
    }

    setReactions((prev) => [...prev.slice(-35), newReaction])

    // Automatically remove reaction after 3.2s
    setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== id))
    }, 3200)
  }, [])

  // Listen to incoming WebRTC data packets (topic 'live-reaction' or JSON action 'LIVE_REACTION')
  useEffect(() => {
    if (!room) return

    const handleData = (payload: Uint8Array, participant?: any, kind?: any, topic?: string) => {
      let data: any = null
      try {
        const text = new TextDecoder().decode(payload)
        data = JSON.parse(text)
      } catch {}

      if (
        topic === "live-reaction" ||
        data?.topic === "live-reaction" ||
        data?.type === "live-reaction" ||
        data?.action === "LIVE_REACTION"
      ) {
        if (data?.emoji) {
          const sender = data.senderName || participant?.name || participant?.identity || "Participant"
          spawnReaction(data.emoji, sender)
        }
      }
    }

    room.on("dataReceived", handleData)
    return () => {
      room.off("dataReceived", handleData)
    }
  }, [room, spawnReaction])

  // Listen to local triggers (when local student or teacher clicks a sticker)
  useEffect(() => {
    const handleLocalReaction = (e: Event) => {
      const customEvent = e as CustomEvent<{ emoji: string; senderName?: string }>
      if (customEvent.detail?.emoji) {
        spawnReaction(
          customEvent.detail.emoji,
          customEvent.detail.senderName || currentUserName || "You"
        )
      }
    }

    window.addEventListener("local-live-reaction", handleLocalReaction)
    return () => {
      window.removeEventListener("local-live-reaction", handleLocalReaction)
    }
  }, [spawnReaction, currentUserName])

  return (
    <div className="pointer-events-none fixed inset-0 z-30 overflow-hidden select-none">
      {reactions.map((reaction) => (
        <div
          key={reaction.id}
          className="absolute bottom-20 flex flex-col items-center animate-google-meet-float pointer-events-none"
          style={{
            left: `${reaction.leftOffset}%`,
            "--drift": `${reaction.drift}px`,
          } as React.CSSProperties}
        >
          {/* Reaction Emoji */}
          <span
            className="drop-shadow-[0_4px_16px_rgba(0,0,0,0.7)] select-none transition-transform hover:scale-125"
            style={{ fontSize: `${reaction.size}rem` }}
          >
            {reaction.emoji}
          </span>

          {/* Sender Name Pill (Google Meet Style) */}
          <div className="mt-1 px-2 py-0.5 rounded-full bg-black/85 backdrop-blur-md border border-white/20 text-[10px] font-semibold text-slate-200 shadow-xl whitespace-nowrap">
            {reaction.senderName === currentUserName || reaction.senderName === "You"
              ? "You"
              : reaction.senderName}
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Reaction Tray Picker (Google Meet Style popup ribbon)
 * Seamlessly positions above bottom dock on both mobile and desktop
 */
interface ReactionPickerProps {
  room?: Room | null
  currentUserName: string
  isOpen: boolean
  onClose: () => void
}

export function ReactionPicker({ room, currentUserName, isOpen, onClose }: ReactionPickerProps) {
  const [lastSentEmoji, setLastSentEmoji] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSendEmoji = async (emoji: string) => {
    // 1. Immediate visual pop feedback on the button itself
    setLastSentEmoji(emoji)
    setTimeout(() => setLastSentEmoji(null), 400)

    // 2. Dispatch local reaction so sender immediately sees their sticker floating up with "You"
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("local-live-reaction", {
          detail: { emoji, senderName: currentUserName || "You" },
        })
      )
    }

    // 3. Send via WebRTC to everyone in room
    if (room && room.localParticipant) {
      try {
        const encoder = new TextEncoder()
        const payload = JSON.stringify({
          action: "LIVE_REACTION",
          type: "live-reaction",
          topic: "live-reaction",
          emoji,
          senderName: currentUserName || "Participant",
          timestamp: Date.now(),
        })
        await room.localParticipant.publishData(encoder.encode(payload), {
          topic: "live-reaction",
          reliable: false, // fast UDP delivery
        })
      } catch (err) {
        console.warn("Failed to broadcast live reaction:", err)
      }
    }
  }

  return (
    <>
      {/* Invisible backdrop to dismiss picker on tap outside */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/20 sm:bg-transparent cursor-pointer"
      />

      {/* Floating Reaction Bar */}
      <div className="fixed sm:absolute bottom-20 sm:bottom-full mb-0 sm:mb-3 left-1/2 -translate-x-1/2 z-50 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center gap-1 sm:gap-1.5 bg-[#101015]/95 backdrop-blur-2xl border border-white/20 px-2 sm:px-3 py-2 rounded-2xl sm:rounded-full shadow-[0_12px_45px_rgba(0,0,0,0.85)] max-w-[92vw] overflow-x-auto scrollbar-hide flex-nowrap">
          {MEET_STICKERS.map((sticker) => {
            const isSelected = lastSentEmoji === sticker.emoji
            return (
              <button
                key={sticker.emoji}
                onClick={() => handleSendEmoji(sticker.emoji)}
                title={sticker.label}
                className={`relative w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-xl sm:text-2xl rounded-full transition-all duration-150 cursor-pointer flex-shrink-0 active:scale-90 ${
                  isSelected
                    ? "scale-125 bg-amber-400/30 ring-2 ring-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.6)]"
                    : "hover:scale-125 hover:bg-white/15"
                }`}
              >
                {sticker.emoji}
                {isSelected && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                )}
              </button>
            )
          })}
          <div className="w-px h-6 bg-white/15 mx-0.5 shrink-0" />
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-white/10 cursor-pointer shrink-0 transition-colors"
            title="Close reactions"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  )
}
