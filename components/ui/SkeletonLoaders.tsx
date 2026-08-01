/**
 * Phase 7 — shimmer placeholders.
 *
 * Every skeleton here mirrors the real component's geometry: same padding,
 * same avatar diameter, same row height. That is the whole point — when the
 * data lands the layout must not jump, so a skeleton that is merely "a grey
 * box" is worse than none at all.
 *
 * The shimmer itself is the `.skeleton` class in `globals.css` (a sweeping
 * highlight, disabled under `prefers-reduced-motion`). Pass `dark` on
 * glassmorphic surfaces such as the live video grid.
 *
 * These are pure presentational server components — no `"use client"`, so
 * `loading.tsx` files stay off the client bundle entirely.
 */

interface BoneProps {
  className?: string
  dark?: boolean
}

/** A single shimmering block. The primitive every skeleton is built from. */
export function Bone({ className = "", dark = false }: BoneProps) {
  return (
    <div
      className={`skeleton ${dark ? "skeleton-dark" : ""} rounded ${className}`}
      aria-hidden
    />
  )
}

/** Wraps a skeleton tree so assistive tech announces "loading" once, not 40 times. */
export function SkeletonRegion({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Feed
// ---------------------------------------------------------------------------

/** Mirrors `components/feed/PostCard.tsx`: header, body lines, attachment, footer. */
export function PostCardSkeleton({ withAttachment = false }: { withAttachment?: boolean }) {
  return (
    <div className="mb-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Author row */}
      <div className="flex items-start gap-3 p-5">
        <Bone className="h-10 w-10 shrink-0 rounded-full" />
        <div className="flex-1 space-y-2 pt-0.5">
          <Bone className="h-3.5 w-40 rounded-md" />
          <Bone className="h-2.5 w-24 rounded-md" />
        </div>
        <Bone className="h-5 w-5 rounded-md" />
      </div>

      {/* Body paragraph */}
      <div className="space-y-2.5 px-5 pb-4">
        <Bone className="h-3 w-full rounded-md" />
        <Bone className="h-3 w-[92%] rounded-md" />
        <Bone className="h-3 w-[68%] rounded-md" />
      </div>

      {/* Attachment chip */}
      {withAttachment && (
        <div className="px-5 pb-4">
          <div className="flex w-fit items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 pr-12">
            <Bone className="h-10 w-10 rounded" />
            <div className="space-y-2">
              <Bone className="h-3 w-36 rounded-md" />
              <Bone className="h-2.5 w-24 rounded-md" />
            </div>
          </div>
        </div>
      )}

      {/* Action bar */}
      <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/30 px-5 py-3">
        <div className="flex items-center gap-6">
          <Bone className="h-3.5 w-14 rounded-md" />
          <Bone className="h-3.5 w-24 rounded-md" />
        </div>
        <Bone className="h-4 w-4 rounded-md" />
      </div>
    </div>
  )
}

/** A stack of post skeletons — the whole feed column while it loads. */
export function PostFeedSkeleton({ count = 3 }: { count?: number }) {
  return (
    <SkeletonRegion label="Loading announcements">
      {Array.from({ length: count }, (_, i) => (
        // Alternating attachments keep the stack from looking mechanically repeated.
        <PostCardSkeleton key={i} withAttachment={i === 0} />
      ))}
    </SkeletonRegion>
  )
}

/** Mirrors `components/feed/PostComposer.tsx`. */
export function PostComposerSkeleton() {
  return (
    <div className="mb-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
        <Bone className="h-3.5 w-44 rounded-md" />
        <Bone className="h-5 w-20 rounded" />
      </div>
      <div className="space-y-2.5 p-4">
        <Bone className="h-3 w-3/4 rounded-md" />
        <Bone className="h-3 w-1/2 rounded-md" />
      </div>
      <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-4 py-3">
        <div className="flex gap-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Bone key={i} className="h-7 w-7 rounded" />
          ))}
        </div>
        <Bone className="h-9 w-44 rounded-lg" />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tables — attendance, user management, grading
// ---------------------------------------------------------------------------

interface TableSkeletonProps {
  rows?: number
  columns?: number
  /** Renders a circular avatar bone in the first cell of each row. */
  withAvatar?: boolean
  /** Renders the search/filter strip above the table head. */
  withToolbar?: boolean
  caption?: string
}

/**
 * Column widths taper left-to-right, which is how real tables read (a name
 * column is wide, a status pill is narrow) and stops the shimmer from looking
 * like graph paper.
 */
export function TableSkeleton({
  rows = 6,
  columns = 5,
  withAvatar = true,
  withToolbar = true,
  caption = "Loading table data",
}: TableSkeletonProps) {
  const widths = ["w-full", "w-4/5", "w-3/5", "w-2/3", "w-1/2", "w-3/4"]

  return (
    <SkeletonRegion label={caption}>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {withToolbar && (
          <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
            <Bone className="h-9 w-full max-w-xs rounded-lg" />
            <div className="flex gap-2">
              <Bone className="h-9 w-24 rounded-lg" />
              <Bone className="h-9 w-24 rounded-lg" />
            </div>
          </div>
        )}

        {/* Head */}
        <div
          className="grid gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: columns }, (_, i) => (
            <Bone key={i} className="h-2.5 w-16 rounded-md" />
          ))}
        </div>

        {/* Body */}
        {Array.from({ length: rows }, (_, r) => (
          <div
            key={r}
            className="grid items-center gap-4 border-b border-slate-100 px-5 py-4 last:border-b-0"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: columns }, (_, c) =>
              c === 0 && withAvatar ? (
                <div key={c} className="flex items-center gap-3">
                  <Bone className="h-8 w-8 shrink-0 rounded-full" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <Bone className="h-3 w-24 rounded-md" />
                    <Bone className="h-2 w-16 rounded-md" />
                  </div>
                </div>
              ) : (
                <Bone key={c} className={`h-3 rounded-md ${widths[c % widths.length]}`} />
              )
            )}
          </div>
        ))}
      </div>
    </SkeletonRegion>
  )
}

