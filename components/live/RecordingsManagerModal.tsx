"use client"

import { useState, useEffect, useRef } from "react"
import {
  Mic,
  Download,
  Trash2,
  Play,
  Pause,
  X,
  Clock,
  HardDrive,
  Calendar,
  AlertCircle,
  Loader2,
  RefreshCw,
  FastForward,
} from "lucide-react"

export interface RecordingItem {
  id: string
  roomId: string
  title: string
  audioUrl: string
  durationSec: number
  fileSizeBytes: number | null
  format: string
  createdAt: string
  recordedBy?: {
    id: string
    name: string
    role: string
    avatarUrl?: string | null
  }
}

interface RecordingsManagerModalProps {
  roomId: string
  isOpen: boolean
  onClose: () => void
  isTeacher?: boolean
}

export default function RecordingsManagerModal({
  roomId,
  isOpen,
  onClose,
  isTeacher = false,
}: RecordingsManagerModalProps) {
  const [recordings, setRecordings] = useState<RecordingItem[]>([])
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [activePlayingId, setActivePlayingId] = useState<string | null>(null)
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  const audioRef = useRef<HTMLAudioElement | null>(null)

  const fetchRecordings = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/live/recordings?room=${encodeURIComponent(roomId)}`)
      if (res.ok) {
        const data = await res.json()
        setRecordings(data.recordings || [])
      }
    } catch (e) {
      console.error("Failed to load recordings:", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchRecordings()
    } else {
      if (audioRef.current) {
        audioRef.current.pause()
        setActivePlayingId(null)
      }
    }
  }, [isOpen, roomId])

  const handlePlayToggle = (rec: RecordingItem) => {
    if (activePlayingId === rec.id) {
      if (audioRef.current?.paused) {
        audioRef.current.play()
      } else {
        audioRef.current?.pause()
        setActivePlayingId(null)
      }
    } else {
      setActivePlayingId(rec.id)
      if (audioRef.current) {
        audioRef.current.src = rec.audioUrl
        audioRef.current.playbackRate = playbackSpeed
        audioRef.current.play().catch(() => {})
      }
    }
  }

  const handleSpeedCycle = () => {
    const speeds = [1, 1.25, 1.5, 2]
    const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length
    const nextSpeed = speeds[nextIdx]
    setPlaybackSpeed(nextSpeed)
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed
    }
  }

  const handleDownload = (rec: RecordingItem) => {
    const a = document.createElement("a")
    a.href = rec.audioUrl
    a.download = `${rec.title.replace(/[^a-zA-Z0-9_-]/g, "_")}.webm`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/live/recordings?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      })
      if (res.ok) {
        setRecordings(prev => prev.filter(r => r.id !== id))
        if (activePlayingId === id && audioRef.current) {
          audioRef.current.pause()
          setActivePlayingId(null)
        }
      }
    } catch (e) {
      console.error("Failed to delete recording:", e)
    } finally {
      setDeletingId(null)
      setConfirmDeleteId(null)
    }
  }

  const formatSecs = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = Math.floor(secs % 60)
    return `${m}:${s < 10 ? "0" : ""}${s}`
  }

  const formatSize = (bytes: number | null) => {
    if (!bytes) return "—"
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-200">
      {/* Hidden global audio element */}
      <audio
        ref={audioRef}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onEnded={() => setActivePlayingId(null)}
      />

      <div className="bg-[#0e0e14] border border-white/15 rounded-3xl w-full max-w-xl max-h-[85vh] shadow-2xl flex flex-col overflow-hidden relative">
        {/* Top glow line */}
        <div className="h-1 bg-gradient-to-r from-primary via-amber-400 to-primary/40 w-full" />

        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-white font-bold text-base sm:text-lg">Class Voice Recordings</h3>
              <p className="text-slate-400 text-xs">
                {recordings.length} {recordings.length === 1 ? "lecture recording" : "lecture recordings"} available
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchRecordings}
              disabled={loading}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
              title="Refresh recordings"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-primary" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Recordings List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {loading && recordings.length === 0 ? (
            <div className="py-16 text-center text-slate-400 flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-xs">Loading recorded lectures...</p>
            </div>
          ) : recordings.length === 0 ? (
            <div className="py-16 text-center text-slate-400 flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500">
                <Mic className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-white">No recordings yet</p>
              <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                The instructor or co-host can record voice lectures at any time using the microphone recording button.
              </p>
            </div>
          ) : (
            recordings.map((rec) => {
              const isPlaying = activePlayingId === rec.id && !audioRef.current?.paused
              return (
                <div
                  key={rec.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    activePlayingId === rec.id
                      ? "bg-primary/10 border-primary/40 shadow-lg shadow-primary/5"
                      : "bg-white/[0.03] hover:bg-white/[0.06] border-white/10"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      {/* Play/Pause Button */}
                      <button
                        onClick={() => handlePlayToggle(rec)}
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-transform active:scale-95 cursor-pointer shadow-md ${
                          isPlaying
                            ? "bg-primary text-black font-bold"
                            : "bg-white/10 hover:bg-white/20 text-white"
                        }`}
                        title={isPlaying ? "Pause" : "Play recording"}
                      >
                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                      </button>

                      <div className="min-w-0">
                        <h4 className="text-white font-bold text-sm truncate">{rec.title}</h4>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400 mt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-500" />
                            {formatSecs(rec.durationSec)}
                          </span>
                          <span className="flex items-center gap-1">
                            <HardDrive className="w-3 h-3 text-slate-500" />
                            {formatSize(rec.fileSizeBytes)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-500" />
                            {new Date(rec.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions: Download & Delete */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Speed multiplier button (active when playing) */}
                      {activePlayingId === rec.id && (
                        <button
                          onClick={handleSpeedCycle}
                          className="px-2 py-1 rounded-lg bg-primary/20 text-primary border border-primary/30 text-[10px] font-bold transition-colors cursor-pointer"
                          title="Change playback speed"
                        >
                          {playbackSpeed}x
                        </button>
                      )}

                      {/* Download Button */}
                      <button
                        onClick={() => handleDownload(rec)}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition-colors cursor-pointer"
                        title="Download audio recording to device"
                      >
                        <Download className="w-4 h-4" />
                      </button>

                      {/* Delete Button (for Teacher & Admin) */}
                      {isTeacher && (
                        <div className="relative">
                          {confirmDeleteId === rec.id ? (
                            <div className="flex items-center gap-1 bg-red-600/20 border border-red-500/40 rounded-xl p-1 animate-in fade-in">
                              <button
                                onClick={() => handleDelete(rec.id)}
                                disabled={deletingId === rec.id}
                                className="px-2 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold cursor-pointer"
                              >
                                {deletingId === rec.id ? "..." : "Delete"}
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="p-1 text-slate-400 hover:text-white rounded"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteId(rec.id)}
                              className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                              title="Delete this recording permanently"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Scrubber when active */}
                  {activePlayingId === rec.id && (
                    <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-3">
                      <input
                        type="range"
                        min="0"
                        max={duration || 1}
                        value={currentTime}
                        onChange={(e) => {
                          const val = Number(e.target.value)
                          setCurrentTime(val)
                          if (audioRef.current) audioRef.current.currentTime = val
                        }}
                        className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                      <span className="text-[10px] font-mono text-slate-400 shrink-0">
                        {formatSecs(currentTime)} / {formatSecs(duration)}
                      </span>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
