"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { LiveKitRoom, RoomAudioRenderer, useConnectionState } from "@livekit/components-react"
import { ConnectionState } from "livekit-client"
import "@livekit/components-styles"
import LiveGrid from "@/components/live/LiveGrid"
import LiveChat from "@/components/live/LiveChat"
import ParticipantList from "@/components/live/ParticipantList"
import AttendanceHeartbeat from "@/components/live/AttendanceHeartbeat"
import {
  Mic, MicOff, Video, VideoOff, Hand, MessageSquare, Users, LogOut, Clock, Wifi
} from "lucide-react"

interface StudentLivePageProps {
  params: Promise<{ roomId: string }>
}

function DisconnectedModal({ reason }: { reason: "kicked" | "ended" }) {
  const router = useRouter()
  return (
    <div className="fixed inset-0 z-50 bg-[#090D16] flex items-center justify-center">
      <div className="text-center max-w-sm mx-4">
        <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
          {reason === "kicked" ? (
            <LogOut className="w-9 h-9 text-red-400" />
          ) : (
            <div className="w-9 h-9 text-slate-400 flex items-center justify-center text-3xl">🎓</div>
          )}
        </div>
        <h2 className="text-xl font-bold text-white mb-3">
          {reason === "kicked" ? "You Were Removed" : "Class Has Ended"}
        </h2>
        <p className="text-slate-400 text-sm mb-8">
          {reason === "kicked"
            ? "The host has removed you from this live session."
            : "The teacher has ended this live class session. Thanks for attending!"}
        </p>
        <button
          onClick={() => router.push("/dashboard/student")}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors"
        >
          Back to Dashboard
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
  const [isMicEnabled, setIsMicEnabled] = useState(true)
  const [isCamEnabled, setIsCamEnabled] = useState(true)
  const [handRaised, setHandRaised] = useState(false)
  const [activeTab, setActiveTab] = useState<"chat" | "participants">("chat")
  const [raisedHands] = useState<Set<string>>(new Set())
  const [disconnectReason, setDisconnectReason] = useState<"kicked" | "ended" | null>(null)

  useEffect(() => {
    if (connectionState === ConnectionState.Disconnected && !disconnectReason) {
      setDisconnectReason("ended")
    }
  }, [connectionState, disconnectReason])

  const handleLeave = () => router.push("/dashboard/student")

  return (
    <>
      {/* Phase 4: invisible presence tracker — pings every 30s and flags tab-outs */}
      <AttendanceHeartbeat roomId={roomId} enabled={!disconnectReason} />

      {disconnectReason && <DisconnectedModal reason={disconnectReason} />}

      <div className="flex h-screen bg-[#090D16] overflow-hidden">
        {/* Main Stage */}
        <div className="flex-1 flex flex-col min-w-0 relative">
          {/* Top Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-[#090D16]/80 backdrop-blur-sm z-10">
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
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
              <div className="flex items-center gap-2 bg-[#0e1525]/90 backdrop-blur-xl border border-white/10 rounded-2xl px-4 py-3 shadow-2xl shadow-black/60">
                {/* Mic */}
                <button
                  onClick={() => setIsMicEnabled(!isMicEnabled)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all ${
                    isMicEnabled ? "bg-white/10 text-white" : "bg-red-500/20 text-red-400"
                  }`}
                >
                  {isMicEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                  <span className="text-[10px] font-medium opacity-70">{isMicEnabled ? "Mute" : "Unmute"}</span>
                </button>

                {/* Camera */}
                <button
                  onClick={() => setIsCamEnabled(!isCamEnabled)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all ${
                    isCamEnabled ? "bg-white/10 text-white" : "bg-red-500/20 text-red-400"
                  }`}
                >
                  {isCamEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                  <span className="text-[10px] font-medium opacity-70">{isCamEnabled ? "Stop Cam" : "Start Cam"}</span>
                </button>

                <div className="w-px h-10 bg-white/10 mx-1" />

                {/* Raise Hand */}
                <button
                  onClick={() => setHandRaised(!handRaised)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all ${
                    handRaised
                      ? "bg-amber-400/30 text-amber-300 ring-1 ring-amber-400/50"
                      : "bg-white/10 text-white"
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
        <div className="w-80 border-l border-white/5 flex flex-col bg-[#0a0f1e]">
          <div className="flex border-b border-white/5">
            {[
              { id: "chat", label: "Chat", icon: MessageSquare },
              { id: "participants", label: "People", icon: Users },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-semibold transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? "border-indigo-500 text-indigo-400"
                    : "border-transparent text-slate-500 hover:text-slate-300"
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-hidden">
            {activeTab === "chat" ? (
              <LiveChat isTeacher={false} />
            ) : (
              <ParticipantList roomId={roomId} isTeacher={false} raisedHands={raisedHands} />
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
  const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || "wss://placeholder.livekit.cloud"

  useEffect(() => {
    fetch(`/api/live/token?room=${encodeURIComponent(roomId)}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) setError(data.error)
        else setToken(data.token)
      })
      .catch(() => setError("Failed to connect to the live session."))
  }, [roomId])

  if (error) {
    return (
      <div className="h-screen bg-[#090D16] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 font-semibold mb-2">Connection Failed</p>
          <p className="text-slate-500 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  if (!token) {
    return (
      <div className="h-screen bg-[#090D16] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
          <p className="text-slate-400 text-sm">Joining live class...</p>
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
    >
      <StudentRoom roomId={roomId} />
    </LiveKitRoom>
  )
}
