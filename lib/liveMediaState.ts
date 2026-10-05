/**
 * In-Memory Media State Cache for Live Sessions
 * Ensures latecomers instantly get the current playing track, title, and synchronized timestamp
 */

export interface CachedMediaState {
  url: string
  title: string
  isPlaying: boolean
  currentTime: number // seconds at startedAt
  startedAt?: number // epoch timestamp in ms when play started/resumed
  type: "audio" | "video" | "youtube"
  updatedAt: number
}

// In-memory map keyed by normalized room identifier
const mediaStateCache = new Map<string, CachedMediaState | null>()

function normalizeRoomKey(room: string): string {
  try {
    return decodeURIComponent(room).trim().toLowerCase()
  } catch {
    return room.trim().toLowerCase()
  }
}

export function setRoomMediaState(room: string, state: any): void {
  const key = normalizeRoomKey(room)
  if (!state) {
    mediaStateCache.delete(key)
    return
  }

  const now = Date.now()
  const cached: CachedMediaState = {
    url: state.url,
    title: state.title || "Live Audio Stream",
    isPlaying: !!state.isPlaying,
    currentTime: typeof state.currentTime === "number" ? state.currentTime : 0,
    startedAt: state.isPlaying ? (state.startedAt || now) : undefined,
    type: state.type || "audio",
    updatedAt: now,
  }

  mediaStateCache.set(key, cached)
}

export function getRoomMediaState(room: string): CachedMediaState | null {
  const key = normalizeRoomKey(room)
  const cached = mediaStateCache.get(key)
  if (!cached) return null

  // If the stream is currently playing, calculate up-to-date currentTime
  if (cached.isPlaying && cached.startedAt) {
    const elapsed = (Date.now() - cached.startedAt) / 1000
    return {
      ...cached,
      currentTime: Math.max(0, cached.currentTime + elapsed),
    }
  }

  return cached
}

export function clearRoomMediaState(room: string): void {
  const key = normalizeRoomKey(room)
  mediaStateCache.delete(key)
}
