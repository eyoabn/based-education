"use client"

import { useState, useEffect, useRef, use } from "react"
import { useRouter } from "next/navigation"
import { LiveKitRoom, RoomAudioRenderer, useConnectionState, useRoomContext, useRoomInfo } from "@livekit/components-react"
import { ConnectionState, DataPacket_Kind } from "livekit-client"
import "@livekit/components-styles"
import LiveGrid from "@/components/live/LiveGrid"
import LiveChat from "@/components/live/LiveChat"
import ParticipantList from "@/components/live/ParticipantList"
import AttendanceHeartbeat from "@/components/live/AttendanceHeartbeat"
import SharedMediaPlayer, { MediaState } from "@/components/live/SharedMediaPlayer"
import {
  Mic, MicOff, Video, VideoOff, Hand, MessageSquare, Users, LogOut, Clock, Wifi, Crown
} from "lucide-react"

interface StudentLivePageProps {
  params: Promise<{ roomId: string }>
}

function DisconnectedModal({ reason }: { reason: "kicked" | "ended" }) {
  const router = useRouter()
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center">
      <div className="text-center max-w-sm mx-4 bg-[#0A0A0A] p-8 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden">
        <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
          {reason === "kicked" ? (
            <LogOut className="w-9 h-9 text-red-400" />
          ) : (
            <div className="w-9 h-9 text-primary flex items-center justify-center text-3xl">✦</div>
          )}
        </div>
        <h2 className="text-xl font-bold text-white mb-3">
          {reason === "kicked" ? "You Were Removed" : "Session Has Ended"}
        </h2>
        <p className="text-slate-400 text-sm mb-8">
          {reason === "kicked"
            ? "The host has removed you from this live session."
            : "The guide has ended this live session. Peace be with you."}
        </p>
        <button
          onClick={() => router.push("/dashboard/student")}
          className="px-6 py-3 bg-primary hover:bg-[#FCE69B] text-black font-bold rounded-xl transition-all shadow-lg shadow-primary/20"
        >
          Return Home
        </button>
      </div>
    </div>
  )
}

function LiveDuration() {
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => setSeconds(s => s + 1), 1000)
    return () => clearInterval(interval)
  }, [])
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return <span className="font-mono">{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}</span>
}

