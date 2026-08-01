"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { LiveKitRoom, useLocalParticipant, RoomAudioRenderer } from "@livekit/components-react"
import "@livekit/components-styles"
import LiveGrid from "@/components/live/LiveGrid"
import HostControlBar from "@/components/live/HostControlBar"
import ParticipantList from "@/components/live/ParticipantList"
import LiveChat from "@/components/live/LiveChat"
import { Wifi, Users, MessageSquare, Clock } from "lucide-react"

interface TeacherLivePageProps {
  params: { roomId: string }
}

function LiveDuration() {
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => setSeconds(s => s + 1), 1000)
    return () => clearInterval(interval)
  }, [])
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return (
    <span className="font-mono tabular-nums">
      {h > 0 && `${h}:`}{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
    </span>
  )
}

function TeacherRoom({ roomId }: { roomId: string }) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<"chat" | "participants">("chat")
  const [raisedHands, setRaisedHands] = useState<Set<string>>(new Set())
  const { localParticipant } = useLocalParticipant()
  const [isMicEnabled, setIsMicEnabled] = useState(true)
  const [isCamEnabled, setIsCamEnabled] = useState(true)
  const [isScreenSharing, setIsScreenSharing] = useState(false)

  const handleMicToggle = useCallback(async () => {
    await localParticipant.setMicrophoneEnabled(!isMicEnabled)
    setIsMicEnabled(!isMicEnabled)
  }, [isMicEnabled, localParticipant])

  const handleCamToggle = useCallback(async () => {
    await localParticipant.setCameraEnabled(!isCamEnabled)
    setIsCamEnabled(!isCamEnabled)
  }, [isCamEnabled, localParticipant])

  const handleScreenShare = useCallback(async () => {
    await localParticipant.setScreenShareEnabled(!isScreenSharing)
    setIsScreenSharing(!isScreenSharing)
  }, [isScreenSharing, localParticipant])

  const handleMuteAll = async () => {
    await fetch("/api/live/control", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room: roomId, action: "MUTE_ALL" }),
    })
  }

  const handleShutdown = async () => {
    await fetch("/api/live/control", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room: roomId, action: "SHUTDOWN_ROOM" }),
    })
    router.push("/dashboard/teacher")
  }

  return (
    <div className="flex h-screen bg-[#090D16] overflow-hidden">
      {/* Main Stage */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-[#090D16]/80 backdrop-blur-sm z-10">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 border border-red-500/30 rounded-full">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs font-bold text-red-400 uppercase tracking-wide">LIVE</span>
              </div>
            </div>
            <div>
              <h1 className="font-bold text-white text-sm">{decodeURIComponent(roomId)}</h1>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Clock className="w-3 h-3" />
                <LiveDuration />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-xs text-emerald-400">
              <Wifi className="w-3.5 h-3.5" />
              <span className="font-semibold">HD</span>
            </div>
            <button
              onClick={() => setActiveTab("participants")}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-slate-300 text-xs font-semibold transition-colors"
            >
              <Users className="w-3.5 h-3.5" />
              Participants
            </button>
            <button
              onClick={() => setActiveTab("chat")}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-slate-300 text-xs font-semibold transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Chat
            </button>
          </div>
        </div>

        {/* Video Grid */}
        <div className="flex-1 relative overflow-hidden">
          <RoomAudioRenderer />
          <LiveGrid isTeacher />
          <HostControlBar
            roomId={roomId}
            isMicEnabled={isMicEnabled}
            isCamEnabled={isCamEnabled}
            isScreenSharing={isScreenSharing}
            onMicToggle={handleMicToggle}
            onCamToggle={handleCamToggle}
            onScreenShareToggle={handleScreenShare}
            onMuteAll={handleMuteAll}
            onShutdown={handleShutdown}
          />
        </div>
      </div>

      {/* Right Side Panel */}
      <div className="w-80 border-l border-white/5 flex flex-col bg-[#0a0f1e]">
        {/* Panel Tabs */}
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

        {/* Panel Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === "chat" ? (
            <LiveChat isTeacher />
          ) : (
            <ParticipantList
              roomId={roomId}
              isTeacher
              raisedHands={raisedHands}
              onLowerHand={(identity) => setRaisedHands(prev => { const next = new Set(prev); next.delete(identity); return next })}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default function TeacherLivePage({ params }: TeacherLivePageProps) {
  const [token, setToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || "wss://placeholder.livekit.cloud"

  useEffect(() => {
    fetch(`/api/live/token?room=${encodeURIComponent(params.roomId)}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) setError(data.error)
        else setToken(data.token)
      })
      .catch(() => setError("Failed to connect to the live session."))
  }, [params.roomId])

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
          <p className="text-slate-400 text-sm">Setting up your live studio...</p>
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
      <TeacherRoom roomId={params.roomId} />
    </LiveKitRoom>
  )
}
