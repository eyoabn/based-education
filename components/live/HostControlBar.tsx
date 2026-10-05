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
  Lock,
  Unlock,
  PhoneOff,
  MoreVertical,
  Disc,
  CircleDot,
  FileAudio,
} from "lucide-react"
import ShutdownModal from "./ShutdownModal"
import { ReactionPicker } from "./FloatingReactions"
import { useAudioRecorder } from "@/hooks/useAudioRecorder"
import RecordingSaveModal from "./RecordingSaveModal"
import RecordingsManagerModal from "./RecordingsManagerModal"

interface HostControlBarProps {
  roomId: string
  room?: Room | null
  currentUserName?: string
  isMicEnabled: boolean
  isCamEnabled: boolean
  isScreenSharing: boolean
  isAudioLocked?: boolean
  onToggleLockMics?: () => void
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
  isAudioLocked = false,
  onToggleLockMics,
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
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [showRecordingsList, setShowRecordingsList] = useState(false)

  const {
    isRecording,
    durationSec: recDurationSec,
    recordingResult,
    startRecording,
    stopRecording,
    downloadRecording,
    setRecordingResult,
  } = useAudioRecorder()

  const handleStartRec = async () => {
    const ok = await startRecording()
    if (ok && room) {
      try {
        const encoder = new TextEncoder()
        await room.localParticipant.publishData(
          encoder.encode(JSON.stringify({ action: "RECORDING_STATUS", isRecording: true })),
          { topic: "participant-moderation" }
        )
      } catch {}
    }
  }

  const handleStopRec = async () => {
    const res = await stopRecording()
    if (room) {
      try {
        const encoder = new TextEncoder()
        await room.localParticipant.publishData(
          encoder.encode(JSON.stringify({ action: "RECORDING_STATUS", isRecording: false })),
          { topic: "participant-moderation" }
        )
      } catch {}
    }
    if (res) {
      setShowSaveModal(true)
    }
  }