function StudentRoom({ roomId }: { roomId: string }) {
  const router = useRouter()
  const connectionState = useConnectionState()
  const hasConnectedRef = useRef(false)

  const [isMicEnabled, setIsMicEnabled] = useState(true)
  const [isCamEnabled, setIsCamEnabled] = useState(true)
  const [handRaised, setHandRaised] = useState(false)
  const [activeTab, setActiveTab] = useState<"chat" | "participants">("chat")
  const [raisedHands, setRaisedHands] = useState<Set<string>>(new Set())
  const [disconnectReason, setDisconnectReason] = useState<"kicked" | "ended" | null>(null)
  const room = useRoomContext()
  const { metadata } = useRoomInfo()
  const [isChatDisabled, setIsChatDisabled] = useState(false)
  const [representatives, setRepresentatives] = useState<string[]>([])
  const [mediaState, setMediaState] = useState<MediaState | null>(null)

  const isRepresentative = room.localParticipant ? representatives.includes(room.localParticipant.identity) : false

  useEffect(() => {
    if (metadata) {
      try {
        const parsed = JSON.parse(metadata)
        setIsChatDisabled(!!parsed.chatDisabled)
        setRepresentatives(parsed.representatives || [])
        setMediaState(parsed.mediaState || null)
      } catch (e) {}
    }
  }, [metadata])

  useEffect(() => {
    if (connectionState === ConnectionState.Connected) {
      hasConnectedRef.current = true
      
      const handleData = (payload: Uint8Array, participant?: any, kind?: any, topic?: string) => {
        if (topic === "raise-hand" && participant) {
          const isRaised = new TextDecoder().decode(payload) === "true"
          setRaisedHands(prev => {
            const next = new Set(prev)
            if (isRaised) next.add(participant.identity)
            else next.delete(participant.identity)
            return next
          })
        }
      }
      
      room.on("dataReceived", handleData)
      return () => { room.off("dataReceived", handleData) }
    } else if (connectionState === ConnectionState.Disconnected && hasConnectedRef.current && !disconnectReason) {
      setDisconnectReason("ended")
    }
  }, [connectionState, disconnectReason, room])

  const toggleHand = async () => {
    const newState = !handRaised
    setHandRaised(newState)
    if (room.localParticipant) {
      const payload = new TextEncoder().encode(newState ? "true" : "false")
      await room.localParticipant.publishData(payload, { reliable: true, topic: "raise-hand" })
    }
  }

  const handleLeave = () => router.push("/dashboard/student")

  return (
    <>
      <AttendanceHeartbeat roomId={roomId} enabled={!disconnectReason} />

      {disconnectReason && <DisconnectedModal reason={disconnectReason} />}

      {connectionState === ConnectionState.Reconnecting && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-xl flex items-center justify-center">
          <div className="bg-[#0A0A0A] border border-white/10 rounded-3xl p-8 shadow-2xl flex flex-col items-center max-w-xs mx-4 text-center relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
             <div className="w-12 h-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin mb-4" />
             <h3 className="text-white font-bold mb-1 text-lg">Reconnecting...</h3>
             <p className="text-slate-400 text-sm">Restoring your Sanctuary connection.</p>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row h-[100dvh] bg-black overflow-hidden">
        {/* Main Stage */}
        <div className="flex-1 flex flex-col min-w-0 relative">
          {/* Top Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-black/40 backdrop-blur-3xl z-10">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 border border-red-500/30 rounded-full">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs font-bold text-red-400 uppercase tracking-wide">LIVE</span>
              </div>
              <div>
                <h1 className="font-bold text-white text-sm">{decodeURIComponent(roomId)}</h1>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Clock className="w-3 h-3" />
                  <LiveDuration />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isRepresentative && (
                <span className="flex items-center gap-1 text-xs font-bold text-amber-300 bg-amber-500/20 border border-amber-500/30 px-2.5 py-1 rounded-full">
                  <Crown className="w-3.5 h-3.5" /> Co-Host
                </span>
              )}
              <SharedMediaPlayer
                mediaState={mediaState}
                isHostOrRep={isRepresentative}
                onUpdateMediaState={async (newState) => {
                  await fetch("/api/live/control", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ room: roomId, action: "UPDATE_MEDIA", mediaState: newState }),
                  })
                }}
              />
              <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                <Wifi className="w-3.5 h-3.5" />
                <span className="font-semibold">HD</span>
              </div>
              <button
                onClick={handleLeave}
                className="flex items-center gap-2 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-lg text-red-400 text-xs font-semibold transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                Leave
              </button>
            </div>
          </div>

          {/* Video Grid */}
          <div className="flex-1 relative overflow-hidden">
            <RoomAudioRenderer />
            <LiveGrid isTeacher={false} />

            {/* Student Floating Controls */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 w-max max-w-[95vw]">
              <div className="flex items-center gap-1 sm:gap-2 bg-black/80 backdrop-blur-3xl border border-white/10 rounded-3xl px-2 sm:px-4 py-2 sm:py-3 shadow-2xl shadow-black/80 overflow-x-auto no-scrollbar">
                {/* Mic */}
                <button
                  onClick={() => setIsMicEnabled(!isMicEnabled)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-2xl transition-all ${
                    isMicEnabled ? "bg-white/5 hover:bg-white/10 text-white" : "bg-red-500/20 text-red-400"
                  }`}
                >
                  {isMicEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                  <span className="text-[10px] font-medium opacity-70">{isMicEnabled ? "Mute" : "Unmute"}</span>
                </button>

                {/* Camera */}
                <button
                  onClick={() => setIsCamEnabled(!isCamEnabled)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-2xl transition-all ${
                    isCamEnabled ? "bg-white/5 hover:bg-white/10 text-white" : "bg-red-500/20 text-red-400"
                  }`}
                >
                  {isCamEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                  <span className="text-[10px] font-medium opacity-70">{isCamEnabled ? "Stop Cam" : "Start Cam"}</span>
                </button>

                <div className="w-px h-10 bg-white/10 mx-1" />

                {/* Raise Hand */}
                <button
                  onClick={toggleHand}
                  className={`flex flex-col items-center gap-1 p-3 rounded-2xl transition-all ${
                    handRaised
                      ? "bg-primary/20 text-primary ring-1 ring-primary/40 shadow-[0_0_15px_rgba(212,175,55,0.2)]"
                      : "bg-white/5 hover:bg-white/10 text-white"
                  }`}
                >
                  <Hand className={`w-5 h-5 ${handRaised ? "animate-bounce" : ""}`} />
                  <span className="text-[10px] font-medium opacity-70">{handRaised ? "Hand Raised" : "Raise Hand"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side Panel */}
        <div className="h-[40dvh] lg:h-80 lg:min-w-[320px] lg:h-auto border-t lg:border-t-0 lg:border-l border-white/5 flex flex-col bg-[#050505] shrink-0">
          <div className="flex border-b border-white/5">
            {[
              { id: "chat", label: "Chat", icon: MessageSquare },
              { id: "participants", label: "People", icon: Users },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-xs font-bold transition-all border-b-2 ${
                  activeTab === tab.id
                    ? "border-primary text-primary bg-primary/5"
                    : "border-transparent text-slate-500 hover:text-slate-300 hover:bg-white/5"
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-hidden">
            {activeTab === "chat" ? (
              <LiveChat isTeacher={false} isDisabled={isChatDisabled} />
            ) : (
              <ParticipantList roomId={roomId} isTeacher={false} raisedHands={raisedHands} representatives={representatives} />
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default function StudentLivePage({ params }: StudentLivePageProps) {
  const { roomId } = use(params)
  const [token, setToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [livekitUrl, setLivekitUrl] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/live/token?room=${encodeURIComponent(roomId)}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) setError(data.error)
        else {
          setToken(data.token)
          setLivekitUrl(data.livekitUrl || process.env.NEXT_PUBLIC_LIVEKIT_URL || "wss://placeholder.livekit.cloud")
        }
      })
      .catch(() => setError("Failed to connect to the live session."))
  }, [roomId])

  if (error) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="text-center p-8 bg-[#0A0A0A] rounded-3xl border border-red-500/20 max-w-sm">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
            <span className="text-red-500 font-bold text-xl">!</span>
          </div>
          <p className="text-red-400 font-bold mb-2 text-lg">Connection Failed</p>
          <p className="text-slate-500 text-sm leading-relaxed">{error}</p>
        </div>
      </div>
    )
  }

  if (!token || !livekitUrl) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-6 p-8 bg-[#0A0A0A] border border-white/5 rounded-3xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
          <div className="w-14 h-14 rounded-full border-[3px] border-primary/20 border-t-primary animate-spin" />
          <div className="text-center">
            <h3 className="text-white font-bold text-lg mb-1">Preparing Sanctuary</h3>
            <p className="text-slate-400 text-sm">Joining live session...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <LiveKitRoom
      token={token}
      serverUrl={livekitUrl}
      connect={!token.includes("mock")}
      video={true}
      audio={true}
      options={{ 
        adaptiveStream: true, 
        dynacast: true,
        audioCaptureDefaults: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      }}
    >
      <StudentRoom roomId={roomId} />
    </LiveKitRoom>
  )
}
