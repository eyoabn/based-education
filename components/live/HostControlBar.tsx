"use client"

import { useState } from "react"
import {
  Mic, MicOff, Video, VideoOff, MonitorUp, MonitorOff,
  ChevronUp, Shield, AlertTriangle, Users
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
  onShutdown,
}: HostControlBarProps) {
  const [showHostMenu, setShowHostMenu] = useState(false)
  const [showShutdownModal, setShowShutdownModal] = useState(false)

  const handleMuteAll = () => {
    onMuteAll()
    setShowHostMenu(false)
  }

  return (
    <>
      {/* Floating Control Bar */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
        <div className="flex items-center gap-2 bg-[#0e1525]/90 backdrop-blur-xl border border-white/10 rounded-2xl px-4 py-3 shadow-2xl shadow-black/60">
          
          {/* Mic */}
          <button
            onClick={onMicToggle}
            className={`group flex flex-col items-center gap-1 p-3 rounded-xl transition-all duration-200 ${
              isMicEnabled
                ? "bg-white/10 hover:bg-white/15 text-white"
                : "bg-red-500/20 hover:bg-red-500/30 text-red-400"
            }`}
          >
            {isMicEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            <span className="text-[10px] font-medium opacity-70">{isMicEnabled ? "Mute" : "Unmute"}</span>
          </button>

          {/* Camera */}
          <button
            onClick={onCamToggle}
            className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all duration-200 ${
              isCamEnabled
                ? "bg-white/10 hover:bg-white/15 text-white"
                : "bg-red-500/20 hover:bg-red-500/30 text-red-400"
            }`}
          >
            {isCamEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            <span className="text-[10px] font-medium opacity-70">{isCamEnabled ? "Stop Cam" : "Start Cam"}</span>
          </button>

          {/* Screen Share */}
          <button
            onClick={onScreenShareToggle}
            className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all duration-200 ${
              isScreenSharing
                ? "bg-indigo-500/30 hover:bg-indigo-500/40 text-indigo-300"
                : "bg-white/10 hover:bg-white/15 text-white"
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
              className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all duration-200 ${
                showHostMenu
                  ? "bg-indigo-600/40 text-indigo-300"
                  : "bg-white/10 hover:bg-white/15 text-white"
              }`}
            >
              <Shield className="w-5 h-5" />
              <span className="text-[10px] font-medium opacity-70">Host</span>
            </button>

            {showHostMenu && (
              <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-52 bg-[#0e1525] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
                <div className="p-1">
                  <button
                    onClick={handleMuteAll}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-200 hover:bg-white/5 rounded-lg transition-colors"
                  >
                    <MicOff className="w-4 h-4 text-slate-400" />
                    Mute All Students
                  </button>
                  <button
                    onClick={() => setShowHostMenu(false)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-200 hover:bg-white/5 rounded-lg transition-colors"
                  >
                    <Users className="w-4 h-4 text-slate-400" />
                    Disable All Cameras
                  </button>
                  <div className="my-1 h-px bg-white/10" />
                  <button
                    onClick={() => { setShowHostMenu(false); setShowShutdownModal(true) }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors font-semibold"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    End Class for All
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
            className="flex flex-col items-center gap-1 p-3 px-5 rounded-xl bg-red-600 hover:bg-red-700 text-white transition-all duration-200 font-semibold"
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span className="text-sm">End Class</span>
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
