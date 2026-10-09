import { type ComponentType, type ReactNode } from "react"
import Link from "next/link"
import {
  CalendarX2,
  ClipboardCheck,
  FileQuestion,
  Inbox,
  Megaphone,
  Search,
  UserRoundCheck,
  Users,
  type LucideProps,
} from "lucide-react"

/**
 * Phase 7 — the "there is nothing here" surface.
 *
 * An empty list must never look like a broken one. Every zero-data view gets
 * the same three-part shape — a haloed glyph, a plain-language sentence, and
 * (where one exists) the single action that fills the void — so a student with
 * no announcements and an admin with no pending approvals read the same
 * emptiness the same way.
 *
 * Two deliberate distinctions:
 *  - `tone="dark"` for the live room and exam shells, where a white card
 *    would punch a hole in the glassmorphic surface.
 *  - `variant="filtered"` for "your filter matched nothing", which is a
 *    different message from "this collection is empty" — the fix is to clear
 *    the filter, not to create the first record.
 */

export type EmptyStateTone = "light" | "dark"
export type EmptyStateSize = "sm" | "md" | "lg"

export interface EmptyStateAction {
  label: string
  /** Client handler. Ignored when `href` is set. */
  onClick?: () => void
  /** Renders a `next/link` instead of a button — keeps navigation prefetched. */
  href?: string
  icon?: ComponentType<LucideProps>
}

export interface EmptyStateProps {
  title: string
  description?: ReactNode
  /** Any lucide icon component, e.g. `Megaphone`. Defaults to an inbox. */
  icon?: ComponentType<LucideProps>
  /** Primary call to action. */
  actionButton?: EmptyStateAction
  /** Quiet secondary link, e.g. "Clear filters". */
  secondaryAction?: EmptyStateAction
  tone?: EmptyStateTone
  size?: EmptyStateSize
  /**
   * `"empty"` — the collection has no records yet (offer to create one).
   * `"filtered"` — records exist but none match (offer to widen the search).
   */
  variant?: "empty" | "filtered"
  /** Drop the card chrome when the parent already provides a bordered surface. */
  bare?: boolean
  className?: string
  /** Extra content below the actions, e.g. a keyboard hint. */
  children?: ReactNode
}

const SIZES: Record<EmptyStateSize, { pad: string; halo: string; glyph: string; title: string }> = {
  sm: { pad: "px-6 py-8", halo: "w-11 h-11", glyph: "w-5 h-5", title: "text-sm" },
  md: { pad: "px-6 py-12", halo: "w-14 h-14", glyph: "w-6 h-6", title: "text-base" },
  lg: { pad: "px-6 py-20", halo: "w-20 h-20", glyph: "w-9 h-9", title: "text-lg" },
}

function ActionControl({
  action,
  kind,
  tone,
}: {
  action: EmptyStateAction
  kind: "primary" | "secondary"
  tone: EmptyStateTone
}) {
  const Icon = action.icon

  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 min-h-[44px]"

  const styles =
    kind === "primary"
      ? `${base} bg-gradient-to-r from-[#d4af37] to-[#e6ca65] px-5 py-2.5 text-[#050505] font-semibold shadow-lg shadow-[rgba(212,175,55,0.25)] hover:brightness-110 hover:-translate-y-px focus-visible:ring-[#d4af37]`
      : `${base} px-4 py-2.5 bg-[#181817] text-[#9d9b95] border border-white/[0.08] hover:border-[rgba(212,175,55,0.3)] hover:text-[#f7f3e8] focus-visible:ring-white/20`

  const inner = (
    <>
      {Icon && <Icon className="h-4 w-4" />}
      {action.label}
    </>
  )

  if (action.href) {
    return (
      <Link href={action.href} className={styles}>
        {inner}
      </Link>
    )
  }

  return (
    <button type="button" onClick={action.onClick} className={styles}>
      {inner}
    </button>
  )
}

