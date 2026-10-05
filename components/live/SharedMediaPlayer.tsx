"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
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
  RotateCcw,
} from "lucide-react"

export interface MediaState {
  url: string
  title: string
  isPlaying: boolean
  currentTime: number // base offset in seconds
  startedAt?: number // epoch timestamp in ms when play started/resumed
  type: "audio" | "video" | "youtube"
  updatedAt?: number
}

interface SharedMediaPlayerProps {
  mediaState: MediaState | null
  isHostOrRep: boolean
  onUpdateMediaState: (state: MediaState | null) => void
}

/**
 * Calculates real-time playback position in seconds for any participant (early or latecomer).
 */
export function getEstimatedCurrentTime(mediaState: MediaState | null): number {
  if (!mediaState) return 0
  const baseTime = typeof mediaState.currentTime === "number" ? mediaState.currentTime : 0
  if (!mediaState.isPlaying || !mediaState.startedAt) {
    return baseTime
  }
  const elapsed = (Date.now() - mediaState.startedAt) / 1000
  return Math.max(0, baseTime + elapsed)
}

export function extractYouTubeId(url: string): string | null {
  if (!url) return null
  const cleaned = url.trim()
  if (/^[a-zA-Z0-9_-]{11}$/.test(cleaned)) return cleaned

  // Regex supporting watch?v=, youtu.be/, embed/, v/, shorts/, live/, and query params across youtube.com, music.youtube.com, m.youtube.com
  const match = cleaned.match(/(?:youtu\.be\/|(?:www\.|music\.|m\.)?youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|live\/|shorts\/))([a-zA-Z0-9_-]{11})/i)
  if (match && match[1]) return match[1]

  // Fallback to URL searchParams
  try {
    const parsed = new URL(cleaned.startsWith("http") ? cleaned : `https://${cleaned}`)
    if (parsed.hostname.includes("youtube.com") || parsed.hostname.includes("youtu.be")) {
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
  const [isMinimized, setIsMinimized] = useState(true) // Default minimized on mobile to prevent obscuring stage
  const [volume, setVolume] = useState(80)
  const [autoplayBlocked, setAutoplayBlocked] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const lastSyncTimeRef = useRef<number>(0)

  // Extract YouTube ID if current media is YouTube
  const youtubeId = mediaState?.url ? extractYouTubeId(mediaState.url) : null
  const isYouTube = mediaState?.type === "youtube" || youtubeId !== null

  // Calculate synchronized start timestamp for latecomers
  const estimatedSeconds = getEstimatedCurrentTime(mediaState)
  const initialStartSecond = Math.max(0, Math.floor(estimatedSeconds))

  // HTML5 Audio Synchronization
  useEffect(() => {
    if (!audioRef.current || !mediaState || isYouTube) return

    const audio = audioRef.current
    audio.volume = isMuted ? 0 : volume / 100

    const targetTime = getEstimatedCurrentTime(mediaState)

    // Handle initial seek on metadata load or if time drifted significantly (> 1.5 seconds)
    const syncAudioHead = () => {
      if (audio.readyState >= 1) { // HAVE_METADATA or higher
        const drift = Math.abs(audio.currentTime - targetTime)
        if (drift > 1.5) {
          try {
            audio.currentTime = targetTime
          } catch {}
        }
      }
    }

    syncAudioHead()

    if (mediaState.isPlaying) {
      const playPromise = audio.play()
      if (playPromise !== undefined) {
        playPromise
          .then(() => setAutoplayBlocked(false))
          .catch(() => {
            // Browser policy blocked unmuted autoplay for newcomer
            setAutoplayBlocked(true)
          })
      }
    } else {
      audio.pause()
      syncAudioHead()
    }
  }, [mediaState, isMuted, volume, isYouTube])

  // Periodic drift correction interval for HTML5 audio
  useEffect(() => {
    if (!audioRef.current || !mediaState || isYouTube || !mediaState.isPlaying) return

    const interval = setInterval(() => {
      if (!audioRef.current || audioRef.current.readyState < 1) return
      const expectedTime = getEstimatedCurrentTime(mediaState)
      const current = audioRef.current.currentTime
      const drift = Math.abs(current - expectedTime)
      if (drift > 2.0) {
        try {
          audioRef.current.currentTime = expectedTime
        } catch {}
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [mediaState, isYouTube])

  // YouTube IFrame postMessage controller for play / pause / mute / seek
  useEffect(() => {
    if (!iframeRef.current || !isYouTube || !mediaState) return
    const iframeWindow = iframeRef.current.contentWindow
    if (!iframeWindow) return

    try {
      if (mediaState.isPlaying) {
        iframeWindow.postMessage('{"event":"command","func":"playVideo","args":""}', "*")
        // Check and sync position
        const targetSec = getEstimatedCurrentTime(mediaState)
        if (Math.abs(targetSec - lastSyncTimeRef.current) > 3) {
          lastSyncTimeRef.current = targetSec
          iframeWindow.postMessage(`{"event":"command","func":"seekTo","args":[${targetSec}, true]}`, "*")
        }
      } else {
        iframeWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', "*")
        const targetSec = getEstimatedCurrentTime(mediaState)
        iframeWindow.postMessage(`{"event":"command","func":"seekTo","args":[${targetSec}, true]}`, "*")
      }

      if (isMuted) {
        iframeWindow.postMessage('{"event":"command","func":"mute","args":""}', "*")
      } else {
        iframeWindow.postMessage('{"event":"command","func":"unMute","args":""}', "*")
        iframeWindow.postMessage(`{"event":"command","func":"setVolume","args":[${volume}]}`, "*")
      }
    } catch {}
  }, [mediaState, isMuted, volume, isYouTube])

  const handleAudioLoadedMetadata = () => {
    if (!audioRef.current || !mediaState) return
    const target = getEstimatedCurrentTime(mediaState)
    if (target > 0) {
      try {
        audioRef.current.currentTime = target
      } catch {}
    }
  }

  const handleSelectPreset = (preset: (typeof PRESET_TRACKS)[0]) => {
    const isYt = preset.type === "youtube" || extractYouTubeId(preset.url) !== null
    onUpdateMediaState({
      url: preset.url,
      title: preset.title,
      isPlaying: true,
      currentTime: 0,
      startedAt: Date.now(),
      type: isYt ? "youtube" : "audio",
      updatedAt: Date.now(),
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
      startedAt: Date.now(),
      type: isYt ? "youtube" : "audio",
      updatedAt: Date.now(),
    })
    setIsMinimized(false)
    setCustomUrl("")
    setCustomTitle("")
    setShowModal(false)
  }

  const handleTogglePlay = () => {
    if (!mediaState) return
    const now = Date.now()
    if (mediaState.isPlaying) {
      // Transitioning to pause: save exact calculated current head
      const currentPos = getEstimatedCurrentTime(mediaState)
      onUpdateMediaState({
        ...mediaState,
        isPlaying: false,
        currentTime: currentPos,
        startedAt: undefined,
        updatedAt: now,
      })
    } else {
      // Transitioning to play: record resume time
      onUpdateMediaState({
        ...mediaState,
        isPlaying: true,
        startedAt: now,
        updatedAt: now,
      })
    }
  }

  const handleStopMedia = () => {
    onUpdateMediaState(null)
    setIsMinimized(false)
  }

  const handleUserInteractUnmute = () => {
    setIsMuted(false)
    setAutoplayBlocked(false)
    const target = getEstimatedCurrentTime(mediaState)

    if (audioRef.current) {
      audioRef.current.muted = false
      if (target > 0) {
        try { audioRef.current.currentTime = target } catch {}
      }
      audioRef.current.play().catch(() => {})
    }
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage('{"event":"command","func":"unMute","args":""}', "*")
      iframeRef.current.contentWindow.postMessage(`{"event":"command","func":"seekTo","args":[${target}, true]}`, "*")
      iframeRef.current.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', "*")
    }
  }

  return (
    <>
      {/* Active Transmission Badge in Room Header */}
      {mediaState && (
        <div className="flex items-center gap-1.5 sm:gap-2 bg-black/85 backdrop-blur-xl border border-primary/30 px-2 sm:px-2.5 py-1 rounded-full shadow-lg text-xs text-slate-200">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <Music className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary shrink-0 animate-pulse" />
          <span className="font-semibold text-[11px] sm:text-xs truncate max-w-[80px] sm:max-w-[140px] text-white">
            {mediaState.title}
          </span>

          {/* Mute/Unmute */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-0.5 sm:p-1 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors cursor-pointer"
            title={isMuted ? "Unmute music" : "Mute music"}
          >
            {isMuted ? <VolumeX className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-red-400" /> : <Volume2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
          </button>

          {/* Toggle Video Dock (Only for YouTube) */}
          {isYouTube && (
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-0.5 sm:p-1 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors cursor-pointer"
              title={isMinimized ? "Expand Music Video" : "Minimize Music Window"}
            >
              <Video className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary" />
            </button>
          )}

          {/* Host/Rep Controls */}
          {isHostOrRep && (
            <>
              <button
                onClick={handleTogglePlay}
                className="p-0.5 sm:p-1 hover:bg-white/10 rounded-full text-primary transition-colors cursor-pointer"
                title={mediaState.isPlaying ? "Pause music for all" : "Resume music for all"}
              >
                {mediaState.isPlaying ? <Pause className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
              </button>
              <button
                onClick={handleStopMedia}
                className="p-0.5 sm:p-1 hover:bg-red-500/20 rounded-full text-red-400 transition-colors cursor-pointer"
                title="Stop transmission for everyone"
              >
                <X className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </button>
            </>
          )}
        </div>
      )}

      {/* Autoplay Blocked Helper Toast Banner (Never covers header or stage controls) */}
      {mediaState && autoplayBlocked && (
        <div className="fixed top-14 sm:top-16 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <button
            onClick={handleUserInteractUnmute}
            className="flex items-center gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-amber-400 to-primary text-black font-bold text-xs rounded-full shadow-[0_4px_20px_rgba(251,191,36,0.5)] hover:scale-105 active:scale-95 transition-all cursor-pointer border border-amber-300"
          >
            <Volume2 className="w-3.5 h-3.5 animate-bounce" />
            <span>🎵 Tap to Sync & Listen to Live Music</span>
          </button>
        </div>
      )}

      {/* HTML5 Audio Player with auto-sync */}
      {mediaState && !isYouTube && (
        <audio
          ref={audioRef}
          src={mediaState.url}
          muted={isMuted}
          loop
          autoPlay={mediaState.isPlaying}
          onLoadedMetadata={handleAudioLoadedMetadata}
        />
      )}

      {/* Floating Docked YouTube Player (Continuously mounted so audio never restarts or cuts out) */}
      {mediaState && isYouTube && youtubeId && (
        <div
          className={`fixed z-40 bg-[#0d0d12]/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ${
            isMinimized
              ? "top-14 sm:top-auto sm:bottom-20 right-3 sm:right-6 w-56 sm:w-72 p-2 sm:p-2.5"
              : "fixed inset-x-3 bottom-24 sm:inset-auto sm:bottom-24 sm:right-6 w-auto sm:w-80 shadow-[0_20px_50px_rgba(0,0,0,0.9)]"
          }`}
        >
          {isMinimized ? (
            /* Minimized Pill View Header */
            <div className="flex items-center justify-between w-full gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-red-600/20 border border-red-500/30 flex items-center justify-center shrink-0">
                  <Radio className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-red-400 animate-pulse" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] sm:text-xs font-bold text-white truncate">{mediaState.title}</p>
                  <p className="text-[9px] sm:text-[10px] text-slate-400">Synced stream</p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-1 text-slate-300 hover:text-white rounded cursor-pointer"
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => setIsMinimized(false)}
                  className="p-1 text-slate-300 hover:text-white rounded cursor-pointer"
                  title="Expand Video"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
                {isHostOrRep && (
                  <button
                    onClick={handleStopMedia}
                    className="p-1 text-slate-400 hover:text-red-400 rounded cursor-pointer"
                    title="Stop music"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Expanded Video Dock View Top Header */
            <div className="flex items-center justify-between px-3 py-2 bg-white/5 border-b border-white/10 text-xs">
              <span className="font-semibold text-slate-200 truncate pr-2 flex items-center gap-1.5">
                <Radio className="w-3 h-3 text-red-500 animate-pulse" />
                {mediaState.title}
              </span>
              <div className="flex items-center gap-1">
                <a
                  href={`https://www.youtube.com/watch?v=${youtubeId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 text-slate-400 hover:text-white rounded"
                  title="Open on YouTube"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  onClick={() => setIsMinimized(true)}
                  className="p-1 text-slate-400 hover:text-white rounded cursor-pointer"
                  title="Minimize to top bar"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                </button>
                {isHostOrRep && (
                  <button
                    onClick={handleStopMedia}
                    className="p-1 text-slate-400 hover:text-red-400 rounded cursor-pointer"
                    title="Stop music"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* YouTube IFrame Container — ALWAYS MOUNTED to preserve background audio without re-triggering */}
          <div className={isMinimized ? "w-[1px] h-[1px] opacity-0 pointer-events-none absolute -bottom-10" : "w-full aspect-video bg-black relative"}>
            <iframe
              ref={iframeRef}
              src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&enablejsapi=1&playsinline=1&controls=1&mute=${
                isMuted ? 1 : 0
              }&start=${initialStartSecond}&loop=1&playlist=${youtubeId}&origin=${typeof window !== "undefined" ? encodeURIComponent(window.location.origin) : ""}`}
              title={mediaState.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="w-full h-full border-0"
            />
          </div>

          {/* Bottom Volume Slider & Controls (visible when expanded) */}
          {!isMinimized && (
            <div className="px-3 py-2 flex items-center justify-between bg-black/40 text-xs">
              <div className="flex items-center gap-2 flex-1 mr-3">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="text-slate-400 hover:text-white cursor-pointer"
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
                  className="px-2 py-1 bg-primary/20 hover:bg-primary/30 text-primary rounded text-[11px] font-bold cursor-pointer"
                >
                  {mediaState.isPlaying ? "Pause" : "Play"}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Host/Rep Open Selector Button */}
      {isHostOrRep && !mediaState && (
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 bg-primary/20 hover:bg-primary/30 border border-primary/40 rounded-xl text-primary text-xs font-semibold transition-all shadow-sm cursor-pointer"
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
                Synchronized parallel stream: all students join at the exact current timestamp.
              </p>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
