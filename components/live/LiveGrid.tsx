"use client"

import React, { useEffect, useState, useMemo } from "react"
import { Participant, Track } from "livekit-client"
import { ParticipantTile, useTracks } from "@livekit/components-react"
import {
  Mic,
  MicOff,
  VideoOff,
  ChevronLeft,
  ChevronRight,
  Monitor,
  Pin,
  PinOff,
  Maximize2,
} from "lucide-react"

interface LiveGridProps {
  isTeacher?: boolean
}

const PAGE_SIZE = 9

export default function LiveGrid({ isTeacher = false }: LiveGridProps) {
  const [currentPage, setCurrentPage] = useState(0)
  const [pinnedTrackId, setPinnedTrackId] = useState<string | null>(null)

  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  )

  const screenShareTrack = tracks.find((t) => t.source === Track.Source.ScreenShare)
  const cameraTracks = tracks.filter((t) => t.source === Track.Source.Camera)

  // Find currently pinned track or fallback to active screen share
  const spotlightTrack = useMemo(() => {
    if (pinnedTrackId) {
      const match = tracks.find(
        (t) => `${t.participant.identity}-${t.source}` === pinnedTrackId
      )
      if (match) return match
    }
    return screenShareTrack || null
  }, [pinnedTrackId, tracks, screenShareTrack])

  const totalPages = Math.ceil(cameraTracks.length / PAGE_SIZE)

  useEffect(() => {
    if (currentPage >= totalPages && totalPages > 0) {
      setCurrentPage(totalPages - 1)
    } else if (totalPages === 0) {
      setCurrentPage(0)
    }
  }, [cameraTracks.length, currentPage, totalPages])

  // If pinned track disconnects, reset pin
  useEffect(() => {
    if (pinnedTrackId) {
      const exists = tracks.some(
        (t) => `${t.participant.identity}-${t.source}` === pinnedTrackId
      )
      if (!exists) setPinnedTrackId(null)
    }
  }, [tracks, pinnedTrackId])

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

  // 1. SPOTLIGHT / PINNED / SCREEN SHARE MODE
  if (spotlightTrack) {
    const isScreen = spotlightTrack.source === Track.Source.ScreenShare
    const isExplicitlyPinned = `${spotlightTrack.participant.identity}-${spotlightTrack.source}` === pinnedTrackId
    const presenter = spotlightTrack.participant as Participant
    const presenterName = presenter.name || presenter.identity || "Presenter"

    // Remaining tracks for the docked filmstrip
    const filmstripTracks = tracks
      .filter((t) => t !== spotlightTrack)
      .sort((a, b) => {
        const pA = a.participant as Participant
        const pB = b.participant as Participant
        if (pA.isSpeaking && !pB.isSpeaking) return -1
        if (!pA.isSpeaking && pB.isSpeaking) return 1
        return 0
      })

    return (
      <div className="w-full h-full min-w-0 min-h-0 flex flex-col lg:flex-row gap-3 p-2 sm:p-3 overflow-hidden bg-black select-none">
        {/* Main Stage (Pinned / Spotlighted) */}
        <div
          onDoubleClick={() => {
            if (isExplicitlyPinned) setPinnedTrackId(null)
          }}
          className="flex-1 min-w-0 min-h-0 h-full relative rounded-2xl sm:rounded-3xl overflow-hidden bg-[#0a0a0d] border border-white/15 flex items-center justify-center shadow-2xl group"
        >
          <ParticipantTile
            trackRef={spotlightTrack}
            className={`!w-full !h-full ${
              isScreen
                ? "[&>video]:!object-contain [&>video]:!w-full [&>video]:!h-full"
                : "[&>video]:!object-cover [&>video]:!w-full [&>video]:!h-full"
            }`}
          />

          {/* Top Status & Unpin Badge */}
          <div className="absolute top-3 sm:top-4 left-3 sm:left-4 z-20 flex items-center gap-2">
            <div className="flex items-center gap-2 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/15 shadow-xl">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              {isScreen ? (
                <Monitor className="w-3.5 h-3.5 text-primary" />
              ) : (
                <Pin className="w-3.5 h-3.5 text-primary fill-primary" />
              )}
              <span className="text-xs font-bold text-white truncate max-w-[140px] sm:max-w-[200px]">
                {isScreen ? `${presenterName}'s Screen` : `Pinned: ${presenterName}`}
              </span>
            </div>

            {/* Unpin Button if pinned */}
            {isExplicitlyPinned && (
              <button
                onClick={() => setPinnedTrackId(null)}
                className="flex items-center gap-1 bg-black/80 hover:bg-black/95 text-slate-300 hover:text-white px-2.5 py-1.5 rounded-full border border-white/15 text-xs font-semibold backdrop-blur-md transition-all cursor-pointer shadow-lg"
                title="Unpin screen and return to grid"
              >
                <PinOff className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[11px]">Unpin</span>
              </button>
            )}
          </div>

          {/* Bottom Participant Info on Main Stage */}
          <div className="absolute bottom-3 left-3 flex items-center gap-2 z-10 pointer-events-none">
            <div className="flex items-center gap-1.5 bg-black/75 backdrop-blur-md rounded-full px-3 py-1 border border-white/10 shadow-lg">
              {presenter.isMicrophoneEnabled ? (
                <Mic className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <MicOff className="w-3.5 h-3.5 text-red-400" />
              )}
              <span className="text-xs font-semibold text-white truncate max-w-[140px]">
                {presenterName}
              </span>
              {isTeacher && presenter.isLocal && (
                <span className="text-[9px] font-extrabold bg-primary text-black px-1.5 py-0.5 rounded">
                  HOST
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Docked Filmstrip for Remaining Participants (Side on desktop, bottom ribbon on mobile) */}
        {filmstripTracks.length > 0 && (
          <div className="w-full lg:w-64 xl:w-72 h-28 sm:h-32 lg:h-full shrink-0 flex lg:flex-col flex-row gap-2 overflow-x-auto lg:overflow-y-auto no-scrollbar">
            {filmstripTracks.map((trackRef) => {
              const participant = trackRef.participant as Participant
              const isSpeaking = participant.isSpeaking
              const trackKey = `${participant.identity}-${trackRef.source}`

              return (
                <div
                  key={trackKey}
                  onDoubleClick={() => setPinnedTrackId(trackKey)}
                  className={`group relative rounded-xl sm:rounded-2xl overflow-hidden bg-[#121216] shrink-0 w-36 sm:w-44 lg:w-full h-full lg:h-40 transition-all duration-300 border ${
                    isSpeaking
                      ? "border-primary ring-2 ring-primary/40 shadow-[0_0_20px_rgba(212,175,55,0.25)] z-10"
                      : "border-white/10 hover:border-white/25"
                  }`}
                >
                  <ParticipantTile
                    trackRef={trackRef}
                    className="!w-full !h-full [&>video]:!object-cover [&>video]:!w-full [&>video]:!h-full"
                  />

                  {/* Pin Tile Button */}
                  <button
                    onClick={() => setPinnedTrackId(trackKey)}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 hover:bg-primary text-slate-300 hover:text-black opacity-80 sm:opacity-0 group-hover:opacity-100 transition-all z-20 cursor-pointer shadow-md"
                    title={`Pin ${participant.name || participant.identity}`}
                  >
                    <Pin className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </button>

                  {/* Bottom Name Tag */}
                  <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between pointer-events-none z-10">
                    <div className="flex items-center gap-1 bg-black/75 backdrop-blur-sm rounded-full px-2 py-0.5 max-w-[85%]">
                      {participant.isMicrophoneEnabled ? (
                        <Mic className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                      ) : (
                        <MicOff className="w-2.5 h-2.5 text-red-400 shrink-0" />
                      )}
                      <span className="text-[10px] font-semibold text-white truncate">
                        {participant.name || participant.identity}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // 2. STANDARD DYNAMIC MULTI-CAMERA GRID (Fit viewport without scroll)
  const visibleTracks = cameraTracks.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)
  const count = visibleTracks.length

  // Dynamically compute optimal grid classes that fit 100% of height and width without scrolling
  let gridClass = "grid-cols-1 grid-rows-1"
  if (count === 2) {
    gridClass = "grid-cols-1 sm:grid-cols-2 grid-rows-2 sm:grid-rows-1"
  } else if (count >= 3 && count <= 4) {
    gridClass = "grid-cols-2 grid-rows-2"
  } else if (count >= 5 && count <= 6) {
    gridClass = "grid-cols-2 sm:grid-cols-3 grid-rows-3 sm:grid-rows-2"
  } else if (count > 6) {
    gridClass = "grid-cols-2 sm:grid-cols-3 md:grid-cols-3 grid-rows-4 sm:grid-rows-3"
  }

  return (
    <div className="w-full h-full min-w-0 min-h-0 flex flex-col relative overflow-hidden bg-black p-2 sm:p-3 select-none">
      <div className={`grid ${gridClass} gap-2 sm:gap-3 flex-1 min-h-0 min-w-0 w-full h-full`}>
        {visibleTracks.map((trackRef) => {
          const participant = trackRef.participant as Participant
          const isSpeaking = participant.isSpeaking
          const trackKey = `${participant.identity}-${trackRef.source}`

          return (
            <div
              key={trackKey}
              onDoubleClick={() => setPinnedTrackId(trackKey)}
              className={`group relative rounded-2xl sm:rounded-3xl overflow-hidden bg-[#101014] transition-all duration-300 min-w-0 min-h-0 w-full h-full flex items-center justify-center ${
                isSpeaking
                  ? "ring-2 sm:ring-4 ring-primary shadow-[0_0_30px_rgba(212,175,55,0.4)] z-10 border border-primary"
                  : "border border-white/10 ring-1 ring-white/5 hover:border-white/20"
              }`}
            >
              <ParticipantTile
                trackRef={trackRef}
                className="!w-full !h-full [&>video]:!object-cover [&>video]:!w-full [&>video]:!h-full"
              />

              {/* Pin Screen Button (Hover on desktop, subtle on touch) */}
              <button
                onClick={() => setPinnedTrackId(trackKey)}
                className="absolute top-2.5 right-2.5 p-2 rounded-xl bg-black/70 hover:bg-primary text-slate-300 hover:text-black opacity-80 sm:opacity-0 group-hover:opacity-100 transition-all z-20 cursor-pointer shadow-lg backdrop-blur-sm"
                title={`Pin ${participant.name || participant.identity}'s screen`}
              >
                <Pin className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>

              {/* Bottom Participant Info */}
              <div className="absolute bottom-2.5 sm:bottom-3 left-2.5 sm:left-3 flex items-center gap-2 z-10 pointer-events-none">
                <div className="flex items-center gap-1.5 bg-black/75 backdrop-blur-md rounded-full px-2.5 sm:px-3 py-1 sm:py-1.5 border border-white/10 shadow-lg">
                  {participant.isMicrophoneEnabled ? (
                    <Mic className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400" />
                  ) : (
                    <MicOff className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-red-400" />
                  )}
                  <span className="text-[11px] sm:text-xs font-semibold text-white max-w-[100px] sm:max-w-[130px] truncate">
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
        <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/75 backdrop-blur-md rounded-xl p-1 border border-white/10 z-20 shadow-2xl">
          <button
            onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
            disabled={currentPage === 0}
            className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-white cursor-pointer"
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
            className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-white cursor-pointer"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
