"use client"

import { useState } from "react"
import { useParticipants, useLocalParticipant } from "@livekit/components-react"
import { Mic, MicOff, VideoOff, UserX, Hand, Search, Crown } from "lucide-react"

interface ParticipantListProps {
  roomId: string
  isTeacher?: boolean
  raisedHands: Set<string>
  representatives?: string[]
  onLowerHand?: (identity: string) => void
  onToggleRepresentative?: (identity: string) => void
  onShutCamera?: (identity: string) => void
}

export default function ParticipantList({
  roomId,
  isTeacher,
  raisedHands,
  representatives = [],
  onLowerHand,
  onToggleRepresentative,
  onShutCamera,
}: ParticipantListProps) {
  const participants = useParticipants()
  const { localParticipant } = useLocalParticipant()
  const [search, setSearch] = useState("")

  const isLocalRep = localParticipant?.identity ? representatives.includes(localParticipant.identity) : false
  const canModerate = isTeacher || isLocalRep

  const filtered = participants.filter(p =>
    (p.name || p.identity).toLowerCase().includes(search.toLowerCase())
  )

  const handleKick = async (identity: string) => {
    await fetch("/api/live/control", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room: roomId, action: "KICK_PARTICIPANT", identity }),
    })
  }

  const handleMuteOne = async (identity: string) => {
    await fetch("/api/live/control", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room: roomId, action: "MUTE_PARTICIPANT", identity }),
    })
  }

  const handleShutCameraOne = async (identity: string) => {
    if (onShutCamera) {
      onShutCamera(identity)
    } else {
      await fetch("/api/live/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room: roomId, action: "SHUT_CAMERA_PARTICIPANT", identity }),
      })
    }
  }

  const handleToggleRep = async (identity: string) => {
    if (onToggleRepresentative) {
      onToggleRepresentative(identity);
    } else {
      await fetch("/api/live/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room: roomId, action: "TOGGLE_REPRESENTATIVE", identity }),
      })
    }
  }

  const raisedHandParticipants = filtered.filter(p => raisedHands.has(p.identity))
  const others = filtered.filter(p => !raisedHands.has(p.identity))

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-3 border-b border-white/10">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search participants..."
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Raised Hand Queue */}
        {raisedHandParticipants.length > 0 && (
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-amber-400 mb-2 px-1 flex items-center gap-1.5">
              <Hand className="w-3 h-3" />
              Raised Hands ({raisedHandParticipants.length})
            </h4>
            {raisedHandParticipants.map(p => (
              <ParticipantRow
                key={p.identity}
                p={p}
                isTeacher={isTeacher}
                canModerate={canModerate}
                isLocal={p.identity === localParticipant?.identity}
                isRaisedHand
                isRepresentative={representatives.includes(p.identity)}
                onKick={handleKick}
                onMute={handleMuteOne}
                onShutCamera={handleShutCameraOne}
                onToggleRep={handleToggleRep}
                onLowerHand={onLowerHand}
              />
            ))}
          </div>
        )}

        {/* All Others */}
        <div>
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 px-1 flex items-center gap-2">
            Participants ({others.length})
          </h4>
          {others.map(p => (
            <ParticipantRow
              key={p.identity}
              p={p}
              isTeacher={isTeacher}
              canModerate={canModerate}
              isLocal={p.identity === localParticipant?.identity}
              isRepresentative={representatives.includes(p.identity)}
              onKick={handleKick}
              onMute={handleMuteOne}
              onShutCamera={handleShutCameraOne}
              onToggleRep={handleToggleRep}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function ParticipantRow({ p, isTeacher, canModerate, isLocal, isRaisedHand, isRepresentative, onKick, onMute, onShutCamera, onToggleRep, onLowerHand }: any) {
  return (
    <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-white/5 transition-colors group">
      <div className="relative">
        <div className="w-8 h-8 rounded-full bg-indigo-600/40 flex items-center justify-center text-xs font-bold text-white shrink-0">
          {(p.name || p.identity || "U").charAt(0).toUpperCase()}
        </div>
        {isRaisedHand && (
          <span className="absolute -top-1 -right-1 text-base animate-bounce">✋</span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-slate-200 truncate">{p.name || p.identity}</span>
          {isLocal && <span className="text-[9px] text-slate-500">(You)</span>}
          {isRepresentative && (
            <span className="flex items-center gap-0.5 text-[9px] bg-amber-500/20 border border-amber-500/30 text-amber-300 px-1.5 py-0.5 rounded font-bold">
              <Crown className="w-2.5 h-2.5" /> CO-HOST
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <div className={`w-1.5 h-1.5 rounded-full ${p.connectionQuality === 1 ? "bg-emerald-400" : "bg-amber-400"}`} />
          <span className="text-[10px] text-slate-500">{p.isSpeaking ? "Speaking" : "Listening"}</span>
        </div>
      </div>

      {/* Status Icons */}
      <div className="flex items-center gap-1 opacity-60">
        {p.isMicrophoneEnabled ? (
          <Mic className="w-3.5 h-3.5 text-emerald-400" />
        ) : (
          <MicOff className="w-3.5 h-3.5 text-red-400" />
        )}
      </div>

      {/* Moderation Actions (for Instructor & Co-Host) */}
      {canModerate && !isLocal && (
        <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
          {isTeacher && (
            <button
              onClick={() => onToggleRep(p.identity)}
              className={`p-1.5 rounded-lg transition-colors ${
                isRepresentative
                  ? "text-amber-400 bg-amber-400/20 hover:bg-amber-400/30"
                  : "text-slate-400 hover:text-amber-400 hover:bg-amber-400/10"
              }`}
              title={isRepresentative ? "Remove Co-Host / Admin" : "Make Co-Host / Admin"}
            >
              <Crown className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => onMute(p.identity)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-amber-400/10 transition-colors"
            title="Mute Participant Microphone"
          >
            <MicOff className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onShutCamera(p.identity)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-colors"
            title="Turn Off Participant Camera"
          >
            <VideoOff className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onKick(p.identity)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-colors"
            title="Remove from Session"
          >
            <UserX className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {isRaisedHand && onLowerHand && (
        <button
          onClick={() => onLowerHand(p.identity)}
          className="text-[10px] text-amber-400 hover:text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded-full transition-colors"
        >
          Lower
        </button>
      )}
    </div>
  )
}
