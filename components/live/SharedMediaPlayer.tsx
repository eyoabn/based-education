"use client"

import { useState, useEffect, useRef } from "react"
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Music,
  Video,
  X,
  ExternalLink,
  Sparkles,
  Maximize2,
  Minimize2,
  Radio,
  Sliders,
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
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/i
  const match = cleaned.match(regExp)
  return match ? match[1] : null
}

const PRESET_TRACKS = [
  {
    title: "Lofi Girl — 24/7 Study & Relax Beats",
    type: "youtube" as const,
    url: "https://www.youtube.com/watch?v=jfKfPfyJRdk",
    isLive: true,
  },
  {
    title: "Synthwave / Chill Radio Live",
    type: "youtube" as const,
    url: "https://www.youtube.com/watch?v=4xDzrJKXOOY",
    isLive: true,
  },
  {
    title: "Deep Focus Ambient Piano",
    type: "audio" as const,
    url: "https://cdn.pixabay.com/download/audio/2022/03/15/audio-c86256f103.mp3?filename=ambient-piano-10781.mp3",
    isLive: false,
  },
  {
    title: "Rain & Thunderstorm Soundscape",
    type: "audio" as const,
    url: "https://cdn.pixabay.com/download/audio/2021/09/06/audio-8612140a32.mp3?filename=rain-and-thunder-14169.mp3",
    isLive: false,
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
  const [showFloatingVideo, setShowFloatingVideo] = useState(false)
  const [volume, setVolume] = useState(80)

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
      audioRef.current.play().catch(() => {})
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
    setShowFloatingVideo(false)
  }

  return (
    <>
      {/* Active Transmission Badge in Room Header */}
      {mediaState && (
        <div className="flex items-center gap-2 sm:gap-2.5 bg-black/80 backdrop-blur-xl border border-primary/30 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full shadow-lg text-xs text-slate-200">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <Music className="w-3.5 h-3.5 text-primary shrink-0 animate-pulse" />
          <span className="font-semibold text-xs truncate max-w-[110px] sm:max-w-[160px] text-white">
            {mediaState.title}
          </span>

          {/* Mute/Unmute */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-1 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors"
            title={isMuted ? "Unmute stream" : "Mute stream"}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          {/* Toggle Picture-in-Picture Video window if YouTube */}
          {isYouTube && youtubeId && (
            <button
              onClick={() => setShowFloatingVideo(!showFloatingVideo)}
              className={`p-1 rounded-full transition-colors ${
                showFloatingVideo
                  ? "bg-primary/20 text-primary"
                  : "text-slate-400 hover:text-white hover:bg-white/10"
              }`}
              title={showFloatingVideo ? "Hide Video Window" : "Show Video Window"}
            >
              <Video className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Host/Rep Play/Pause & Stop */}
          {isHostOrRep && (
            <>
              <button
                onClick={handleTogglePlay}
                className="p-1 hover:bg-white/10 rounded-full text-primary transition-colors"
                title={mediaState.isPlaying ? "Pause music" : "Play music"}
              >
                {mediaState.isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={handleStopMedia}
                className="p-1 hover:bg-red-500/20 rounded-full text-red-400 transition-colors"
                title="Stop transmission for everyone"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          )}
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

      {/* YouTube Player: Always active in background for audio, optionally visible for video */}
      {mediaState && isYouTube && youtubeId && (
        <div
          className={
            showFloatingVideo
              ? "fixed bottom-24 right-4 sm:right-6 z-40 w-72 sm:w-80 bg-black/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in duration-200"
              : "fixed -top-[9999px] -left-[9999px] w-1 h-1 opacity-0 pointer-events-none"
          }
        >
          {showFloatingVideo && (
            <div className="flex items-center justify-between px-3 py-2 bg-white/5 border-b border-white/10 text-xs">
              <span className="font-semibold text-slate-200 truncate pr-2 flex items-center gap-1.5">
                <Radio className="w-3 h-3 text-red-500 animate-pulse" />
                {mediaState.title}
              </span>
              <button
                onClick={() => setShowFloatingVideo(false)}
                className="p-1 text-slate-400 hover:text-white rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className={showFloatingVideo ? "w-full aspect-video bg-black relative" : "w-1 h-1"}>
            <iframe
              ref={iframeRef}
              src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&enablejsapi=1&playsinline=1&controls=1&mute=${
                isMuted ? 1 : 0
              }&loop=1&playlist=${youtubeId}`}
              title={mediaState.title}
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              className="w-full h-full border-0"
            />
          </div>
        </div>
      )}

      {/* Host/Rep Open Selector Button */}
      {isHostOrRep && !mediaState && (
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/20 hover:bg-primary/30 border border-primary/40 rounded-xl text-primary text-xs font-semibold transition-all shadow-sm"
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
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
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
                    className="w-full flex items-center justify-between p-3 bg-white/5 hover:bg-primary/15 border border-white/5 hover:border-primary/30 rounded-xl text-xs text-slate-200 font-medium transition-all group text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                        {track.type === "youtube" ? <Radio className="w-3.5 h-3.5" /> : <Music className="w-3.5 h-3.5" />}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-100">{track.title}</div>
                        <div className="text-[10px] text-slate-400">
                          {track.type === "youtube" ? "YouTube Stream" : "Ambient MP3"}
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
                onChange={e => setCustomTitle(e.target.value)}
                placeholder="Optional track title (e.g. Beethoven Symphony #5)"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  value={customUrl}
                  onChange={e => setCustomUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  type="submit"
                  disabled={!customUrl.trim()}
                  className="px-4 py-2 bg-primary hover:bg-[#FCE69B] disabled:opacity-40 text-black text-xs font-bold rounded-xl transition-colors shrink-0 shadow-sm"
                >
                  Broadcast
                </button>
              </div>
              <p className="text-[10px] text-slate-500">
                Supports YouTube watch links, short URLs (`youtu.be`), live streams, or direct audio URLs.
              </p>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
