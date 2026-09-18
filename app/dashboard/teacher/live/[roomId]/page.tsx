"use client"

import { useState, useEffect, useCallback, use } from "react"
import { useRouter } from "next/navigation"
import { LiveKitRoom, useLocalParticipant, RoomAudioRenderer, useRoomInfo, useRoomContext, useConnectionState } from "@livekit/components-react"
import { ConnectionState, DataPacket_Kind } from "livekit-client"
import "@livekit/components-styles"
import LiveGrid from "@/components/live/LiveGrid"
import HostControlBar from "@/components/live/HostControlBar"
import ParticipantList from "@/components/live/ParticipantList"
import LiveChat from "@/components/live/LiveChat"
import SharedMediaPlayer, { MediaState } from "@/components/live/SharedMediaPlayer"
import { Wifi, Users, MessageSquare, Clock, LogOut, Maximize2, Minimize2, PanelRightClose, PanelRightOpen, X, Hand } from "lucide-react"

interface TeacherLivePageProps {
  params: Promise<{ roomId: string }>
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
  const connectionState = useConnectionState()
  const [activeTab, setActiveTab] = useState<"chat" | "participants">("chat")
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [raisedHands, setRaisedHands] = useState<Set<string>>(new Set())
  const [handRaiseNotification, setHandRaiseNotification] = useState<{ identity: string, name: string } | null>(null)
  const { localParticipant } = useLocalParticipant()
  const [isMicEnabled, setIsMicEnabled] = useState(true)
  const [isCamEnabled, setIsCamEnabled] = useState(true)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const room = useRoomContext()
  const { metadata } = useRoomInfo()
  const [isChatDisabled, setIsChatDisabled] = useState(false)
  const [representatives, setRepresentatives] = useState<string[]>([])
  const [mediaState, setMediaState] = useState<MediaState | null>(null)