  const formatRecTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = Math.floor(secs % 60)
    return `${m}:${s < 10 ? "0" : ""}${s}`
  }

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
      {/* Mobile Floating Recording Indicator when recording */}
      {isRecording && (
        <div className="flex sm:hidden fixed bottom-18 inset-x-0 z-30 justify-center pointer-events-auto">
          <button
            onClick={handleStopRec}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-600 text-white text-xs font-bold shadow-lg shadow-red-600/50 animate-pulse cursor-pointer"
          >
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            <span>REC {formatRecTime(recDurationSec)} (Tap to Stop)</span>
          </button>
        </div>
      )}

      {/* 1. Google Meet Mobile Bottom Control Dock (< sm screens) */}
      <div className="flex sm:hidden fixed bottom-3 inset-x-0 z-30 justify-center px-4 pointer-events-none">
        <div className="flex items-center justify-between w-full max-w-[360px] bg-[#141418]/92 backdrop-blur-2xl border border-white/15 rounded-full px-3 py-2 shadow-[0_12px_40px_rgba(0,0,0,0.85)] pointer-events-auto">
          {/* Mic */}
          <button
            onClick={onMicToggle}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-transform active:scale-90 shadow-md cursor-pointer ${
              isMicEnabled
                ? "bg-white/10 text-white hover:bg-white/20"
                : "bg-red-600 text-white shadow-red-600/40"
            }`}
            title={isMicEnabled ? "Mute" : "Unmute"}
          >
            {isMicEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>

          {/* Camera */}
          <button
            onClick={onCamToggle}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-transform active:scale-90 shadow-md cursor-pointer ${
              isCamEnabled
                ? "bg-white/10 text-white hover:bg-white/20"
                : "bg-red-600 text-white shadow-red-600/40"
            }`}
            title={isCamEnabled ? "Stop Camera" : "Start Camera"}
          >
            {isCamEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>

          {/* Reactions */}
          <div className="relative">
            <button
              onClick={() => {
                setShowReactions(!showReactions)
                setShowHostMenu(false)
              }}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-transform active:scale-90 shadow-md cursor-pointer ${
                showReactions
                  ? "bg-primary text-black font-bold ring-2 ring-primary/50"
                  : "bg-white/10 text-amber-400 hover:bg-white/20"
              }`}
              title="Send Stickers"
            >
              <Smile className="w-5 h-5" />
            </button>

            <ReactionPicker
              room={room}
              currentUserName={currentUserName}
              isOpen={showReactions}
              onClose={() => setShowReactions(false)}
            />
          </div>

          {/* Host Settings & Moderation (Shield) */}
          <button
            onClick={() => {
              setShowHostMenu(!showHostMenu)
              setShowReactions(false)
            }}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-transform active:scale-90 shadow-md cursor-pointer relative ${
              showHostMenu || isAudioLocked
                ? "bg-primary text-black font-bold ring-2 ring-primary/40"
                : "bg-white/10 text-white hover:bg-white/20"
            }`}
            title="Instructor Options"
          >
            <Shield className="w-5 h-5" />
            {isAudioLocked && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-400 border border-black flex items-center justify-center text-[8px] font-black text-black">
                🔒
              </span>
            )}
          </button>

          {/* End Call (Red Phone) */}
          <button
            onClick={() => setShowShutdownModal(true)}
            className="w-12 h-11 rounded-full bg-gradient-to-r from-red-600 to-red-700 active:scale-90 text-white flex items-center justify-center transition-all shadow-lg shadow-red-600/30 cursor-pointer"
            title="End Session"
          >
            <PhoneOff className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 2. Desktop & Tablet Floating Control Bar (>= sm screens) */}
      <div className="hidden sm:block absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-30 w-max max-w-[96vw]">
        <div className="flex items-center gap-1 sm:gap-2 bg-black/85 backdrop-blur-3xl border border-white/10 rounded-3xl px-2 sm:px-4 py-1.5 sm:py-2.5 shadow-2xl shadow-black/80 overflow-visible">
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

          {/* Audio Recording Button */}
          <button
            onClick={isRecording ? handleStopRec : handleStartRec}
            className={`flex flex-col items-center gap-1 p-2 sm:p-3 rounded-2xl transition-all duration-200 cursor-pointer ${
              isRecording
                ? "bg-red-600/30 text-red-400 ring-2 ring-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.4)] animate-pulse"
                : "bg-white/5 hover:bg-white/10 text-white"
            }`}
            title={isRecording ? "Stop voice recording and review" : "Record voice lecture"}
          >
            <div className="relative">
              {isRecording ? (
                <CircleDot className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
              ) : (
                <Disc className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />
              )}
              {isRecording && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500 animate-ping" />}
            </div>
            <span className="text-[9px] sm:text-[10px] font-medium opacity-70">
              {isRecording ? formatRecTime(recDurationSec) : "Record"}
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
                showHostMenu || isAudioLocked
                  ? "bg-primary/20 text-primary ring-1 ring-primary/40 shadow-[0_0_15px_rgba(212,175,55,0.2)]"
                  : "bg-white/5 hover:bg-white/10 text-white"
              }`}
            >
              <div className="relative">
                <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
                {isAudioLocked && (
                  <span className="absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full bg-amber-400 border border-black flex items-center justify-center text-[8px] font-black text-black">
                    🔒
                  </span>
                )}
              </div>
              <span className="text-[9px] sm:text-[10px] font-medium opacity-70">
                {isAudioLocked ? "Locked" : "Host"}
              </span>
            </button>

            {showHostMenu && (
              <>
                {/* Backdrop dismissal on desktop outside click */}
                <div
                  className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px] cursor-default"
                  onClick={() => setShowHostMenu(false)}
                />

                <div className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 w-72 bg-[#0C0C10]/98 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.9)] overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="p-3 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-primary" />
                      <span className="font-bold text-white text-xs sm:text-sm">Instructor Controls</span>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-400 bg-white/5 px-2 py-0.5 rounded-full">Host Mode</span>
                  </div>

                  <div className="p-2 space-y-1">
                    {/* Strict Mic Lock Toggle */}
                    <button
                      onClick={() => {
                        if (onToggleLockMics) onToggleLockMics()
                        setShowHostMenu(false)
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs sm:text-sm rounded-xl transition-colors cursor-pointer ${
                        isAudioLocked
                          ? "bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30"
                          : "text-slate-200 hover:bg-white/5"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        {isAudioLocked ? (
                          <Lock className="w-4 h-4 text-amber-400" />
                        ) : (
                          <Unlock className="w-4 h-4 text-slate-400" />
                        )}
                        <span className="font-semibold">
                          {isAudioLocked ? "Unlock Microphones" : "Lock Microphones"}
                        </span>
                      </div>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        isAudioLocked ? "bg-amber-400/30 text-amber-200" : "bg-white/10 text-slate-400"
                      }`}>
                        {isAudioLocked ? "Muted" : "Open"}
                      </span>
                    </button>

                    {/* Screen Share in dropdown */}
                    <button
                      onClick={() => {
                        onScreenShareToggle()
                        setShowHostMenu(false)
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs sm:text-sm rounded-xl transition-colors cursor-pointer ${
                        isScreenSharing
                          ? "bg-primary/20 text-primary border border-primary/30"
                          : "text-slate-200 hover:bg-white/5"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        {isScreenSharing ? (
                          <MonitorOff className="w-4 h-4 text-primary" />
                        ) : (
                          <MonitorUp className="w-4 h-4 text-slate-400" />
                        )}
                        <span>{isScreenSharing ? "Stop Screen Share" : "Share Screen"}</span>
                      </div>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-slate-400">
                        {isScreenSharing ? "Sharing" : "Off"}
                      </span>
                    </button>

                    <button
                      onClick={handleMuteAll}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs sm:text-sm text-slate-200 hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
                    >
                      <MicOff className="w-4 h-4 text-slate-400" />
                      Mute All Seekers
                    </button>
                    <button
                      onClick={handleDisableCameras}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs sm:text-sm text-slate-200 hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
                    >
                      <VideoOff className="w-4 h-4 text-slate-400" />
                      Disable All Cameras
                    </button>
                    <button
                      onClick={handleDisableChat}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs sm:text-sm text-slate-200 hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
                    >
                      <MessageSquareOff
                        className={`w-4 h-4 ${isChatDisabled ? "text-red-400" : "text-slate-400"}`}
                      />
                      {isChatDisabled ? "Enable Chat" : "Disable Chat"}
                    </button>

                    <button
                      onClick={() => {
                        setShowRecordingsList(true)
                        setShowHostMenu(false)
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs sm:text-sm text-slate-200 hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
                    >
                      <FileAudio className="w-4 h-4 text-primary" />
                      View Class Recordings
                    </button>
                    <div className="my-1.5 h-px bg-white/10" />
                    <button
                      onClick={() => {
                        setShowHostMenu(false)
                        setShowShutdownModal(true)
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs sm:text-sm text-red-400 hover:bg-red-500/10 rounded-xl transition-colors font-bold cursor-pointer"
                    >
                      <AlertTriangle className="w-4 h-4" />
                      End Session for All
                    </button>
                  </div>
                  <ChevronUp className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 text-white/20" />
                </div>
              </>
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

      {/* 3. Mobile Host Actions Bottom Sheet Drawer */}
      {showHostMenu && (
        <div 
          onClick={() => setShowHostMenu(false)}
          className="fixed inset-0 z-50 flex sm:hidden flex-col justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-[#121216] border-t border-white/15 rounded-t-3xl p-5 pb-8 shadow-2xl space-y-3 animate-in slide-in-from-bottom duration-250 cursor-default"
          >
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-1" />
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                <span className="font-bold text-white text-sm">Instructor Controls</span>
              </div>
              <button
                onClick={() => setShowHostMenu(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <ChevronUp className="w-4 h-4 rotate-180" />
              </button>
            </div>

            <div className="space-y-2 pt-1">
              {/* Strict Mic Lock Toggle */}
              <button
                onClick={() => {
                  if (onToggleLockMics) onToggleLockMics()
                  setShowHostMenu(false)
                }}
                className={`w-full flex items-center justify-between p-3 rounded-2xl text-xs font-semibold cursor-pointer ${
                  isAudioLocked
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    : "bg-white/5 text-slate-200 hover:bg-white/10"
                }`}
              >
                <div className="flex items-center gap-3">
                  {isAudioLocked ? <Lock className="w-4 h-4 text-amber-400" /> : <Unlock className="w-4 h-4 text-slate-400" />}
                  <span>{isAudioLocked ? "Unlock Microphones" : "Lock All Microphones"}</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-white/10">
                  {isAudioLocked ? "Locked" : "Open"}
                </span>
              </button>

              {/* Screen Share Toggle */}
              <button
                onClick={() => {
                  onScreenShareToggle()
                  setShowHostMenu(false)
                }}
                className={`w-full flex items-center justify-between p-3 rounded-2xl text-xs font-semibold cursor-pointer ${
                  isScreenSharing
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "bg-white/5 text-slate-200 hover:bg-white/10"
                }`}
              >
                <div className="flex items-center gap-3">
                  {isScreenSharing ? <MonitorOff className="w-4 h-4 text-primary" /> : <MonitorUp className="w-4 h-4 text-slate-400" />}
                  <span>{isScreenSharing ? "Stop Sharing Screen" : "Share Screen"}</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-white/10">
                  {isScreenSharing ? "Active" : "Off"}
                </span>
              </button>

              {/* Mute All */}
              <button
                onClick={handleMuteAll}
                className="w-full flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 text-slate-200 rounded-2xl text-xs font-semibold cursor-pointer"
              >
                <MicOff className="w-4 h-4 text-slate-400" />
                <span>Mute All Seekers</span>
              </button>

              {/* Record Voice Lecture */}
              <button
                onClick={() => {
                  if (isRecording) handleStopRec()
                  else handleStartRec()
                  setShowHostMenu(false)
                }}
                className={`w-full flex items-center justify-between p-3 rounded-2xl text-xs font-semibold cursor-pointer ${
                  isRecording
                    ? "bg-red-600/20 text-red-300 border border-red-500/30 animate-pulse"
                    : "bg-white/5 text-slate-200 hover:bg-white/10"
                }`}
              >
                <div className="flex items-center gap-3">
                  {isRecording ? <CircleDot className="w-4 h-4 text-red-400" /> : <Disc className="w-4 h-4 text-red-400" />}
                  <span>{isRecording ? `Recording (${formatRecTime(recDurationSec)}) - Tap to Stop` : "Record Voice Lecture"}</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-white/10">
                  {isRecording ? "Active" : "Ready"}
                </span>
              </button>

              <button
                onClick={() => {
                  setShowRecordingsList(true)
                  setShowHostMenu(false)
                }}
                className="w-full flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 text-slate-200 rounded-2xl text-xs font-semibold cursor-pointer"
              >
                <FileAudio className="w-4 h-4 text-primary" />
                <span>View & Download Recordings</span>
              </button>

              {/* Disable Cameras */}
              <button
                onClick={handleDisableCameras}
                className="w-full flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 text-slate-200 rounded-2xl text-xs font-semibold cursor-pointer"
              >
                <VideoOff className="w-4 h-4 text-slate-400" />
                <span>Disable All Cameras</span>
              </button>

              {/* Disable Chat */}
              <button
                onClick={handleDisableChat}
                className="w-full flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 text-slate-200 rounded-2xl text-xs font-semibold cursor-pointer"
              >
                <MessageSquareOff className={`w-4 h-4 ${isChatDisabled ? "text-red-400" : "text-slate-400"}`} />
                <span>{isChatDisabled ? "Enable Chat" : "Disable Chat"}</span>
              </button>

              {/* End Session */}
              <button
                onClick={() => {
                  setShowHostMenu(false)
                  setShowShutdownModal(true)
                }}
                className="w-full flex items-center gap-3 p-3 bg-red-600/20 hover:bg-red-600/30 text-red-300 rounded-2xl text-xs font-bold cursor-pointer border border-red-500/30 mt-2"
              >
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span>End Session for All</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {showShutdownModal && (
        <ShutdownModal
          onConfirm={() => {
            setShowShutdownModal(false)
            onShutdown()
          }}
          onCancel={() => setShowShutdownModal(false)}
        />
      )}

      {/* Recording Save, Download & Publish Modal */}
      {showSaveModal && recordingResult && (
        <RecordingSaveModal
          roomId={roomId}
          recordingResult={recordingResult}
          onClose={() => {
            setShowSaveModal(false)
            setRecordingResult(null)
          }}
          onDownload={downloadRecording}
          onSavedSuccess={() => {
            setShowRecordingsList(true)
          }}
        />
      )}

      {/* Recordings Manager Modal (Listen, Download, Delete) */}
      <RecordingsManagerModal
        roomId={roomId}
        isOpen={showRecordingsList}
        onClose={() => setShowRecordingsList(false)}
        isTeacher={true}
      />
    </>
  )
}
