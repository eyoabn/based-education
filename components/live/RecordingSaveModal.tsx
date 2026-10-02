"use client"

import { useState, useRef, useEffect } from "react"
import { Download, UploadCloud, X, Play, Pause, Trash2, CheckCircle2, Volume2, Sparkles } from "lucide-react"
import { AudioRecordingResult } from "@/hooks/useAudioRecorder"

interface RecordingSaveModalProps {
  roomId: string
  recordingResult: AudioRecordingResult
  onClose: () => void
  onDownload: (blob: Blob, filename: string) => void
  onSavedSuccess?: () => void
}

export default function RecordingSaveModal({
  roomId,
  recordingResult,
  onClose,
  onDownload,
  onSavedSuccess,
}: RecordingSaveModalProps) {
  const [title, setTitle] = useState(`Lecture Recording - ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(recordingResult.durationSec)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime)
    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(Math.round(audio.duration))
      }
    }
    const handleEnded = () => setIsPlaying(false)

    audio.addEventListener("timeupdate", handleTimeUpdate)
    audio.addEventListener("loadedmetadata", handleLoadedMetadata)
    audio.addEventListener("ended", handleEnded)

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate)
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata)
      audio.removeEventListener("ended", handleEnded)
    }
  }, [])

  const togglePlay = () => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {})
    }
  }

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60)
    const s = Math.floor(secs % 60)
    return `${mins}:${s < 10 ? "0" : ""}${s}`
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  const handleDownloadClick = () => {
    const sanitized = title.trim().replace(/[^a-zA-Z0-9_-]/g, "_") || "lecture-recording"
    onDownload(recordingResult.blob, `${sanitized}.webm`)
  }

  const handlePublishClick = async () => {
    setIsUploading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append("audio", recordingResult.blob, "recording.webm")
      formData.append("roomId", roomId)
      formData.append("title", title)
      formData.append("durationSec", String(recordingResult.durationSec || Math.round(duration)))

      const res = await fetch("/api/live/recordings", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to publish recording")
      }

      setUploadSuccess(true)
      if (onSavedSuccess) onSavedSuccess()
      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (err: any) {
      setError(err.message || "Upload failed. Please download the file to your computer.")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#0e0e14] border border-white/15 rounded-3xl w-full max-w-md p-6 sm:p-7 shadow-2xl shadow-black relative overflow-hidden flex flex-col gap-5">
        {/* Top glowing gradient */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-red-500 via-primary to-emerald-500 opacity-60" />

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-white font-bold text-base">Lecture Audio Recorded</h3>
              <p className="text-[11px] text-slate-400">
                {formatTime(recordingResult.durationSec || duration)} • {formatFileSize(recordingResult.sizeBytes)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Audio Player Preview */}
        <audio ref={audioRef} src={recordingResult.url} preload="auto" />
        <div className="p-3.5 bg-black/50 border border-white/10 rounded-2xl flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <button
              onClick={togglePlay}
              className="w-8 h-8 rounded-full bg-primary hover:bg-[#FCE69B] text-black font-bold flex items-center justify-center transition-transform active:scale-95 cursor-pointer shadow-md"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>
            <div className="flex-1 mx-3">
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
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Title input */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
            Recording Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Chapter 4 - Calculus Review"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-white text-xs placeholder-slate-500 focus:outline-hidden focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-colors"
          />
        </div>

        {/* Error message */}
        {error && (
          <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
            {error}
          </div>
        )}

        {/* Success message */}
        {uploadSuccess && (
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Successfully saved and published to class!</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
          {/* Direct Download Button */}
          <button
            onClick={handleDownloadClick}
            className="flex-1 py-3 px-4 bg-white/10 hover:bg-white/15 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
            title="Download audio file to your device immediately"
          >
            <Download className="w-4 h-4 text-primary" />
            <span>Download Audio (.webm)</span>
          </button>

          {/* Publish to Cloud & Database Button */}
          <button
            onClick={handlePublishClick}
            disabled={isUploading || uploadSuccess}
            className={`flex-1 py-3 px-4 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg active:scale-95 ${
              uploadSuccess
                ? "bg-emerald-500 text-black shadow-emerald-500/20"
                : "bg-primary hover:bg-[#FCE69B] text-black shadow-primary/20"
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span>{isUploading ? "Uploading..." : uploadSuccess ? "Saved!" : "Save to Class"}</span>
          </button>
        </div>

        {/* Discard link */}
        <div className="text-center pt-0.5">
          <button
            onClick={onClose}
            className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
          >
            Discard this recording
          </button>
        </div>
      </div>
    </div>
  )
}
