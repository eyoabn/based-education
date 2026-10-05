"use client"

import React, { useState, useEffect, useCallback, memo } from "react"
import { Room } from "livekit-client"
import { Smile, Sparkles, X } from "lucide-react"

export interface LiveReaction {
  id: string
  emoji: string
  senderName: string
  leftOffset: number // percentage 5% to 45%
  drift: number // horizontal sway in px (-30 to +30)
  size: number // font size rem
}

export const MEET_STICKERS = [
  { emoji: "👍", label: "Agree / Thumbs Up" },
  { emoji: "💖", label: "Heart / Love" },
  { emoji: "👏", label: "Clap / Applause" },
  { emoji: "🎉", label: "Party / Celebrate" },
  { emoji: "😂", label: "Joy / Laugh" },
  { emoji: "😮", label: "Surprised / Wow" },
  { emoji: "🤔", label: "Thinking" },
  { emoji: "👎", label: "Disagree / Thumbs Down" },
  { emoji: "💯", label: "100 / Perfect" },
  { emoji: "🔥", label: "Fire / Amazing" },
]

interface FloatingReactionsProps {
  room?: Room | null
  currentUserName: string
}

export default function FloatingReactions({ room, currentUserName }: FloatingReactionsProps) {
  const [reactions, setReactions] = useState<LiveReaction[]>([])

  const spawnReaction = useCallback((emoji: string, senderName: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    // Google Meet style: reactions float up from bottom left-to-center
    const leftOffset = 8 + Math.random() * 32 // 8% to 40%
    const drift = (Math.random() - 0.5) * 60 // -30px to +30px
    const size = 1.8 + Math.random() * 0.6 // 1.8rem to 2.4rem

    const newReaction: LiveReaction = {
      id,
      emoji,
      senderName,
      leftOffset,
      drift,
      size,
    }

    setReactions((prev) => [...prev.slice(-30), newReaction])

    // Automatically remove reaction after 3.2s
    setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== id))
    }, 3200)
  }, [])

  // Listen to incoming WebRTC data packets on topic 'live-reaction'
  useEffect(() => {
    if (!room) return

    const handleData = (payload: Uint8Array, participant?: any, kind?: any, topic?: string) => {
      if (topic === "live-reaction") {
        try {
          const text = new TextDecoder().decode(payload)
          const data = JSON.parse(text)
          if (data?.emoji) {
            const sender = data.senderName || participant?.name || participant?.identity || "Participant"
            spawnReaction(data.emoji, sender)
          }
        } catch {}
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
            className="drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)] select-none transition-transform"
            style={{ fontSize: `${reaction.size}rem` }}
          >
            {reaction.emoji}
          </span>

          {/* Sender Name Pill (Google Meet Style) */}
          <div className="mt-1 px-2 py-0.5 rounded-full bg-black/75 backdrop-blur-md border border-white/15 text-[11px] font-medium text-slate-200 shadow-lg whitespace-nowrap">
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
    setTimeout(() => setLastSentEmoji(null), 500)

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
          emoji,
          senderName: currentUserName,
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
    <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 z-50 animate-in fade-in zoom-in-95 duration-150">
      <div className="flex items-center gap-1 sm:gap-1.5 bg-black/90 backdrop-blur-2xl border border-white/20 px-2 sm:px-3 py-2 rounded-2xl sm:rounded-full shadow-[0_10px_35px_rgba(0,0,0,0.8)] overflow-x-auto max-w-[90vw] scrollbar-hide flex-wrap justify-center sm:flex-nowrap">
        {MEET_STICKERS.map((sticker) => {
          const isSelected = lastSentEmoji === sticker.emoji
          return (
            <button
              key={sticker.emoji}
              onClick={() => handleSendEmoji(sticker.emoji)}
              title={sticker.label}
              className={`relative w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-xl sm:text-2xl rounded-full transition-all duration-150 cursor-pointer flex-shrink-0 ${
                isSelected
                  ? "scale-130 bg-amber-400/30 ring-2 ring-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.6)]"
                  : "hover:scale-130 active:scale-95 hover:-translate-y-1 hover:bg-white/15"
              }`}
            >
              {sticker.emoji}
              {isSelected && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              )}
            </button>
          )
        })}
        <button
          onClick={onClose}
          className="ml-1 p-1 text-slate-400 hover:text-white rounded-full hover:bg-white/10 cursor-pointer flex-shrink-0"
          title="Close reactions"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
