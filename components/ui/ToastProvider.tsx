"use client"

import { type ReactNode } from "react"
import { Toaster, toast } from "sonner"
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
  Radio,
  ShieldAlert,
  X,
  XCircle,
} from "lucide-react"

/**
 * Phase 7 — the single feedback surface for the whole platform.
 *
 * Every module (auth, feed, live, schedules, exams, admin) routes its
 * confirmations through here instead of hand-rolling a banner in local state,
 * so a student who is muted mid-lecture and an admin who approves a teacher
 * get visually identical, predictably-positioned feedback.
 *
 * `sonner` supplies the stack, the enter/exit springs and the swipe-to-dismiss
 * gesture; every toast body is our own `<ToastCard>` rendered through
 * `toast.custom`, which keeps the visual language under our control rather than
 * inheriting the library's defaults.
 *
 * Domain-specific wrappers live in `lib/e2e-triggers.ts` — reach for those
 * first; drop down to `notify` here only for one-off messages.
 */

export type ToastTone = "success" | "error" | "warning" | "info" | "live" | "loading"

const TONES: Record<
  ToastTone,
  { icon: ReactNode; rail: string; chip: string; ring: string }
> = {
  success: {
    icon: <CheckCircle2 className="w-[18px] h-[18px]" />,
    rail: "bg-emerald-500",
    chip: "bg-emerald-50 text-emerald-600",
    ring: "ring-emerald-500/10",
  },
  error: {
    icon: <XCircle className="w-[18px] h-[18px]" />,
    rail: "bg-red-500",
    chip: "bg-red-50 text-red-600",
    ring: "ring-red-500/10",
  },
  warning: {
    icon: <AlertTriangle className="w-[18px] h-[18px]" />,
    rail: "bg-amber-500",
    chip: "bg-amber-50 text-amber-600",
    ring: "ring-amber-500/10",
  },
  info: {
    icon: <Info className="w-[18px] h-[18px]" />,
    rail: "bg-indigo-500",
    chip: "bg-indigo-50 text-indigo-600",
    ring: "ring-indigo-500/10",
  },
  live: {
    icon: <Radio className="w-[18px] h-[18px]" />,
    rail: "bg-red-500",
    chip: "bg-red-50 text-red-600",
    ring: "ring-red-500/10",
  },
  loading: {
    icon: <Loader2 className="w-[18px] h-[18px] animate-spin" />,
    rail: "bg-slate-400",
    chip: "bg-slate-100 text-slate-500",
    ring: "ring-slate-500/10",
  },
}

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface ToastOptions {
  /** Bold first line. Keep it under ~48 characters so it never wraps. */
  title: string
  /** Optional supporting line — the "what happens next" detail. */
  description?: ReactNode
  tone?: ToastTone
  /** Milliseconds on screen. `Infinity` pins the toast until dismissed. */
  duration?: number
  /** Overrides the tone's default glyph (e.g. a module-specific icon). */
  icon?: ReactNode
  action?: ToastAction
  /**
   * Reuse an id to collapse repeats — a student spamming "Join" gets one
   * toast that updates in place rather than a wall of duplicates.
   */
  id?: string
}

type ToastId = string | number

function ToastCard({
  toastId,
  title,
  description,
  tone = "info",
  icon,
  action,
}: ToastOptions & { toastId: ToastId }) {
  const style = TONES[tone]

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`relative flex w-full items-start gap-3 overflow-hidden rounded-xl border border-slate-200/80 bg-white/95 py-3.5 pl-4 pr-3 shadow-[0_8px_30px_rgba(15,23,42,0.12)] ring-1 backdrop-blur-xl ${style.ring}`}
    >
      {/* Tone rail — readable at a glance before the copy is even parsed. */}
      <span className={`absolute inset-y-0 left-0 w-1 ${style.rail}`} aria-hidden />

      <span
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${style.chip}`}
        aria-hidden
      >
        {icon ?? style.icon}
      </span>

      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-sm font-bold leading-snug text-slate-900">{title}</p>
        {description && (
          <p className="mt-0.5 text-[13px] leading-snug text-slate-500">{description}</p>
        )}

        {action && (
          <button
            type="button"
            onClick={() => {
              action.onClick()
              toast.dismiss(toastId)
            }}
            className="mt-2 inline-flex items-center rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
          >
            {action.label}
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => toast.dismiss(toastId)}
        aria-label="Dismiss notification"
        className="-mr-0.5 mt-0.5 shrink-0 rounded-md p-1 text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

/** Low-level entry point. Prefer the `notify.*` helpers below. */
export function showToast(options: ToastOptions): ToastId {
  const { duration, id, ...rest } = options

  return toast.custom(toastId => <ToastCard toastId={toastId} {...rest} />, {
    id,
    duration: duration ?? (rest.tone === "error" ? 6500 : 4500),
  })
}

/**
 * Tone-shorthand API. Every call takes `(title, description?, extra?)` so call
 * sites stay one line:
 *
 *   notify.success("Exam submitted!", "Score: 85%")
 */
type Extra = Omit<ToastOptions, "title" | "description" | "tone">

const tone =
  (t: ToastTone) =>
  (title: string, description?: ReactNode, extra?: Extra): ToastId =>
    showToast({ title, description, tone: t, ...extra })

export const notify = {
  success: tone("success"),
  error: tone("error"),
  warning: tone("warning"),
  info: tone("info"),
  live: tone("live"),
  /** Pinned spinner toast. Pass the returned id to `notify.settle`. */
  loading: (title: string, description?: ReactNode, extra?: Extra): ToastId =>
    showToast({ title, description, tone: "loading", duration: Infinity, ...extra }),
  /** Replaces a pending `loading` toast in place — no flicker, no stacking. */
  settle: (id: ToastId, options: ToastOptions): ToastId =>
    showToast({ ...options, id: String(id) }),
  dismiss: (id?: ToastId) => toast.dismiss(id),
}

/**
 * Mounted once in the root layout. `richColors` and the built-in chrome are
 * deliberately off — `toast.custom` renders the entire card, so sonner only
 * owns positioning and motion.
 */
export default function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      offset={20}
      gap={10}
      visibleToasts={4}
      expand
      toastOptions={{
        unstyled: true,
        // sonner measures this element, so the width has to live here rather
        // than on the card, or stacked toasts collapse to zero height.
        className: "w-full font-sans",
      }}
      style={{ width: "380px", maxWidth: "calc(100vw - 32px)" }}
    />
  )
}

/** Escalated, non-dismissing variant for integrity/security events. */
export function notifyIntegrity(title: string, description?: ReactNode): ToastId {
  return showToast({
    title,
    description,
    tone: "warning",
    icon: <ShieldAlert className="h-[18px] w-[18px]" />,
    duration: 8000,
  })
}
