"use client"

import { useEffect, useState } from "react"
import { Participant, Track } from "livekit-client"
import { ParticipantTile, useTracks } from "@livekit/components-react"
import { Mic, MicOff, VideoOff, ChevronLeft, ChevronRight, Monitor, Crown } from "lucide-react"

interface LiveGridProps {
  isTeacher?: boolean
}

const PAGE_SIZE = 9

export default function LiveGrid({ isTeacher = false }: LiveGridProps) {
  const [currentPage, setCurrentPage] = useState(0)

  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  )

  const screenShareTrack = tracks.find((t) => t.source === Track.Source.ScreenShare)
  const cameraTracks = tracks.filter((t) => t.source === Track.Source.Camera)

  const totalPages = Math.ceil(cameraTracks.length / PAGE_SIZE)

  useEffect(() => {
    if (currentPage >= totalPages && totalPages > 0) {
      setCurrentPage(totalPages - 1)
    } else if (totalPages === 0) {
      setCurrentPage(0)
    }
  }, [cameraTracks.length, currentPage, totalPages])

  // Empty State (no tracks at all)
  if (tracks.length === 0) {
    return (
      <div className="w-full h-full min-w-0 min-h-0 bg-black flex items-center justify-center p-4">
        <div className="flex flex-col items-center justify-center text-center p-6 space-y-4 max-w-sm">
          <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/25 flex items-center justify-center text-primary shadow-[0_0_30px_rgba(212,175,55,0.15)]">
            <VideoOff className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-100">Waiting for Stream</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              {isTeacher
                ? "Your live sanctuary is ready. Turn on your camera or share your screen to begin."
                : "Waiting for the guide and seekers to publish video or audio."}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // 1. Screen Sharing Presentation Mode (Google Meet Style)
  if (screenShareTrack) {
    const sharer = screenShareTrack.participant as Participant
    const sharerName = sharer.name || sharer.identity || "Presenter"

    // Sort camera tracks: speaking participants first, then the sharer/host
    const sortedCameraTracks = [...cameraTracks].sort((a, b) => {
      const pA = a.participant as Participant
      const pB = b.participant as Participant
      if (pA.isSpeaking && !pB.isSpeaking) return -1
      if (!pA.isSpeaking && pB.isSpeaking) return 1
      if (pA.identity === sharer.identity) return -1
      if (pB.identity === sharer.identity) return 1
      return 0
    })

    return (
      <div className="w-full h-full min-w-0 min-h-0 flex flex-col lg:flex-row gap-3 p-3 overflow-hidden bg-black select-none">
        {/* Main Presentation Stage */}
        <div className="flex-1 min-w-0 min-h-0 h-full relative rounded-2xl sm:rounded-3xl overflow-hidden bg-[#0a0a0d] border border-white/15 flex items-center justify-center shadow-2xl">
          <ParticipantTile
            trackRef={screenShareTrack}
            className="!w-full !h-full [&>video]:!object-contain [&>video]:!w-full [&>video]:!h-full"
          />

          {/* Presentation badge */}
          <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-black/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/15 shadow-xl">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <Monitor className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-bold text-white truncate max-w-[200px]">
              {sharerName}&apos;s Screen
            </span>
          </div>
        </div>

        {/* Docked Camera Filmstrip (side on desktop, bottom bar on mobile) */}
        {sortedCameraTracks.length > 0 && (
          <div className="w-full lg:w-72 xl:w-80 h-32 sm:h-36 lg:h-full shrink-0 flex lg:flex-col flex-row gap-2.5 overflow-x-auto lg:overflow-y-auto no-scrollbar">
            {sortedCameraTracks.map((trackRef) => {
              const participant = trackRef.participant as Participant
              const isSpeaking = participant.isSpeaking

              return (
                <div
                  key={`${participant.identity}-${trackRef.source}`}
                  className={`relative rounded-2xl overflow-hidden bg-[#121216] shrink-0 w-44 sm:w-52 lg:w-full h-full lg:h-44 transition-all duration-300 border ${
                    isSpeaking
                      ? "border-primary ring-2 ring-primary/40 shadow-[0_0_20px_rgba(212,175,55,0.25)] z-10"
                      : "border-white/10"
                  }`}
                >
                  <ParticipantTile
                    trackRef={trackRef}
                    className="!w-full !h-full [&>video]:!object-cover [&>video]:!w-full [&>video]:!h-full"
                  />

                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-none z-10">
                    <div className="flex items-center gap-1.5 bg-black/75 backdrop-blur-sm rounded-full px-2.5 py-1 max-w-[85%]">
                      {participant.isMicrophoneEnabled ? (
                        <Mic className="w-3 h-3 text-emerald-400 shrink-0" />
                      ) : (
                        <MicOff className="w-3 h-3 text-red-400 shrink-0" />
                      )}
                      <span className="text-[11px] font-semibold text-white truncate">
                        {participant.name || participant.identity}
                      </span>
                    </div>
                    {isTeacher && participant.isLocal && (
                      <span className="text-[9px] font-extrabold bg-primary text-black px-1.5 py-0.5 rounded shadow">
                        HOST
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // 2. Standard Multi-Camera Dynamic Grid (Zero Scroll, Fitted)
  const visibleTracks = cameraTracks.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)
  const count = visibleTracks.length

  // Dynamically compute optimal grid classes that fit 100% of height and width without scrolling
  let gridClass = "grid-cols-1 grid-rows-1"
  if (count === 2) {
    gridClass = "grid-cols-1 md:grid-cols-2 grid-rows-2 md:grid-rows-1"
  } else if (count >= 3 && count <= 4) {
    gridClass = "grid-cols-2 grid-rows-2"
  } else if (count >= 5 && count <= 6) {
    gridClass = "grid-cols-2 sm:grid-cols-3 grid-rows-3 sm:grid-rows-2"
  } else if (count > 6) {
    gridClass = "grid-cols-3 grid-rows-3"
  }

  return (
    <div className="w-full h-full min-w-0 min-h-0 flex flex-col relative overflow-hidden bg-black p-3 select-none">
      <div className={`grid ${gridClass} gap-3 flex-1 min-h-0 min-w-0 w-full h-full`}>
        {visibleTracks.map((trackRef) => {
          const participant = trackRef.participant as Participant
          const isSpeaking = participant.isSpeaking

          return (
            <div
              key={`${participant.identity}-${trackRef.source}`}
              className={`relative rounded-2xl sm:rounded-3xl overflow-hidden bg-[#101014] transition-all duration-300 min-w-0 min-h-0 w-full h-full flex items-center justify-center ${
                isSpeaking
                  ? "ring-2 sm:ring-4 ring-primary shadow-[0_0_30px_rgba(212,175,55,0.4)] z-10 border border-primary"
                  : "border border-white/10 ring-1 ring-white/5"
              }`}
            >
              <ParticipantTile
                trackRef={trackRef}
                className="!w-full !h-full [&>video]:!object-cover [&>video]:!w-full [&>video]:!h-full"
              />

              <div className="absolute bottom-3 left-3 flex items-center gap-2 z-10 pointer-events-none">
                <div className="flex items-center gap-1.5 bg-black/70 backdrop-blur-md rounded-full px-3 py-1.5 border border-white/10 shadow-lg">
                  {participant.isMicrophoneEnabled ? (
                    <Mic className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <MicOff className="w-3.5 h-3.5 text-red-400" />
                  )}
                  <span className="text-xs font-semibold text-white max-w-[120px] truncate">
                    {participant.name || participant.identity}
                  </span>
                  {isTeacher && participant.isLocal && (
                    <span className="text-[9px] font-extrabold bg-primary text-black px-1.5 py-0.5 rounded ml-0.5">
                      HOST
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Pagination Controls if > 9 participants */}
      {totalPages > 1 && (
        <div className="absolute top-5 right-5 flex items-center gap-2 bg-black/70 backdrop-blur-md rounded-xl p-1 border border-white/10 z-20 shadow-2xl">
          <button
            onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
            disabled={currentPage === 0}
            className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-white"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-semibold text-slate-300 px-2 tabular-nums">
            {currentPage + 1} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={currentPage === totalPages - 1}
            className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-white"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
