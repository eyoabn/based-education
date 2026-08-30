"use client"

import { useEffect, useState } from "react"
import { Participant, Track } from "livekit-client"
import { ParticipantTile, useTracks } from "@livekit/components-react"
import { Mic, MicOff, VideoOff, ChevronLeft, ChevronRight } from "lucide-react"

interface LiveGridProps {
  isTeacher?: boolean
}

const PAGE_SIZE = 9;

export default function LiveGrid({ isTeacher = false }: LiveGridProps) {
  const [currentPage, setCurrentPage] = useState(0)

  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  )

  const totalPages = Math.ceil(tracks.length / PAGE_SIZE)
  
  // Ensure currentPage is valid if tracks are removed
  useEffect(() => {
    if (currentPage >= totalPages && totalPages > 0) {
      setCurrentPage(totalPages - 1)
    } else if (totalPages === 0) {
      setCurrentPage(0)
    }
  }, [tracks.length, currentPage, totalPages])

  if (tracks.length > 0) {
    const visibleTracks = tracks.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)
    
    let gridClass = "grid-cols-1"
    if (visibleTracks.length >= 2 && visibleTracks.length <= 4) gridClass = "grid-cols-2"
    else if (visibleTracks.length > 4) gridClass = "grid-cols-3"
    
    // Calculate rows to make tiles nicely proportioned instead of squished
    let rowsClass = "grid-rows-1"
    if (visibleTracks.length > 2 && visibleTracks.length <= 6) rowsClass = "grid-rows-2"
    else if (visibleTracks.length > 6) rowsClass = "grid-rows-3"

    return (
      <div className="flex flex-col h-full relative">
        <div className={`grid ${gridClass} ${rowsClass} gap-3 p-3 flex-1 min-h-0`}>
          {visibleTracks.map((trackRef) => {
            const participant = trackRef.participant as Participant
            const isSpeaking = participant.isSpeaking

            return (
              <div
                key={`${participant.identity}-${trackRef.source}`}
                className={`relative rounded-3xl overflow-hidden bg-black transition-all duration-300 ${
                  isSpeaking
                    ? "ring-4 ring-primary shadow-[0_0_30px_rgba(212,175,55,0.4)] z-10"
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
                    <span className="text-xs font-semibold text-white max-w-[100px] truncate">
                      {participant.name || participant.identity}
                    </span>
                    {isTeacher && participant.isLocal && (
                      <span className="text-[9px] font-bold bg-primary text-black px-1.5 py-0.5 rounded ml-0.5">HOST</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/60 backdrop-blur-md rounded-xl p-1 border border-white/10 z-20">
            <button 
              onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-white"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold text-slate-300 px-2 tabular-nums">
              {currentPage + 1} / {totalPages}
            </span>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage === totalPages - 1}
              className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-white"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    )
  }

  // Empty State
  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center p-4">
      <div className="flex flex-col items-center justify-center text-center p-6 space-y-3">
        <div className="w-20 h-20 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary text-3xl font-extrabold shadow-inner">
          <VideoOff className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-200">Waiting for video streams...</h3>
        <p className="text-sm text-slate-400">
          {isTeacher ? "Please ensure your camera is enabled." : "Waiting for the guide to start the video stream."}
        </p>
      </div>
    </div>
  )
}
