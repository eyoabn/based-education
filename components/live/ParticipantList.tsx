"use client"

import { useState } from "react"
import { useParticipants, useLocalParticipant } from "@livekit/components-react"
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  UserX,
  Hand,
  Search,
  Crown,
  ShieldAlert,
  AlertTriangle,
  Check,
  X,
  MoreVertical,
} from "lucide-react"

interface ParticipantListProps {
  roomId: string
  isTeacher?: boolean
  raisedHands: Set<string>
  representatives?: string[]
  onLowerHand?: (identity: string) => void
  onToggleRepresentative?: (identity: string) => void
  onShutCamera?: (identity: string) => void
  onMute?: (identity: string) => void
  onAllowMic?: (identity: string) => void
  onKick?: (identity: string) => void
  onBan?: (identity: string) => void
}

export default function ParticipantList({
  roomId,
  isTeacher,
  raisedHands,
  representatives = [],
  onLowerHand,
  onToggleRepresentative,
  onShutCamera,
  onMute,
  onAllowMic,
  onKick,
  onBan,
}: ParticipantListProps) {
  const participants = useParticipants()
  const { localParticipant } = useLocalParticipant()
  const [search, setSearch] = useState("")
  const [statusNotice, setStatusNotice] = useState<string | null>(null)

  // Local overrides for instant UI responsiveness
  const [mutedOverride, setMutedOverride] = useState<Set<string>>(new Set())
  const [cameraOffOverride, setCameraOffOverride] = useState<Set<string>>(new Set())
  const [selectedStudentForAction, setSelectedStudentForAction] = useState<{
    identity: string
    name: string
  } | null>(null)

  const showNotice = (msg: string) => {
    setStatusNotice(msg)
    setTimeout(() => setStatusNotice(null), 3500)
  }

  const isLocalRep = localParticipant?.identity
    ? representatives.includes(localParticipant.identity)
    : false
  const canModerate = isTeacher || isLocalRep

  const filtered = participants.filter(p =>
    (p.name || p.identity).toLowerCase().includes(search.toLowerCase())
  )

  const handleKickParticipant = async (identity: string, name: string) => {
    if (onKick) {
      onKick(identity)
    } else {
      await fetch("/api/live/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room: roomId, action: "KICK_PARTICIPANT", identity }),
      })
    }
    setSelectedStudentForAction(null)
    showNotice(`Removed ${name} from the session.`)
  }

  const handleBanParticipant = async (identity: string, name: string) => {
    if (onBan) {
      onBan(identity)
    } else {
      await fetch("/api/live/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room: roomId, action: "BAN_PARTICIPANT", identity }),
      })
    }
    setSelectedStudentForAction(null)
    showNotice(`Banned ${name} from this live session.`)
  }

  const handleMuteOne = async (identity: string, name: string) => {
    setMutedOverride(prev => new Set(prev).add(identity))
    if (onMute) {
      onMute(identity)
    } else {
      await fetch("/api/live/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room: roomId, action: "MUTE_PARTICIPANT", identity }),
      })
    }
    showNotice(`Muted microphone for ${name}.`)
  }

  const handleShutCameraOne = async (identity: string, name: string) => {
    setCameraOffOverride(prev => new Set(prev).add(identity))
    if (onShutCamera) {
      onShutCamera(identity)
    } else {
      await fetch("/api/live/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room: roomId, action: "SHUT_CAMERA_PARTICIPANT", identity }),
      })
    }
    showNotice(`Turned off camera for ${name}.`)
  }

  const handleAllowMicOne = async (identity: string, name: string) => {
    setMutedOverride(prev => {
      const next = new Set(prev)
      next.delete(identity)
      return next
    })
    if (onAllowMic) {
      onAllowMic(identity)
    } else {
      await fetch("/api/live/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room: roomId, action: "ALLOW_MIC", identity }),
      })
    }
    showNotice(`Granted speaking permission to ${name}.`)
  }

  const handleToggleRep = async (identity: string, name: string, isCurrentlyRep: boolean) => {
    if (onToggleRepresentative) {
      onToggleRepresentative(identity)
    } else {
      await fetch("/api/live/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room: roomId, action: "TOGGLE_REPRESENTATIVE", identity }),
      })
    }
    showNotice(
      isCurrentlyRep
        ? `Removed ${name} from co-host position.`
        : `Assigned ${name} as Co-Host.`
    )
  }

  const raisedHandParticipants = filtered.filter(p => raisedHands.has(p.identity))
  const others = filtered.filter(p => !raisedHands.has(p.identity))

  return (
    <div className="flex flex-col h-full relative select-none">
      {/* Search */}
      <div className="p-3 border-b border-white/10">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search participants..."
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-2 text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Real-time Moderation Feedback Notification */}
      {statusNotice && (
        <div className="mx-3 mt-2 px-3 py-2 bg-indigo-500/20 border border-indigo-500/30 text-indigo-200 text-xs rounded-xl flex items-center gap-2 animate-in fade-in duration-200">
          <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span className="truncate">{statusNotice}</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Raised Hand Queue */}
        {raisedHandParticipants.length > 0 && (
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-amber-400 mb-2 px-1 flex items-center gap-1.5">
              <Hand className="w-3 h-3" />
              Raised Hands ({raisedHandParticipants.length})
            </h4>
            {raisedHandParticipants.map(p => {
              const name = p.name || p.identity || "Student"
              const isRep = representatives.includes(p.identity)
              const isMuted = mutedOverride.has(p.identity) || !p.isMicrophoneEnabled
              const isCamOff = cameraOffOverride.has(p.identity) || !p.isCameraEnabled

              return (
                <ParticipantRow
                  key={p.identity}
                  p={p}
                  isTeacher={isTeacher}
                  canModerate={canModerate}
                  isLocal={p.identity === localParticipant?.identity}
                  isRaisedHand
                  isRepresentative={isRep}
                  isForceMuted={isMuted}
                  isForceCamOff={isCamOff}
                  onOpenActions={() => setSelectedStudentForAction({ identity: p.identity, name })}
                  onMute={() => handleMuteOne(p.identity, name)}
                  onAllowMic={() => handleAllowMicOne(p.identity, name)}
                  onShutCamera={() => handleShutCameraOne(p.identity, name)}
                  onToggleRep={() => handleToggleRep(p.identity, name, isRep)}
                  onLowerHand={onLowerHand}
                />
              )
            })}
          </div>
        )}

        {/* All Others */}
        <div>
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 px-1 flex items-center gap-2">
            Participants ({others.length})
          </h4>
          {others.map(p => {
            const name = p.name || p.identity || "Student"
            const isRep = representatives.includes(p.identity)
            const isMuted = mutedOverride.has(p.identity) || !p.isMicrophoneEnabled
            const isCamOff = cameraOffOverride.has(p.identity) || !p.isCameraEnabled

            return (
              <ParticipantRow
                key={p.identity}
                p={p}
                isTeacher={isTeacher}
                canModerate={canModerate}
                isLocal={p.identity === localParticipant?.identity}
                isRepresentative={isRep}
                isForceMuted={isMuted}
                isForceCamOff={isCamOff}
                onOpenActions={() => setSelectedStudentForAction({ identity: p.identity, name })}
                onMute={() => handleMuteOne(p.identity, name)}
                onShutCamera={() => handleShutCameraOne(p.identity, name)}
                onToggleRep={() => handleToggleRep(p.identity, name, isRep)}
              />
            )
          })}
        </div>
      </div>

      {/* Remove or Ban Action Confirmation Modal */}
      {selectedStudentForAction && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#121216] border border-white/15 rounded-2xl w-full max-w-xs p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  Manage Participant
                </h4>
              </div>
              <button
                onClick={() => setSelectedStudentForAction(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-center py-1">
              <div className="w-12 h-12 rounded-full bg-indigo-600/30 border border-indigo-500/40 text-white font-bold text-base flex items-center justify-center mx-auto mb-2">
                {selectedStudentForAction.name.charAt(0).toUpperCase()}
              </div>
              <h5 className="font-bold text-slate-100 text-sm">{selectedStudentForAction.name}</h5>
              <p className="text-[11px] text-slate-400 mt-0.5">Select a moderation action:</p>
            </div>

            <div className="space-y-2">
              <button
                onClick={() =>
                  handleKickParticipant(
                    selectedStudentForAction.identity,
                    selectedStudentForAction.name
                  )
                }
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-semibold rounded-xl transition-colors border border-white/10"
              >
                <UserX className="w-4 h-4 text-amber-400" />
                Remove from Session (Kick)
              </button>

              <button
                onClick={() =>
                  handleBanParticipant(
                    selectedStudentForAction.identity,
                    selectedStudentForAction.name
                  )
                }
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-red-600/20 hover:bg-red-600/30 text-red-300 text-xs font-bold rounded-xl transition-colors border border-red-500/30"
              >
                <ShieldAlert className="w-4 h-4 text-red-400" />
                Ban from Class (Block Re-entry)
              </button>
            </div>

            <button
              onClick={() => setSelectedStudentForAction(null)}
              className="w-full py-2 text-slate-400 hover:text-slate-200 text-xs text-center"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ParticipantRow({
  p,
  isTeacher,
  canModerate,
  isLocal,
  isRaisedHand,
  isRepresentative,
  isForceMuted,
  isForceCamOff,
  onOpenActions,
  onMute,
  onAllowMic,
  onShutCamera,
  onToggleRep,
  onLowerHand,
}: {
  p: any
  isTeacher?: boolean
  canModerate?: boolean
  isLocal?: boolean
  isRaisedHand?: boolean
  isRepresentative?: boolean
  isForceMuted?: boolean
  isForceCamOff?: boolean
  onOpenActions: () => void
  onMute: () => void
  onAllowMic?: () => void
  onShutCamera: () => void
  onToggleRep: () => void
  onLowerHand?: (identity: string) => void
}) {
  const isMicActive = !isForceMuted && p.isMicrophoneEnabled
  const isCamActive = !isForceCamOff && p.isCameraEnabled

  return (
    <div className="flex items-center gap-2 px-2.5 py-2 rounded-xl hover:bg-white/5 transition-colors group">
      <div className="relative">
        <div className="w-8 h-8 rounded-full bg-indigo-600/40 border border-white/10 flex items-center justify-center text-xs font-bold text-white shrink-0">
          {(p.name || p.identity || "U").charAt(0).toUpperCase()}
        </div>
        {isRaisedHand && (
          <span className="absolute -top-1 -right-1 text-sm animate-bounce">✋</span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs sm:text-sm font-medium text-slate-200 truncate">
            {p.name || p.identity}
          </span>
          {isLocal && <span className="text-[9px] text-slate-500">(You)</span>}
          {isRepresentative && (
            <span className="flex items-center gap-0.5 text-[9px] bg-amber-500/20 border border-amber-500/30 text-amber-300 px-1.5 py-0.5 rounded font-bold shrink-0">
              <Crown className="w-2.5 h-2.5" /> CO-HOST
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <div
            className={`w-1.5 h-1.5 rounded-full ${
              p.connectionQuality === 1 ? "bg-emerald-400" : "bg-amber-400"
            }`}
          />
          <span className="text-[10px] text-slate-500">
            {p.isSpeaking ? "Speaking" : "Connected"}
          </span>
        </div>
      </div>

      {/* Active Hardware Indicators */}
      <div className="flex items-center gap-1 opacity-70">
        {isMicActive ? (
          <Mic className="w-3.5 h-3.5 text-emerald-400" />
        ) : (
          <MicOff className="w-3.5 h-3.5 text-red-400" />
        )}
        {isCamActive ? (
          <Video className="w-3.5 h-3.5 text-emerald-400" />
        ) : (
          <VideoOff className="w-3.5 h-3.5 text-slate-500" />
        )}
      </div>

      {/* Moderation Controls (Teacher & Co-Host) */}
      {canModerate && !isLocal && (
        <div className="flex items-center gap-0.5 opacity-90 group-hover:opacity-100 transition-opacity">
          {/* Assign / Revoke Co-Host */}
          {isTeacher && (
            <button
              onClick={onToggleRep}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isRepresentative
                  ? "text-amber-400 bg-amber-400/20 hover:bg-amber-400/30"
                  : "text-slate-400 hover:text-amber-400 hover:bg-amber-400/10"
              }`}
              title={isRepresentative ? "Remove Co-Host / Representative" : "Assign Co-Host / Representative"}
            >
              <Crown className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Mute Microphone */}
          <button
            onClick={onMute}
            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-amber-400/10 transition-colors cursor-pointer"
            title="Mute student microphone"
          >
            <MicOff className="w-3.5 h-3.5" />
          </button>

          {/* Shut Camera */}
          <button
            onClick={onShutCamera}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-colors cursor-pointer"
            title="Turn off student camera"
          >
            <VideoOff className="w-3.5 h-3.5" />
          </button>

          {/* Kick / Ban Action Modal Trigger */}
          <button
            onClick={onOpenActions}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-400/10 transition-colors cursor-pointer"
            title="Remove or Ban student"
          >
            <UserX className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {isRaisedHand && (
        <div className="flex items-center gap-1.5">
          {canModerate && onAllowMic && (
            <button
              onClick={onAllowMic}
              className="text-[10px] font-bold text-black bg-emerald-400 hover:bg-emerald-300 px-2.5 py-0.5 rounded-full transition-colors cursor-pointer shadow-sm flex items-center gap-1"
              title="Grant speaking permission to student"
            >
              <Mic className="w-2.5 h-2.5" />
              <span>Allow Mic</span>
            </button>
          )}
          {onLowerHand && (
            <button
              onClick={() => onLowerHand(p.identity)}
              className="text-[10px] text-amber-400 hover:text-amber-300 bg-amber-400/10 hover:bg-amber-400/20 px-2 py-0.5 rounded-full transition-colors cursor-pointer"
            >
              Lower
            </button>
          )}
        </div>
      )}
    </div>
  )
}
