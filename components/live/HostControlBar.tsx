"use client"

import React, { useState } from "react"
import { Room } from "livekit-client"
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  MonitorUp,
  MonitorOff,
  ChevronUp,
  Shield,
  AlertTriangle,
  Users,
  MessageSquareOff,
  Smile,
} from "lucide-react"
import ShutdownModal from "./ShutdownModal"
import { ReactionPicker } from "./FloatingReactions"

interface HostControlBarProps {
  roomId: string
  room?: Room | null
  currentUserName?: string
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
  room,
  currentUserName = "Instructor",
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
  const [showReactions, setShowReactions] = useState(false)

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
      <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-20 w-max max-w-[96vw]">
        <div className="flex items-center gap-1 sm:gap-2 bg-black/85 backdrop-blur-3xl border border-white/10 rounded-3xl px-2 sm:px-4 py-1.5 sm:py-2.5 shadow-2xl shadow-black/80 overflow-x-auto no-scrollbar">
          {/* Mic */}
          <button
            onClick={onMicToggle}
            className={`group flex flex-col items-center gap-1 p-2 sm:p-3 rounded-2xl transition-all duration-200 cursor-pointer ${
              isMicEnabled
                ? "bg-white/5 hover:bg-white/10 text-white"
                : "bg-red-500/20 hover:bg-red-500/30 text-red-400"
            }`}
          >
            {isMicEnabled ? <Mic className="w-4 h-4 sm:w-5 sm:h-5" /> : <MicOff className="w-4 h-4 sm:w-5 sm:h-5" />}
            <span className="text-[9px] sm:text-[10px] font-medium opacity-70">
              {isMicEnabled ? "Mute" : "Unmute"}
            </span>
          </button>

          {/* Camera */}
          <button
            onClick={onCamToggle}
            className={`flex flex-col items-center gap-1 p-2 sm:p-3 rounded-2xl transition-all duration-200 cursor-pointer ${
              isCamEnabled
                ? "bg-white/5 hover:bg-white/10 text-white"
                : "bg-red-500/20 hover:bg-red-500/30 text-red-400"
            }`}
          >
            {isCamEnabled ? <Video className="w-4 h-4 sm:w-5 sm:h-5" /> : <VideoOff className="w-4 h-4 sm:w-5 sm:h-5" />}
            <span className="text-[9px] sm:text-[10px] font-medium opacity-70">
              {isCamEnabled ? "Stop Cam" : "Start Cam"}
            </span>
          </button>

          {/* Screen Share */}
          <button
            onClick={onScreenShareToggle}
            className={`flex flex-col items-center gap-1 p-2 sm:p-3 rounded-2xl transition-all duration-200 cursor-pointer ${
              isScreenSharing
                ? "bg-primary/20 hover:bg-primary/30 text-primary ring-1 ring-primary/40 shadow-[0_0_15px_rgba(212,175,55,0.2)]"
                : "bg-white/5 hover:bg-white/10 text-white"
            }`}
          >
            {isScreenSharing ? (
              <MonitorOff className="w-4 h-4 sm:w-5 sm:h-5" />
            ) : (
              <MonitorUp className="w-4 h-4 sm:w-5 sm:h-5" />
            )}
            <span className="text-[9px] sm:text-[10px] font-medium opacity-70">
              {isScreenSharing ? "Stop Share" : "Share"}
            </span>
          </button>

          {/* Google Meet Live Reactions / Stickers Button */}
          <div className="relative">
            <button
              onClick={() => {
                setShowReactions(!showReactions)
                setShowHostMenu(false)
              }}
              className={`flex flex-col items-center gap-1 p-2 sm:p-3 rounded-2xl transition-all duration-200 cursor-pointer ${
                showReactions
                  ? "bg-primary/20 text-primary ring-1 ring-primary/40"
                  : "bg-white/5 hover:bg-white/10 text-white"
              }`}
              title="Send Live Stickers & Reactions"
            >
              <Smile className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
              <span className="text-[9px] sm:text-[10px] font-medium opacity-70">React</span>
            </button>

            <ReactionPicker
              room={room}
              currentUserName={currentUserName}
              isOpen={showReactions}
              onClose={() => setShowReactions(false)}
            />
          </div>

          <div className="w-px h-8 sm:h-10 bg-white/10 mx-0.5 sm:mx-1" />

          {/* Host Actions Menu */}
          <div className="relative">
            <button
              onClick={() => {
                setShowHostMenu(!showHostMenu)
                setShowReactions(false)
              }}
              className={`flex flex-col items-center gap-1 p-2 sm:p-3 rounded-2xl transition-all duration-200 cursor-pointer ${
                showHostMenu
                  ? "bg-primary/20 text-primary ring-1 ring-primary/40 shadow-[0_0_15px_rgba(212,175,55,0.2)]"
                  : "bg-white/5 hover:bg-white/10 text-white"
              }`}
            >
              <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-[9px] sm:text-[10px] font-medium opacity-70">Host</span>
            </button>

            {showHostMenu && (
              <div className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 w-56 bg-[#0A0A0A]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.8)] overflow-hidden">
                <div className="p-1.5">
                  <button
                    onClick={handleMuteAll}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-xs sm:text-sm text-slate-200 hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
                  >
                    <MicOff className="w-4 h-4 text-slate-400" />
                    Mute All Seekers
                  </button>
                  <button
                    onClick={handleDisableCameras}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-xs sm:text-sm text-slate-200 hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
                  >
                    <VideoOff className="w-4 h-4 text-slate-400" />
                    Disable All Cameras
                  </button>
                  <button
                    onClick={handleDisableChat}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-xs sm:text-sm text-slate-200 hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
                  >
                    <MessageSquareOff
                      className={`w-4 h-4 ${isChatDisabled ? "text-red-400" : "text-slate-400"}`}
                    />
                    {isChatDisabled ? "Enable Chat" : "Disable Chat"}
                  </button>
                  <div className="my-1.5 h-px bg-white/5" />
                  <button
                    onClick={() => {
                      setShowHostMenu(false)
                      setShowShutdownModal(true)
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-xs sm:text-sm text-red-400 hover:bg-red-500/10 rounded-xl transition-colors font-bold cursor-pointer"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    End Session for All
                  </button>
                </div>
                <ChevronUp className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 text-white/20" />
              </div>
            )}
          </div>

          <div className="w-px h-8 sm:h-10 bg-white/10 mx-0.5 sm:mx-1" />

          {/* End Call Red */}
          <button
            onClick={() => setShowShutdownModal(true)}
            className="flex flex-col items-center gap-1 p-2 sm:p-3 px-3 sm:px-6 rounded-2xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white transition-all duration-200 font-bold shadow-lg shadow-red-500/20 cursor-pointer"
          >
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span className="text-xs sm:text-sm">End</span>
            </div>
          </button>
        </div>
      </div>

      {showShutdownModal && (
        <ShutdownModal
          onConfirm={() => {
            setShowShutdownModal(false)
            onShutdown()
          }}
          onCancel={() => setShowShutdownModal(false)}
        />
      )}
    </>
  )
}
