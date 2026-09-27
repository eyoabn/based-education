"use client"

import React, { useState, useEffect, useRef } from "react"
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Music,
  Video,
  X,
  Sparkles,
  Maximize2,
  Minimize2,
  Radio,
  Sliders,
  ExternalLink,
  Volume1,
} from "lucide-react"

export interface MediaState {
  url: string
  title: string
  isPlaying: boolean
  currentTime: number
  type: "audio" | "video" | "youtube"
}

interface SharedMediaPlayerProps {
  mediaState: MediaState | null
  isHostOrRep: boolean
  onUpdateMediaState: (state: MediaState | null) => void
}

export function extractYouTubeId(url: string): string | null {
  if (!url) return null
  const cleaned = url.trim()
  if (/^[a-zA-Z0-9_-]{11}$/.test(cleaned)) return cleaned

  // Regex supporting watch?v=, youtu.be/, embed/, v/, shorts/, live/, and query params
  const match = cleaned.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|live\/|shorts\/))([a-zA-Z0-9_-]{11})/i)
  if (match && match[1]) return match[1]

  // Fallback to URL searchParams
  try {
    const parsed = new URL(cleaned.startsWith("http") ? cleaned : `https://${cleaned}`)
    if (parsed.hostname.includes("youtube.com")) {
      const v = parsed.searchParams.get("v")
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v
      const pathParts = parsed.pathname.split("/").filter(Boolean)
      if (pathParts.length > 0 && /^[a-zA-Z0-9_-]{11}$/.test(pathParts[pathParts.length - 1])) {
        return pathParts[pathParts.length - 1]
      }
    }
  } catch {}

  return null
}

const PRESET_TRACKS = [
  {
    title: "Lofi Girl — 24/7 Study & Relax Beats",
    type: "youtube" as const,
    url: "https://www.youtube.com/watch?v=jfKfPfyJRdk",
    badge: "YouTube Live",
  },
  {
    title: "Synthwave / Chill Radio Live",
    type: "youtube" as const,
    url: "https://www.youtube.com/watch?v=4xDzrJKXOOY",
    badge: "YouTube Live",
  },
  {
    title: "Deep Focus Ambient Piano",
    type: "audio" as const,
    url: "https://cdn.pixabay.com/download/audio/2022/03/15/audio-c86256f103.mp3?filename=ambient-piano-10781.mp3",
    badge: "Native Audio",
  },
  {
    title: "Rain & Thunderstorm Soundscape",
    type: "audio" as const,
    url: "https://cdn.pixabay.com/download/audio/2021/09/06/audio-8612140a32.mp3?filename=rain-and-thunder-14169.mp3",
    badge: "Soundscape",
  },
]

