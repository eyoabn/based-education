"use client"

import { useEffect, useRef, useState } from "react"
import { Participant, Track } from "livekit-client"
import { ParticipantTile, useTracks } from "@livekit/components-react"
import { Mic, MicOff, Video, VideoOff } from "lucide-react"

interface LiveGridProps {
  isTeacher?: boolean
}

export default function LiveGrid({ isTeacher = false }: LiveGridProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [hasLocalStream, setHasLocalStream] = useState(false)
  const [localCamOn, setLocalCamOn] = useState(true)

  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  )



  if (tracks.length > 0) {
    const gridClass =
      tracks.length === 1
        ? "grid-cols-1"
        : tracks.length <= 4
          ? "grid-cols-2"
          : "grid-cols-3"

    return (
      <div className={`grid ${gridClass} gap-3 h-full p-3 auto-rows-fr`}>
        {tracks.map((trackRef) => {
          const participant = trackRef.participant as Participant
          const isSpeaking = participant.isSpeaking

          return (
            <div
              key={participant.identity}
              className={`relative rounded-2xl overflow-hidden bg-[#12182b] transition-all duration-300 ${
                isSpeaking
                  ? "ring-4 ring-indigo-500 shadow-[0_0_30px_rgba(79,70,229,0.4)]"
                  : "ring-1 ring-white/10"
              }`}
            >
              <ParticipantTile trackRef={trackRef} className="!h-full !w-full" />
              
              <div className="absolute bottom-3 left-3 flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1.5">
                  {participant.isMicrophoneEnabled ? (
                    <Mic className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <MicOff className="w-3.5 h-3.5 text-red-400" />
                  )}
                  <span className="text-xs font-semibold text-white">
                    {participant.name || participant.identity}
                  </span>
                  {isTeacher && (
                    <span className="text-[9px] font-bold bg-indigo-600 px-1.5 py-0.5 rounded text-white ml-0.5">HOST</span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // Empty State
  return (
    <div className="relative w-full h-full bg-[#0d1322] flex items-center justify-center p-4">
      <div className="flex flex-col items-center justify-center text-center p-6 space-y-3">
        <div className="w-20 h-20 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 text-3xl font-extrabold shadow-inner">
          <VideoOff className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-200">Waiting for video streams...</h3>
        <p className="text-sm text-slate-400">
          {isTeacher ? "Please ensure your camera is enabled." : "Waiting for the host to start the video stream."}
        </p>
      </div>
    </div>
  )
}