  // Fullscreen change listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener("fullscreenchange", handleFsChange)
    return () => document.removeEventListener("fullscreenchange", handleFsChange)
  }, [])

  // Unload / pagehide safeguard: if teacher closes tab or navigates away, shut down the live room
  useEffect(() => {
    const handleUnload = () => {
      navigator.sendBeacon?.(
        "/api/live/control",
        new Blob([JSON.stringify({ room: roomId, action: "SHUTDOWN_ROOM" })], {
          type: "application/json",
        })
      )
    }
    window.addEventListener("pagehide", handleUnload)
    window.addEventListener("beforeunload", handleUnload)
    return () => {
      window.removeEventListener("pagehide", handleUnload)
      window.removeEventListener("beforeunload", handleUnload)
    }
  }, [roomId])

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
    const handleData = (payload: Uint8Array, participant?: any, kind?: any, topic?: string) => {
      if (topic === "raise-hand" && participant) {
        const isRaised = new TextDecoder().decode(payload) === "true"
        setRaisedHands(prev => {
          const next = new Set(prev)
          if (isRaised) next.add(participant.identity)
          else next.delete(participant.identity)
          return next
        })
        if (isRaised) {
          setHandRaiseNotification({
            identity: participant.identity,
            name: participant.name || participant.identity || "Student"
          })
        }
      }
    }
    room.on("dataReceived", handleData)
    return () => { room.off("dataReceived", handleData) }
  }, [room])

  const handleMicToggle = useCallback(async () => {
    try {
      await localParticipant?.setMicrophoneEnabled(!isMicEnabled)
    } catch {}
    setIsMicEnabled(!isMicEnabled)
  }, [isMicEnabled, localParticipant])

  const handleCamToggle = useCallback(async () => {
    try {
      await localParticipant?.setCameraEnabled(!isCamEnabled)
    } catch {}
    setIsCamEnabled(!isCamEnabled)
  }, [isCamEnabled, localParticipant])

  const handleScreenShare = useCallback(async () => {
    try {
      await localParticipant?.setScreenShareEnabled(!isScreenSharing)
    } catch {}
    setIsScreenSharing(!isScreenSharing)
  }, [isScreenSharing, localParticipant])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {})
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {})
    }
  }

  const toggleTab = (tab: "chat" | "participants") => {
    if (isPanelOpen && activeTab === tab) {
      setIsPanelOpen(false)
    } else {
      setActiveTab(tab)
      setIsPanelOpen(true)
    }
  }

  const handleMuteAll = async () => {
    await fetch("/api/live/control", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room: roomId, action: "MUTE_ALL" }),
    })
  }

  const handleDisableCameras = async () => {
    await fetch("/api/live/control", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room: roomId, action: "DISABLE_CAMERAS_ALL" }),
    })
  }

  const handleDisableChat = async () => {
    await fetch("/api/live/control", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room: roomId, action: "TOGGLE_CHAT", chatDisabled: !isChatDisabled }),
    })
  }

  const handleUpdateMediaState = async (newMediaState: MediaState | null) => {
    await fetch("/api/live/control", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room: roomId, action: "UPDATE_MEDIA", mediaState: newMediaState }),
    })
  }

  const handleShutdown = async () => {
    await fetch("/api/live/control", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room: roomId, action: "SHUTDOWN_ROOM" }),
    }).catch(() => {})
    router.push("/dashboard/teacher")
  }

  return (
    <>
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

      {/* Floating Hand-Raise Alert for Teacher */}
      {handRaiseNotification && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-amber-500 text-black px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-md animate-in slide-in-from-top-4 duration-300 font-medium text-sm">
          <span className="text-xl">✋</span>
          <span><strong>{handRaiseNotification.name}</strong> has raised their hand!</span>
          <button
            onClick={() => {
              setRaisedHands(prev => { const next = new Set(prev); next.delete(handRaiseNotification.identity); return next })
              setHandRaiseNotification(null)
            }}
            className="ml-2 px-3 py-1 bg-black/15 hover:bg-black/25 rounded-lg text-xs font-bold transition-colors"
          >
            Lower Hand
          </button>
          <button
            onClick={() => setHandRaiseNotification(null)}
            className="p-1 hover:bg-black/10 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex flex-col lg:flex-row h-[100dvh] w-screen bg-black overflow-hidden select-none">
        {/* Main Stage (Google Meet Layout) */}
        <div className="flex-1 flex flex-col min-w-0 relative h-full">
          {/* Top Header Bar */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-black/60 backdrop-blur-2xl border-b border-white/10 z-10">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-3 py-1 bg-red-600/20 border border-red-500/30 rounded-full">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs font-bold text-red-400 uppercase tracking-wide">LIVE</span>
              </div>
              <div>
                <h1 className="font-bold text-white text-sm truncate max-w-[150px] sm:max-w-xs">{decodeURIComponent(roomId)}</h1>
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <Clock className="w-3 h-3" />
                  <LiveDuration />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <SharedMediaPlayer
                mediaState={mediaState}
                isHostOrRep={true}
                onUpdateMediaState={handleUpdateMediaState}
              />
              
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 text-xs text-emerald-400">
                <Wifi className="w-3.5 h-3.5" />
                <span className="font-semibold text-[11px]">HD</span>
              </div>

              {/* Fullscreen Button */}
              <button
                onClick={toggleFullscreen}
                className="p-2 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl border border-white/10 transition-colors"
                title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              {/* Toggle People Button */}
              <button
                onClick={() => toggleTab("participants")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                  isPanelOpen && activeTab === "participants"
                    ? "bg-primary text-black border-primary font-bold shadow-lg shadow-primary/20"
                    : "bg-white/5 text-slate-300 hover:bg-white/10 border-white/10"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">People</span>
                {raisedHands.size > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-black text-[10px] font-bold">
                    ✋ {raisedHands.size}
                  </span>
                )}
              </button>

              {/* Toggle Chat Button */}
              <button
                onClick={() => toggleTab("chat")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                  isPanelOpen && activeTab === "chat"
                    ? "bg-primary text-black border-primary font-bold shadow-lg shadow-primary/20"
                    : "bg-white/5 text-slate-300 hover:bg-white/10 border-white/10"
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Chat</span>
              </button>

              {/* End Stream */}
              <button
                onClick={handleShutdown}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-xl text-red-400 text-xs font-semibold transition-colors"
                title="Leave and End Stream for all students"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">End Stream</span>
              </button>
            </div>
          </div>

          {/* Video Grid */}
          <div className="flex-1 relative overflow-hidden bg-black flex items-center justify-center">
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
              onDisableCameras={handleDisableCameras}
              onDisableChat={handleDisableChat}
              isChatDisabled={isChatDisabled}
              onShutdown={handleShutdown}
            />
          </div>
        </div>

        {/* Collapsible Right Side Panel */}
        {isPanelOpen && (
          <div className="w-full lg:w-80 h-[45dvh] lg:h-full border-t lg:border-t-0 lg:border-l border-white/10 flex flex-col bg-[#09090c] shrink-0 z-20 animate-in slide-in-from-right duration-200">
            {/* Panel Tabs */}
            <div className="flex items-center justify-between border-b border-white/10 px-2">
              <div className="flex flex-1">
                {[
                  { id: "chat", label: "Chat", icon: MessageSquare },
                  { id: "participants", label: `People (${raisedHands.size ? `✋ ${raisedHands.size}` : ""})`, icon: Users },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-xs font-bold transition-all border-b-2 ${
                      activeTab === tab.id
                        ? "border-primary text-primary bg-primary/5"
                        : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5"
                    }`}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setIsPanelOpen(false)}
                className="p-2 text-slate-400 hover:text-white rounded-lg transition-colors ml-1"
                title="Close panel"
              >
                <PanelRightClose className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-hidden">
              {activeTab === "chat" ? (
                <LiveChat isTeacher isDisabled={isChatDisabled} />
              ) : (
                <ParticipantList
                  roomId={roomId}
                  isTeacher
                  raisedHands={raisedHands}
                  representatives={representatives}
                  onLowerHand={(identity) => {
                    setRaisedHands(prev => { const next = new Set(prev); next.delete(identity); return next })
                  }}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default function TeacherLivePage({ params }: TeacherLivePageProps) {
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
            <p className="text-slate-400 text-sm">Setting up your live studio...</p>
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
      <TeacherRoom roomId={roomId} />
    </LiveKitRoom>
  )
}