export default function SharedMediaPlayer({
  mediaState,
  isHostOrRep,
  onUpdateMediaState,
}: SharedMediaPlayerProps) {
  const [showModal, setShowModal] = useState(false)
  const [customUrl, setCustomUrl] = useState("")
  const [customTitle, setCustomTitle] = useState("")
  const [isMuted, setIsMuted] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [volume, setVolume] = useState(80)
  const [autoplayBlocked, setAutoplayBlocked] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const iframeRef = useRef<HTMLIFrameElement | null>(null)

  // Extract YouTube ID if current media is YouTube
  const youtubeId = mediaState?.url ? extractYouTubeId(mediaState.url) : null
  const isYouTube = mediaState?.type === "youtube" || youtubeId !== null

  // HTML5 Audio sync
  useEffect(() => {
    if (!audioRef.current || !mediaState || isYouTube) return

    audioRef.current.volume = isMuted ? 0 : volume / 100

    if (mediaState.isPlaying) {
      const playPromise = audioRef.current.play()
      if (playPromise !== undefined) {
        playPromise
          .then(() => setAutoplayBlocked(false))
          .catch(() => {
            // Browser blocked unmuted autoplay
            setAutoplayBlocked(true)
          })
      }
    } else {
      audioRef.current.pause()
    }
  }, [mediaState, isMuted, volume, isYouTube])

  // YouTube IFrame postMessage controller for play / pause / mute
  useEffect(() => {
    if (!iframeRef.current || !isYouTube || !mediaState) return
    const iframeWindow = iframeRef.current.contentWindow
    if (!iframeWindow) return

    try {
      if (mediaState.isPlaying) {
        iframeWindow.postMessage('{"event":"command","func":"playVideo","args":""}', "*")
      } else {
        iframeWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', "*")
      }

      if (isMuted) {
        iframeWindow.postMessage('{"event":"command","func":"mute","args":""}', "*")
      } else {
        iframeWindow.postMessage('{"event":"command","func":"unMute","args":""}', "*")
        iframeWindow.postMessage(`{"event":"command","func":"setVolume","args":[${volume}]}`, "*")
      }
    } catch {}
  }, [mediaState, isMuted, volume, isYouTube])

  const handleSelectPreset = (preset: (typeof PRESET_TRACKS)[0]) => {
    const isYt = preset.type === "youtube" || extractYouTubeId(preset.url) !== null
    onUpdateMediaState({
      url: preset.url,
      title: preset.title,
      isPlaying: true,
      currentTime: 0,
      type: isYt ? "youtube" : "audio",
    })
    setIsMinimized(false)
    setShowModal(false)
  }

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = customUrl.trim()
    if (!trimmed) return

    const detectedYtId = extractYouTubeId(trimmed)
    const isYt = detectedYtId !== null

    onUpdateMediaState({
      url: trimmed,
      title: customTitle.trim() || (isYt ? "YouTube Music Stream" : "Custom Media Stream"),
      isPlaying: true,
      currentTime: 0,
      type: isYt ? "youtube" : "audio",
    })
    setIsMinimized(false)
    setCustomUrl("")
    setCustomTitle("")
    setShowModal(false)
  }

  const handleTogglePlay = () => {
    if (!mediaState) return
    onUpdateMediaState({
      ...mediaState,
      isPlaying: !mediaState.isPlaying,
    })
  }

  const handleStopMedia = () => {
    onUpdateMediaState(null)
    setIsMinimized(false)
  }

  const handleUserInteractUnmute = () => {
    setIsMuted(false)
    setAutoplayBlocked(false)
    if (audioRef.current) {
      audioRef.current.muted = false
      audioRef.current.play().catch(() => {})
    }
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage('{"event":"command","func":"unMute","args":""}', "*")
      iframeRef.current.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', "*")
    }
  }

  return (
    <>
      {/* Active Transmission Badge in Room Header */}
      {mediaState && (
        <div className="flex items-center gap-2 sm:gap-2.5 bg-black/80 backdrop-blur-xl border border-primary/30 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full shadow-lg text-xs text-slate-200">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <Music className="w-3.5 h-3.5 text-primary shrink-0 animate-pulse" />
          <span className="font-semibold text-xs truncate max-w-[90px] sm:max-w-[150px] text-white">
            {mediaState.title}
          </span>

          {/* Mute/Unmute */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-1 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors cursor-pointer"
            title={isMuted ? "Unmute stream" : "Mute stream"}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          {/* Toggle Docked Player */}
          {isYouTube && (
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors cursor-pointer"
              title={isMinimized ? "Expand Music Window" : "Minimize Music Window"}
            >
              <Video className="w-3.5 h-3.5 text-primary" />
            </button>
          )}

          {/* Host/Rep Play/Pause & Stop */}
          {isHostOrRep && (
            <>
              <button
                onClick={handleTogglePlay}
                className="p-1 hover:bg-white/10 rounded-full text-primary transition-colors cursor-pointer"
                title={mediaState.isPlaying ? "Pause music" : "Play music"}
              >
                {mediaState.isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={handleStopMedia}
                className="p-1 hover:bg-red-500/20 rounded-full text-red-400 transition-colors cursor-pointer"
                title="Stop transmission for everyone"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      )}

      {/* Autoplay Blocked Helper Banner */}
      {mediaState && autoplayBlocked && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 animate-in fade-in duration-200">
          <button
            onClick={handleUserInteractUnmute}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-black font-bold text-xs rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            <Volume2 className="w-4 h-4 animate-bounce" />
            Click to Unmute Live Music
          </button>
        </div>
      )}

      {/* HTML5 Audio Player */}
      {mediaState && !isYouTube && (
        <audio
          ref={audioRef}
          src={mediaState.url}
          muted={isMuted}
          loop
          autoPlay={mediaState.isPlaying}
        />
      )}

      {/* Visible Floating Docked Media Player (Never 0px or offscreen to avoid browser throttle) */}
      {mediaState && isYouTube && youtubeId && (
        <div
          className={`fixed z-40 bg-[#0d0d12]/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ${
            isMinimized
              ? "bottom-20 right-4 sm:right-6 w-60 sm:w-72 p-2.5 flex items-center justify-between"
              : "bottom-20 sm:bottom-24 right-4 sm:right-6 w-72 sm:w-80"
          }`}
        >
          {isMinimized ? (
            /* Minimized Pill View */
            <div className="flex items-center justify-between w-full gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-red-600/20 border border-red-500/30 flex items-center justify-center shrink-0">
                  <Radio className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white truncate">{mediaState.title}</p>
                  <p className="text-[10px] text-slate-400">Playing in background</p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-1 text-slate-300 hover:text-white rounded"
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => setIsMinimized(false)}
                  className="p-1 text-slate-300 hover:text-white rounded"
                  title="Expand Video"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            /* Expanded Video Dock View */
            <>
              <div className="flex items-center justify-between px-3 py-2 bg-white/5 border-b border-white/10 text-xs">
                <span className="font-semibold text-slate-200 truncate pr-2 flex items-center gap-1.5">
                  <Radio className="w-3 h-3 text-red-500 animate-pulse" />
                  {mediaState.title}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setIsMinimized(true)}
                    className="p-1 text-slate-400 hover:text-white rounded"
                    title="Minimize to mini-dock"
                  >
                    <Minimize2 className="w-3.5 h-3.5" />
                  </button>
                  {isHostOrRep && (
                    <button
                      onClick={handleStopMedia}
                      className="p-1 text-slate-400 hover:text-red-400 rounded"
                      title="Stop music"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* YouTube IFrame Container (Proper visible dimensions ensure browser plays audio smoothly) */}
              <div className="w-full aspect-video bg-black relative">
                <iframe
                  ref={iframeRef}
                  src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&enablejsapi=1&playsinline=1&controls=1&mute=${
                    isMuted ? 1 : 0
                  }&loop=1&playlist=${youtubeId}`}
                  title={mediaState.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full border-0"
                />
              </div>

              {/* Bottom Volume Slider & Controls */}
              <div className="px-3 py-2 flex items-center justify-between bg-black/40 text-xs">
                <div className="flex items-center gap-2 flex-1 mr-3">
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="text-slate-400 hover:text-white"
                  >
                    {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume1 className="w-3.5 h-3.5" />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => {
                      const v = Number(e.target.value)
                      setVolume(v)
                      if (isMuted && v > 0) setIsMuted(false)
                    }}
                    className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>
                {isHostOrRep && (
                  <button
                    onClick={handleTogglePlay}
                    className="px-2 py-1 bg-primary/20 hover:bg-primary/30 text-primary rounded text-[11px] font-bold"
                  >
                    {mediaState.isPlaying ? "Pause" : "Play"}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Host/Rep Open Selector Button */}
      {isHostOrRep && !mediaState && (
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/20 hover:bg-primary/30 border border-primary/40 rounded-xl text-primary text-xs font-semibold transition-all shadow-sm cursor-pointer"
        >
          <Music className="w-3.5 h-3.5 text-primary" />
          <span className="hidden sm:inline">Play Live Music</span>
          <span className="sm:hidden">Music</span>
        </button>
      )}

      {/* Modal Track Selector */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0A0A0A] border border-white/10 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-white">Broadcast Music / YouTube to Class</h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Presets */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Preset Radio & Study Streams
              </span>
              <div className="space-y-1.5">
                {PRESET_TRACKS.map((track, i) => (
                  <button
                    key={i}
                    onClick={() => handleSelectPreset(track)}
                    className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-primary/15 border border-white/5 hover:border-primary/30 rounded-xl text-xs text-slate-200 font-medium transition-all group text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                        {track.type === "youtube" ? <Radio className="w-3.5 h-3.5" /> : <Music className="w-3.5 h-3.5" />}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-100">{track.title}</div>
                        <div className="text-[10px] text-slate-400">
                          {track.badge}
                        </div>
                      </div>
                    </div>
                    <Play className="w-3.5 h-3.5 text-slate-500 group-hover:text-primary shrink-0" />
                  </button>
                ))}
              </div>
            </div>

            {/* Custom URL */}
            <form onSubmit={handleCustomSubmit} className="space-y-3 pt-3 border-t border-white/10">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Paste Custom YouTube or Audio URL
              </span>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="Optional track title (e.g. Beethoven Symphony #5)"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=... or direct MP3"
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  type="submit"
                  disabled={!customUrl.trim()}
                  className="px-4 py-2 bg-primary hover:bg-[#FCE69B] disabled:opacity-40 text-black text-xs font-bold rounded-xl transition-colors shrink-0 shadow-sm cursor-pointer"
                >
                  Broadcast
                </button>
              </div>
              <p className="text-[10px] text-slate-500">
                Supports any YouTube link (watch, live, shorts, youtu.be) or direct MP3 audio stream. Broadcasts synchronously to all participants.
              </p>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
