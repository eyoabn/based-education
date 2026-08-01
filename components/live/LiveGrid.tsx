"use client"

import { Participant, Track } from "livekit-client"
import { ParticipantTile, useTracks } from "@livekit/components-react"
import { Mic, MicOff, VideoOff } from "lucide-react"

interface LiveGridProps {
  isTeacher?: boolean
}

export default function LiveGrid({ isTeacher = false }: LiveGridProps) {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  )

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
                ? "ring-4 ring-indigo-500 ring-opacity-80 shadow-[0_0_30px_rgba(79,70,229,0.4)]"
                : "ring-1 ring-white/10"
            }`}
          >
            <ParticipantTile trackRef={trackRef} className="!h-full !w-full" />
            
            {/* Name Tag */}
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
                {isTeacher && participant.identity === participant.identity && (
                  <span className="text-[9px] font-bold bg-indigo-600 px-1.5 py-0.5 rounded text-white ml-0.5">HOST</span>
                )}
              </div>
            </div>

            {/* Speaking indicator pulse */}
            {isSpeaking && (
              <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-indigo-600/80 backdrop-blur-sm px-2.5 py-1 rounded-full">
                <div className="flex gap-0.5">
                  {[...Array(3)].map((_, i) => (
                    <span
                      key={i}
                      className="w-0.5 bg-white rounded-full animate-bounce"
                      style={{ height: `${8 + i * 4}px`, animationDelay: `${i * 0.1}s` }}
                    />
                  ))}
                </div>
                <span className="text-[10px] font-bold text-white">Speaking</span>
              </div>
            )}

            {/* Camera off fallback */}
            {!participant.isCameraEnabled && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#12182b]">
                <div className="w-16 h-16 rounded-full bg-indigo-600/30 flex items-center justify-center mb-3 border-2 border-indigo-500/30">
                  <span className="text-2xl font-bold text-white uppercase">
                    {(participant.name || participant.identity || "U").charAt(0)}
                  </span>
                </div>
                <VideoOff className="w-4 h-4 text-slate-500 mb-1" />
                <p className="text-xs text-slate-400">Camera off</p>
              </div>
            )}
          </div>
        )
      })}

      {/* Empty state */}
      {tracks.length === 0 && (
        <div className="col-span-full flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-indigo-500/10 border-2 border-indigo-500/20 flex items-center justify-center mb-4 animate-pulse">
            <VideoOff className="w-7 h-7 text-indigo-400" />
          </div>
          <p className="text-slate-400 text-sm font-medium">Waiting for participants...</p>
        </div>
      )}
    </div>
  )
}
