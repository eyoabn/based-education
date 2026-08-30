"use client"

import { useState } from "react"
import {
  Mic, MicOff, Video, VideoOff, MonitorUp, MonitorOff,
  ChevronUp, Shield, AlertTriangle, Users, MessageSquareOff
} from "lucide-react"
import ShutdownModal from "./ShutdownModal"

interface HostControlBarProps {
  roomId: string
  isMicEnabled: boolean
  isCamEnabled: boolean
  isScreenSharing: boolean
  onMicToggle: () => void
  onCamToggle: () => void
  onScreenShareToggle: () => void
  onMuteAll: () => void
  onDisableCameras: () => void
  onDisableChat: () => void
  isChatDisabled: boolean
  onShutdown: () => void
}

export default function HostControlBar({
  roomId,
  isMicEnabled,
  isCamEnabled,
  isScreenSharing,
  onMicToggle,
  onCamToggle,
  onScreenShareToggle,
  onMuteAll,
  onDisableCameras,
  onDisableChat,
  isChatDisabled,
  onShutdown,
}: HostControlBarProps) {
  const [showHostMenu, setShowHostMenu] = useState(false)
  const [showShutdownModal, setShowShutdownModal] = useState(false)

  const handleMuteAll = () => {
    onMuteAll()
    setShowHostMenu(false)
  }

  const handleDisableCameras = () => {
    onDisableCameras()
    setShowHostMenu(false)
  }

  const handleDisableChat = () => {
    onDisableChat()
    setShowHostMenu(false)
  }

  return (
    <>
      {/* Floating Control Bar */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 w-max max-w-[95vw]">
        <div className="flex items-center gap-1 sm:gap-2 bg-black/80 backdrop-blur-3xl border border-white/10 rounded-3xl px-2 sm:px-4 py-2 sm:py-3 shadow-2xl shadow-black/80 overflow-x-auto no-scrollbar">
          
          {/* Mic */}
          <button
            onClick={onMicToggle}
            className={`group flex flex-col items-center gap-1 p-3 rounded-2xl transition-all duration-200 ${
              isMicEnabled
                ? "bg-white/5 hover:bg-white/10 text-white"
                : "bg-red-500/20 hover:bg-red-500/30 text-red-400"
            }`}
          >
            {isMicEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            <span className="text-[10px] font-medium opacity-70">{isMicEnabled ? "Mute" : "Unmute"}</span>
          </button>

          {/* Camera */}
          <button
            onClick={onCamToggle}
            className={`flex flex-col items-center gap-1 p-3 rounded-2xl transition-all duration-200 ${
              isCamEnabled
                ? "bg-white/5 hover:bg-white/10 text-white"
                : "bg-red-500/20 hover:bg-red-500/30 text-red-400"
            }`}
          >
            {isCamEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            <span className="text-[10px] font-medium opacity-70">{isCamEnabled ? "Stop Cam" : "Start Cam"}</span>
          </button>

          {/* Screen Share */}
          <button
            onClick={onScreenShareToggle}
            className={`flex flex-col items-center gap-1 p-3 rounded-2xl transition-all duration-200 ${
              isScreenSharing
                ? "bg-primary/20 hover:bg-primary/30 text-primary ring-1 ring-primary/40 shadow-[0_0_15px_rgba(212,175,55,0.2)]"
                : "bg-white/5 hover:bg-white/10 text-white"
            }`}
          >
            {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <MonitorUp className="w-5 h-5" />}
            <span className="text-[10px] font-medium opacity-70">{isScreenSharing ? "Stop Share" : "Share Screen"}</span>
          </button>

          <div className="w-px h-10 bg-white/10 mx-1" />

          {/* Host Actions Menu */}
          <div className="relative">
            <button
              onClick={() => setShowHostMenu(!showHostMenu)}
              className={`flex flex-col items-center gap-1 p-3 rounded-2xl transition-all duration-200 ${
                showHostMenu
                  ? "bg-primary/20 text-primary ring-1 ring-primary/40 shadow-[0_0_15px_rgba(212,175,55,0.2)]"
                  : "bg-white/5 hover:bg-white/10 text-white"
              }`}
            >
              <Shield className="w-5 h-5" />
              <span className="text-[10px] font-medium opacity-70">Host</span>
            </button>

            {showHostMenu && (
              <div className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 w-56 bg-[#0A0A0A]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.8)] overflow-hidden">
                <div className="p-1.5">
                  <button
                    onClick={handleMuteAll}
                    className="w-full flex items-center gap-3 px-3 py-3 text-sm text-slate-200 hover:bg-white/5 rounded-xl transition-colors"
                  >
                    <MicOff className="w-4 h-4 text-slate-400" />
                    Mute All Seekers
                  </button>
                  <button
                    onClick={handleDisableCameras}
                    className="w-full flex items-center gap-3 px-3 py-3 text-sm text-slate-200 hover:bg-white/5 rounded-xl transition-colors"
                  >
                    <VideoOff className="w-4 h-4 text-slate-400" />
                    Disable All Cameras
                  </button>
                  <button
                    onClick={handleDisableChat}
                    className="w-full flex items-center gap-3 px-3 py-3 text-sm text-slate-200 hover:bg-white/5 rounded-xl transition-colors"
                  >
                    <MessageSquareOff className={`w-4 h-4 ${isChatDisabled ? 'text-red-400' : 'text-slate-400'}`} />
                    {isChatDisabled ? 'Enable Chat' : 'Disable Chat'}
                  </button>
                  <div className="my-1.5 h-px bg-white/5" />
                  <button
                    onClick={() => { setShowHostMenu(false); setShowShutdownModal(true) }}
                    className="w-full flex items-center gap-3 px-3 py-3 text-sm text-red-400 hover:bg-red-500/10 rounded-xl transition-colors font-bold"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    End Session for All
                  </button>
                </div>
                <ChevronUp className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 text-white/20" />
              </div>
            )}
          </div>

          <div className="w-px h-10 bg-white/10 mx-1" />

          {/* End Call Red */}
          <button
            onClick={() => setShowShutdownModal(true)}
            className="flex flex-col items-center gap-1 p-3 px-6 rounded-2xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white transition-all duration-200 font-bold shadow-lg shadow-red-500/20"
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span className="text-sm">End Session</span>
            </div>
          </button>
        </div>
      </div>

      {showShutdownModal && (
        <ShutdownModal
          onConfirm={() => { setShowShutdownModal(false); onShutdown() }}
          onCancel={() => setShowShutdownModal(false)}
        />
      )}
    </>
  )
}
