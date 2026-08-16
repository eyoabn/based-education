"use client"

import { useState, useEffect, useRef } from "react"
import { Play, Pause, Volume2, VolumeX, Music, Video, X, ExternalLink, Sparkles } from "lucide-react"

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

const PRESET_TRACKS = [
  {
    title: "Lofi Study Beats",
    type: "audio" as const,
    url: "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3",
  },
  {
    title: "Deep Focus Ambient",
    type: "audio" as const,
    url: "https://cdn.pixabay.com/download/audio/2022/03/15/audio-c86256f103.mp3?filename=ambient-piano-10781.mp3",
  },
  {
    title: "Rain & Thunderstorm Relaxation",
    type: "audio" as const,
    url: "https://cdn.pixabay.com/download/audio/2021/09/06/audio-8612140a32.mp3?filename=rain-and-thunder-14169.mp3",
  },
]

export default function SharedMediaPlayer({ mediaState, isHostOrRep, onUpdateMediaState }: SharedMediaPlayerProps) {
  const [showModal, setShowModal] = useState(false)
  const [customUrl, setCustomUrl] = useState("")
  const [isMuted, setIsMuted] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (!audioRef.current || !mediaState) return

    if (mediaState.isPlaying) {
      audioRef.current.play().catch(() => {})
    } else {
      audioRef.current.pause()
    }
  }, [mediaState])

  const handleSelectPreset = (preset: typeof PRESET_TRACKS[0]) => {
    onUpdateMediaState({
      url: preset.url,
      title: preset.title,
      isPlaying: true,
      currentTime: 0,
      type: preset.type,
    })
    setShowModal(false)
  }

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!customUrl.trim()) return

    onUpdateMediaState({
      url: customUrl.trim(),
      title: "Shared Media Stream",
      isPlaying: true,
      currentTime: 0,
      type: customUrl.includes("youtube.com") || customUrl.includes("youtu.be") ? "youtube" : "audio",
    })
    setCustomUrl("")
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
  }

  return (
    <>
      {/* Media Control Bar Floating Badge (Active stream) */}
      {mediaState && (
        <div className="flex items-center gap-3 bg-[#0d1424]/90 backdrop-blur-md border border-indigo-500/30 px-3 py-1.5 rounded-full shadow-lg text-xs text-slate-200">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <Music className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
          <span className="font-medium truncate max-w-[150px]">{mediaState.title}</span>

          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-1 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors"
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          {isHostOrRep && (
            <>
              <button
                onClick={handleTogglePlay}
                className="p-1 hover:bg-white/10 rounded-full text-indigo-400 transition-colors"
              >
                {mediaState.isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={handleStopMedia}
                className="p-1 hover:bg-red-500/20 rounded-full text-red-400 transition-colors"
                title="Stop transmission for room"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {/* Hidden audio element for HTML5 streams */}
          {mediaState.type !== "youtube" && (
            <audio
              ref={audioRef}
              src={mediaState.url}
              muted={isMuted}
              loop
              onPlay={() => {}}
            />
          )}
        </div>
      )}

      {/* Host/Rep Open Selector Button */}
      {isHostOrRep && !mediaState && (
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 rounded-xl text-indigo-300 text-xs font-semibold transition-all shadow-sm"
        >
          <Music className="w-3.5 h-3.5 text-indigo-400" />
          <span>Stream Music/Video</span>
        </button>
      )}

      {/* Modal Selection */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e1525] border border-white/10 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">Broadcast Music / Video to Class</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Presets */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Preset Ambient Tracks</span>
              <div className="space-y-1.5">
                {PRESET_TRACKS.map((track, i) => (
                  <button
                    key={i}
                    onClick={() => handleSelectPreset(track)}
                    className="w-full flex items-center justify-between p-2.5 bg-white/5 hover:bg-indigo-600/20 border border-white/5 hover:border-indigo-500/30 rounded-xl text-xs text-slate-200 font-medium transition-all group"
                  >
                    <div className="flex items-center gap-2.5">
                      <Music className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                      <span>{track.title}</span>
                    </div>
                    <Play className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400" />
                  </button>
                ))}
              </div>
            </div>

            {/* Custom URL */}
            <form onSubmit={handleCustomSubmit} className="space-y-2 pt-2 border-t border-white/10">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Or Paste Custom Media / YouTube URL</span>
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  value={customUrl}
                  onChange={e => setCustomUrl(e.target.value)}
                  placeholder="https://..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  disabled={!customUrl.trim()}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-semibold rounded-xl transition-colors"
                >
                  Broadcast
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