// ---------------------------------------------------------------------------
// Live video grid
// ---------------------------------------------------------------------------

/**
 * Dark glassmorphic tiles for the live room while LiveKit negotiates tracks.
 * Sized 16:9 so the real `<VideoTrack>` slots in without a reflow.
 */
export function VideoGridSkeleton({ tiles = 6 }: { tiles?: number }) {
  return (
    <SkeletonRegion label="Connecting to the live room">
      <div className="grid h-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: tiles }, (_, i) => (
          <div
            key={i}
            className="relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-[#0e1525]/80 backdrop-blur-xl"
          >
            <Bone dark className="absolute inset-0 rounded-none" />

            {/* Centre avatar puck — matches the camera-off placeholder. */}
            <div className="absolute inset-0 flex items-center justify-center">
              <Bone dark className="h-14 w-14 rounded-full" />
            </div>

            {/* Name plate + mic chip */}
            <div className="absolute inset-x-3 bottom-3 flex items-center justify-between">
              <Bone dark className="h-3 w-24 rounded-md" />
              <Bone dark className="h-6 w-6 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </SkeletonRegion>
  )
}

/** The right-hand rail of the live room: participants or chat. */
export function ParticipantListSkeleton({ rows = 7 }: { rows?: number }) {
  return (
    <SkeletonRegion label="Loading participants">
      <div className="space-y-1 p-3">
        <Bone dark className="mb-3 h-9 w-full rounded-lg" />
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg px-2 py-2">
            <Bone dark className="h-8 w-8 shrink-0 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Bone dark className="h-2.5 w-28 rounded-md" />
              <Bone dark className="h-2 w-16 rounded-md" />
            </div>
            <Bone dark className="h-3.5 w-3.5 rounded" />
          </div>
        ))}
      </div>
    </SkeletonRegion>
  )
}

// ---------------------------------------------------------------------------
// Dashboard furniture
// ---------------------------------------------------------------------------

/** One KPI tile. `count` renders the usual analytics row. */
export function StatCardSkeleton({ count = 1 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-start justify-between">
            <Bone className="h-2.5 w-24 rounded-md" />
            <Bone className="h-9 w-9 rounded-lg" />
          </div>
          <Bone className="mb-2.5 h-7 w-20 rounded-md" />
          <Bone className="h-2.5 w-28 rounded-md" />
        </div>
      ))}
    </>
  )
}

/** Month grid placeholder — 42 cells, matching `buildMonthGrid`. */
export function CalendarSkeleton() {
  return (
    <SkeletonRegion label="Loading calendar">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <Bone className="h-5 w-40 rounded-md" />
          <div className="flex gap-2">
            <Bone className="h-8 w-8 rounded-lg" />
            <Bone className="h-8 w-8 rounded-lg" />
          </div>
        </div>

        <div className="mb-2 grid grid-cols-7 gap-2">
          {Array.from({ length: 7 }, (_, i) => (
            <Bone key={i} className="mx-auto h-2.5 w-8 rounded-md" />
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 42 }, (_, i) => (
            <Bone key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      </div>
    </SkeletonRegion>
  )
}

/** Generic card list — upcoming classes, exam cards, approval queue. */
export function CardListSkeleton({
  count = 3,
  height = "h-28",
}: {
  count?: number
  height?: string
}) {
  return (
    <SkeletonRegion label="Loading">
      <div className="space-y-3">
        {Array.from({ length: count }, (_, i) => (
          <Bone key={i} className={`${height} w-full rounded-xl`} />
        ))}
      </div>
    </SkeletonRegion>
  )
}

/** Page title + subtitle + primary action, used at the top of every route skeleton. */
export function PageHeaderSkeleton({ withAction = true }: { withAction?: boolean }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="space-y-2.5">
        <Bone className="h-6 w-52 rounded-md" />
        <Bone className="h-3 w-80 rounded-md" />
      </div>
      {withAction && <Bone className="h-10 w-44 rounded-lg" />}
    </div>
  )
}

/**
 * The default body used by every portal `loading.tsx`: header, KPI row and a
 * two-column split. `accent` is unused visually on purpose — all three portals
 * share the same slate content surface, and only the persistent sidebar (which
 * stays mounted during navigation) is role-tinted.
 */
export function DashboardSkeleton({ stats = 4 }: { stats?: number }) {
  return (
    <SkeletonRegion label="Loading dashboard">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeaderSkeleton />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCardSkeleton count={stats} />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="space-y-4 xl:col-span-2">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <Bone className="mb-5 h-4 w-40 rounded-md" />
              <Bone className="h-56 w-full rounded-lg" />
            </div>
          </div>
          <div className="space-y-3">
            <Bone className="h-3 w-32 rounded-md" />
            <CardListSkeleton count={3} />
          </div>
        </div>
      </div>
    </SkeletonRegion>
  )
}