export default function EmptyState({
  title,
  description,
  icon,
  actionButton,
  secondaryAction,
  tone = "dark",
  size = "md",
  variant = "empty",
  bare = false,
  className = "",
  children,
}: EmptyStateProps) {
  const Icon = icon ?? (variant === "filtered" ? Search : Inbox)
  const s = SIZES[size]

  const surface = bare
    ? ""
    : "rounded-2xl border border-white/[0.08] bg-[#111110] shadow-xl shadow-black/40"

  return (
    <div
      role="status"
      className={`flex flex-col items-center justify-center text-center ${s.pad} ${surface} ${className}`}
    >
      {/* Haloed glyph — a soft ring keeps it from reading as a disabled icon. */}
      <div
        aria-hidden
        className={`mb-4 flex ${s.halo} items-center justify-center rounded-2xl bg-[rgba(212,175,55,0.1)] text-[#d4af37] ring-1 ring-[rgba(212,175,55,0.25)]`}
      >
        <Icon className={s.glyph} strokeWidth={1.5} />
      </div>

      <h3 className={`font-bold ${s.title} text-[#f7f3e8]`}>
        {title}
      </h3>

      {description && (
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-[#9d9b95]">
          {description}
        </p>
      )}

      {(actionButton || secondaryAction) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {actionButton && <ActionControl action={actionButton} kind="primary" tone={tone} />}
          {secondaryAction && (
            <ActionControl action={secondaryAction} kind="secondary" tone={tone} />
          )}
        </div>
      )}

      {children && <div className="mt-4">{children}</div>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Named presets
// ---------------------------------------------------------------------------

/**
 * The copy the brief specifies, in one place. Call sites pass only what varies
 * (usually a click handler), so the same sentence can't drift between the
 * teacher's feed and the student's.
 */
type PresetProps = Pick<EmptyStateProps, "size" | "className" | "bare"> & {
  actionButton?: EmptyStateAction
}

export function EmptyFeed({
  canPost = false,
  onCompose,
  ...rest
}: PresetProps & { canPost?: boolean; onCompose?: () => void }) {
  return (
    <EmptyState
      icon={Megaphone}
      title="No announcements yet"
      description={
        canPost
          ? "Check back soon or create your first post — your students are notified the moment you publish."
          : "Check back soon. New posts from your teachers land here first."
      }
      actionButton={
        canPost && onCompose
          ? { label: "Write your first post", onClick: onCompose, icon: Megaphone }
          : undefined
      }
      {...rest}
    />
  )
}

export function EmptyCalendar({ onSchedule, ...rest }: PresetProps & { onSchedule?: () => void }) {
  return (
    <EmptyState
      icon={CalendarX2}
      title="Nothing on the calendar"
      description="No live classes or exams scheduled for this week."
      actionButton={
        onSchedule
          ? { label: "Schedule a live class", onClick: onSchedule, icon: CalendarX2 }
          : undefined
      }
      {...rest}
    />
  )
}

export function EmptyAttendance(props: PresetProps) {
  return (
    <EmptyState
      icon={Users}
      title="No attendance logs found for this room"
      description="Once students join a live session their presence is recorded here automatically."
      {...props}
    />
  )
}

export function EmptyApprovals(props: PresetProps) {
  return (
    <EmptyState
      icon={UserRoundCheck}
      title="All teacher applications reviewed!"
      description="No pending verification requests. New applicants will appear here the moment they sign up."
      {...props}
    />
  )
}

export function EmptySubmissions(props: PresetProps) {
  return (
    <EmptyState
      icon={ClipboardCheck}
      title="No submissions to grade"
      description="You're all caught up. New submissions arrive here as soon as students finish their exams."
      {...props}
    />
  )
}

export function EmptyExams({ canCreate = false, onCreate, ...rest }: PresetProps & {
  canCreate?: boolean
  onCreate?: () => void
}) {
  return (
    <EmptyState
      icon={FileQuestion}
      title="No assessments yet"
      description={
        canCreate
          ? "Build your first exam or assignment and publish it to a course."
          : "Nothing has been assigned to you. Enjoy the quiet while it lasts."
      }
      actionButton={
        canCreate && onCreate ? { label: "Create an exam", onClick: onCreate } : undefined
      }
      {...rest}
    />
  )
}

/** "Your filter matched nothing" — distinct from "this collection is empty". */
export function EmptyFiltered({
  onClear,
  entity = "results",
  ...rest
}: PresetProps & { onClear?: () => void; entity?: string }) {
  return (
    <EmptyState
      variant="filtered"
      title={`No ${entity} match this view`}
      description="Try a different filter, or clear the search to see everything."
      secondaryAction={onClear ? { label: "Clear filters", onClick: onClear } : undefined}
      {...rest}
    />
  )
}
