"use client"

import { useState, useEffect, useRef, use } from "react"
import { useRouter } from "next/navigation"
import { LiveKitRoom, RoomAudioRenderer, useConnectionState, useRoomContext, useRoomInfo, useLocalParticipant } from "@livekit/components-react"
import { ConnectionState, DataPacket_Kind, Track } from "livekit-client"
import "@livekit/components-styles"
import LiveGrid from "@/components/live/LiveGrid"
import LiveChat from "@/components/live/LiveChat"
import ParticipantList from "@/components/live/ParticipantList"
import AttendanceHeartbeat from "@/components/live/AttendanceHeartbeat"
import SharedMediaPlayer, { MediaState } from "@/components/live/SharedMediaPlayer"
import {
  Mic, MicOff, Video, VideoOff, Hand, MessageSquare, Users, LogOut, Clock, Wifi, Crown,
  Maximize2, Minimize2, PanelRightClose, PanelRightOpen, MonitorUp, MonitorOff, ShieldAlert, X
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
  const { localParticipant } = useLocalParticipant()

  const [isMicEnabled, setIsMicEnabled] = useState(true)
  const [isCamEnabled, setIsCamEnabled] = useState(true)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [showScreenSharePermissionModal, setShowScreenSharePermissionModal] = useState(false)
  const [handRaised, setHandRaised] = useState(false)
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<"chat" | "participants">("chat")
  const [raisedHands, setRaisedHands] = useState<Set<string>>(new Set())
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [disconnectReason, setDisconnectReason] = useState<"kicked" | "ended" | null>(null)
  const room = useRoomContext()
  const { metadata } = useRoomInfo()
  const [isChatDisabled, setIsChatDisabled] = useState(false)
  const [representatives, setRepresentatives] = useState<string[]>([])
  const [mediaState, setMediaState] = useState<MediaState | null>(null)

  const isRepresentative = localParticipant ? representatives.includes(localParticipant.identity) : false

  // If student is demoted from co-host, automatically disable their screen share
  useEffect(() => {
    if (!isRepresentative && isScreenSharing) {
      localParticipant?.setScreenShareEnabled(false)
      setIsScreenSharing(false)
    }
  }, [isRepresentative, isScreenSharing, localParticipant])

  // Sync with fullscreen changes (e.g. Esc key pressed)
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener("fullscreenchange", handleFsChange)
    return () => document.removeEventListener("fullscreenchange", handleFsChange)
  }, [])

  // Listen to remote track muted events on localParticipant
  useEffect(() => {
    if (!localParticipant) return
    const onTrackMuted = (pub: any) => {
      if (pub.source === Track.Source.Microphone) {
        setIsMicEnabled(false)
      } else if (pub.source === Track.Source.Camera) {
        setIsCamEnabled(false)
      }
    }
    localParticipant.on("trackMuted", onTrackMuted)
    return () => {
      localParticipant.off("trackMuted", onTrackMuted)
    }
  }, [localParticipant])

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
        } else if (topic === "session-ended" || topic === "shutdown") {
          setDisconnectReason("ended")
        } else if (topic === "participant-moderation") {
          try {
            const data = JSON.parse(new TextDecoder().decode(payload))
            if (data.action === "MUTE_ALL" || (data.identity === localParticipant?.identity && data.action === "MUTE_MIC")) {
              localParticipant?.setMicrophoneEnabled(false)
              setIsMicEnabled(false)
            } else if (data.action === "DISABLE_CAMERAS_ALL" || (data.identity === localParticipant?.identity && data.action === "SHUT_CAMERA")) {
              localParticipant?.setCameraEnabled(false)
              setIsCamEnabled(false)
            }
          } catch (e) {}
        }
      }
      
      room.on("dataReceived", handleData)
      return () => { room.off("dataReceived", handleData) }
    } else if (connectionState === ConnectionState.Disconnected && hasConnectedRef.current && !disconnectReason) {
      setDisconnectReason("ended")
    }
  }, [connectionState, disconnectReason, room, localParticipant])

  // Active status poller: periodically check if instructor ended the stream
  useEffect(() => {
    if (disconnectReason) return

    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/live/status?room=${encodeURIComponent(roomId)}`)
        if (res.ok) {
          const data = await res.json()
          if (!data.isLive) {
            setDisconnectReason("ended")
          }
        }
      } catch {}
    }

    const interval = setInterval(checkStatus, 4000)
    return () => clearInterval(interval)
  }, [roomId, disconnectReason])

  const handleMicToggle = async () => {
    try {
      const next = !isMicEnabled
      await localParticipant?.setMicrophoneEnabled(next)
      setIsMicEnabled(next)
    } catch (e) {
      console.error("Failed to toggle microphone:", e)
    }
  }

  const handleCamToggle = async () => {
    try {
      const next = !isCamEnabled
      await localParticipant?.setCameraEnabled(next)
      setIsCamEnabled(next)
    } catch (e) {
      console.error("Failed to toggle camera:", e)
    }
  }

  const handleScreenShareToggle = async () => {
    if (!isRepresentative) {
      setShowScreenSharePermissionModal(true)
      return
    }
    try {
      const next = !isScreenSharing
      await localParticipant?.setScreenShareEnabled(next)
      setIsScreenSharing(next)
    } catch (e) {
      console.error("Failed to toggle screen share:", e)
    }
  }

  const toggleHand = async () => {
    const newState = !handRaised
    setHandRaised(newState)
    if (localParticipant) {
      const payload = new TextEncoder().encode(newState ? "true" : "false")
      await localParticipant.publishData(payload, { reliable: true, topic: "raise-hand" }).catch(() => {})
    }
  }

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

  const handleLeave = () => router.push("/dashboard/student")

  return (
    <>
      <AttendanceHeartbeat
        roomId={roomId}
        enabled={!disconnectReason}
        onSessionEnded={() => setDisconnectReason("ended")}
      />

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

      <div className="fixed inset-0 w-full h-full bg-black overflow-hidden select-none flex flex-col lg:flex-row">
        {/* Main Stage (Google Meet Layout) */}
        <div className="flex-1 flex flex-col min-w-0 relative h-full">
          {/* Top Header */}
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
              {isRepresentative && (
                <span className="hidden sm:flex items-center gap-1 text-xs font-bold text-amber-300 bg-amber-500/20 border border-amber-500/30 px-2.5 py-1 rounded-full">
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

              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 text-xs text-emerald-400">
                <Wifi className="w-3.5 h-3.5" />
                <span className="font-semibold text-[11px]">HD</span>
              </div>

              {/* Fullscreen Toggle Button */}
              <button
                onClick={toggleFullscreen}
                className="p-2 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl border border-white/10 transition-colors"
                title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              {/* Toggle Chat Tab */}
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

              {/* Toggle People Tab */}
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
                    {raisedHands.size}
                  </span>
                )}
              </button>

              {/* Leave Button */}
              <button
                onClick={handleLeave}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-xl text-red-400 text-xs font-semibold transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Leave</span>
              </button>
            </div>
          </div>

          {/* Video Grid Stage */}
          <div className="flex-1 relative overflow-hidden bg-black flex items-center justify-center min-w-0 min-h-0 w-full h-full">
            <RoomAudioRenderer />
            <LiveGrid isTeacher={false} />

            {/* Google Meet Style Floating Bottom Control Bar */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 w-max max-w-[95vw]">
              <div className="flex items-center gap-2 bg-[#0c0c0f]/90 backdrop-blur-2xl border border-white/15 rounded-3xl p-2 px-3 sm:px-4 shadow-2xl shadow-black">
                {/* Mic */}
                <button
                  onClick={handleMicToggle}
                  className={`flex flex-col items-center gap-1 p-3 rounded-2xl transition-all ${
                    isMicEnabled
                      ? "bg-white/10 hover:bg-white/20 text-white"
                      : "bg-red-600 text-white shadow-lg shadow-red-600/40"
                  }`}
                  title={isMicEnabled ? "Mute microphone" : "Unmute microphone"}
                >
                  {isMicEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                  <span className="text-[10px] font-bold">{isMicEnabled ? "Mute" : "Unmute"}</span>
                </button>

                {/* Camera */}
                <button
                  onClick={handleCamToggle}
                  className={`flex flex-col items-center gap-1 p-3 rounded-2xl transition-all ${
                    isCamEnabled
                      ? "bg-white/10 hover:bg-white/20 text-white"
                      : "bg-red-600 text-white shadow-lg shadow-red-600/40"
                  }`}
                  title={isCamEnabled ? "Turn off camera" : "Turn on camera"}
                >
                  {isCamEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                  <span className="text-[10px] font-bold">{isCamEnabled ? "Stop Cam" : "Start Cam"}</span>
                </button>

                {/* Screen Share (With Co-Host / Teacher Permission Check) */}
                <button
                  onClick={handleScreenShareToggle}
                  className={`flex flex-col items-center gap-1 p-3 rounded-2xl transition-all ${
                    isScreenSharing
                      ? "bg-primary text-black font-bold shadow-lg shadow-primary/30 ring-2 ring-primary"
                      : isRepresentative
                      ? "bg-white/10 hover:bg-white/20 text-white"
                      : "bg-white/5 hover:bg-white/10 text-slate-400"
                  }`}
                  title={
                    isScreenSharing
                      ? "Stop sharing screen"
                      : isRepresentative
                      ? "Share your screen"
                      : "Share screen (Requires Instructor Permission)"
                  }
                >
                  {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <MonitorUp className="w-5 h-5" />}
                  <span className="text-[10px] font-bold">
                    {isScreenSharing ? "Stop Share" : "Share Screen"}
                  </span>
                </button>

                <div className="w-px h-10 bg-white/10 mx-1" />

                {/* Raise Hand Button */}
                <button
                  onClick={toggleHand}
                  className={`flex flex-col items-center gap-1 p-3 rounded-2xl transition-all ${
                    handRaised
                      ? "bg-amber-500 text-black ring-2 ring-amber-300 font-bold shadow-lg shadow-amber-500/30"
                      : "bg-white/10 hover:bg-white/20 text-white"
                  }`}
                  title={handRaised ? "Lower hand" : "Raise hand to ask question"}
                >
                  <Hand className={`w-5 h-5 ${handRaised ? "animate-bounce" : ""}`} />
                  <span className="text-[10px] font-bold">{handRaised ? "Hand Raised" : "Raise Hand"}</span>
                </button>

                <div className="w-px h-10 bg-white/10 mx-1" />

                {/* Fullscreen in Bottom Bar */}
                <button
                  onClick={toggleFullscreen}
                  className={`hidden sm:flex flex-col items-center gap-1 p-3 rounded-2xl transition-all ${
                    isFullscreen ? "bg-primary/20 text-primary" : "bg-white/10 hover:bg-white/20 text-white"
                  }`}
                  title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                >
                  {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                  <span className="text-[10px] font-medium">{isFullscreen ? "Exit Full" : "Full Screen"}</span>
                </button>

                {/* Side Panel Toggle */}
                <button
                  onClick={() => setIsPanelOpen(!isPanelOpen)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-2xl transition-all ${
                    isPanelOpen ? "bg-white/20 text-white" : "bg-white/10 hover:bg-white/20 text-slate-300"
                  }`}
                  title={isPanelOpen ? "Collapse Side Panel" : "Expand Side Panel"}
                >
                  {isPanelOpen ? <PanelRightClose className="w-5 h-5" /> : <PanelRightOpen className="w-5 h-5" />}
                  <span className="text-[10px] font-medium">{isPanelOpen ? "Hide" : "Panel"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Permission Modal for Student Screen Share */}
        {showScreenSharePermissionModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="max-w-md w-full bg-[#0A0A0E] border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden text-center">
              <button
                onClick={() => setShowScreenSharePermissionModal(false)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-4 text-amber-400">
                <ShieldAlert className="w-8 h-8" />
              </div>

              <h3 className="text-xl font-bold text-white mb-2">Presenter Permission Required</h3>
              <p className="text-sm text-slate-300 leading-relaxed mb-6">
                Only the Guide (instructor) or an appointed Student Co-Host / Admin can present their screen to the sanctuary. Would you like to raise your hand to request presenter permission?
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => {
                    if (!handRaised) toggleHand()
                    setShowScreenSharePermissionModal(false)
                  }}
                  className="flex-1 py-3 px-4 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl transition-all shadow-lg shadow-amber-500/20 text-sm flex items-center justify-center gap-2"
                >
                  <Hand className="w-4 h-4" />
                  {handRaised ? "Hand Already Raised" : "Raise Hand to Request"}
                </button>
                <button
                  onClick={() => setShowScreenSharePermissionModal(false)}
                  className="py-3 px-5 bg-white/10 hover:bg-white/15 text-white font-semibold rounded-xl transition-colors text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Collapsible Right Side Panel (Chat / People) */}
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
                <LiveChat isTeacher={false} isDisabled={isChatDisabled} />
              ) : (
                <ParticipantList
                  roomId={roomId}
                  isTeacher={false}
                  raisedHands={raisedHands}
                  representatives={representatives}
                  onShutCamera={async (identity) => {
                    await fetch("/api/live/control", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ room: roomId, action: "SHUT_CAMERA_PARTICIPANT", identity }),
                    })
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

export default function StudentLivePage({ params }: StudentLivePageProps) {
  const { roomId } = use(params)
  const router = useRouter()
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
      <div className="h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center p-8 bg-[#0A0A0A] rounded-3xl border border-red-500/20 max-w-md w-full shadow-2xl">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
            <span className="text-red-400 font-bold text-2xl">!</span>
          </div>
          <h2 className="text-white font-bold mb-2 text-xl">Session Unavailable</h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-6">{error}</p>
          <button
            onClick={() => router.push("/dashboard/student")}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20 text-sm"
          >
            Return to Dashboard
          </button>
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
            <h3 className="text-white font-bold text-lg mb-1">Checking Live Session</h3>
            <p className="text-slate-400 text-sm">Connecting to sanctuary...</p>
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
