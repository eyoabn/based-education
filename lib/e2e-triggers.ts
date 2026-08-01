"use client"

/**
 * Phase 7 — end-to-end workflow wiring.
 *
 * This module is the seam between "an action succeeded on the server" and
 * "every surface in the browser knows about it". Three responsibilities:
 *
 *  1. **A trigger catalog** (`triggers.*`) — one named function per meaningful
 *     platform action, so the copy for "Announcement published" is written once
 *     and every call site is guaranteed to match.
 *
 *  2. **A client event bus** (`emit` / `subscribe` / `useEduEvent`) — an action
 *     in one component reaches unrelated mounted components without prop
 *     drilling or a full refetch. It is mirrored onto a `BroadcastChannel`, so
 *     a teacher publishing in one tab updates a student feed open in another —
 *     the local stand-in for the production fan-out.
 *
 *  3. **Realtime translation** (`toastFromNotification`) — the SSE stream
 *     carries `Notification` rows; this turns each one into the right toast,
 *     the right icon and the right deep link.
 *
 * Client-only: it touches `window` and imports the toast renderer. Server code
 * should keep writing `Notification` rows and calling `notifyUser`.
 */

import { createElement, useEffect, useRef } from "react"
import {
  Award,
  BellRing,
  CalendarClock,
  FileCheck2,
  FileText,
  Megaphone,
  MicOff,
  Radio,
  ShieldCheck,
  ShieldX,
  UserCheck,
  UserMinus,
  UserX,
} from "lucide-react"
import { notify, notifyIntegrity } from "@/components/ui/ToastProvider"
import { isJoinable, JOIN_WINDOW_MIN, type CalendarEvent } from "@/lib/calendar"

// ---------------------------------------------------------------------------
// Roles & smart routing
// ---------------------------------------------------------------------------

export type Role = "STUDENT" | "TEACHER" | "ADMIN"

const ROLE_HOME: Record<Role, string> = {
  STUDENT: "/dashboard/student",
  TEACHER: "/dashboard/teacher",
  ADMIN: "/dashboard/admin",
}

const ROLE_KEY = "educonnect:role"

/** Where a "Return to Dashboard" button should send this role. */
export function dashboardHome(role: Role | null | undefined): string {
  return role ? ROLE_HOME[role] : "/login"
}

/**
 * Cached so surfaces rendered outside a session — the 404 page, the error
 * boundary — can still offer a correct "back to your dashboard" link.
 */
export function rememberRole(role: Role): void {
  try {
    window.localStorage.setItem(ROLE_KEY, role)
  } catch {
    // Private browsing / storage disabled — the fallback link is still correct.
  }
}

export function recallRole(): Role | null {
  try {
    const value = window.localStorage.getItem(ROLE_KEY)
    return value === "STUDENT" || value === "TEACHER" || value === "ADMIN" ? value : null
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Client event bus
// ---------------------------------------------------------------------------

/** Mirrors the `NotificationType` enum in `prisma/schema.prisma`. */
export type NotificationType =
  | "NEW_POST"
  | "LIVE_CLASS_STARTING"
  | "CLASS_SCHEDULED"
  | "ASSIGNMENT_DUE"
  | "GRADE_RELEASED"
  | "ACCOUNT_APPROVED"
  | "EXAM_PUBLISHED"
  | "EXAM_SUBMITTED"
  | "ACCOUNT_REJECTED"
  | "ACCOUNT_SUSPENDED"
  | "ACCOUNT_REINSTATED"
  | "ROLE_CHANGED"
  | "PLATFORM_BROADCAST"

/** The shape `notifyUser()` pushes down the SSE stream. */
export interface EduNotification {
  id?: string
  type: NotificationType
  title: string
  message: string
  createdAt?: string
  isRead?: boolean
}

export interface EduEventMap {
  "post:published": { postId: string; authorName: string; excerpt: string }
  "comment:posted": { postId: string }
  "class:scheduled": { roomId: string; title: string; startsAt: string }
  "class:starting": { roomId: string; title: string; minutesUntil: number }
  "class:ended": { roomId: string }
  "exam:submitted": { examId: string; title: string; score: number | null }
  "grade:released": { submissionId: string; examTitle: string }
  "notification:received": EduNotification
}

export type EduEventType = keyof EduEventMap

const CHANNEL_NAME = "educonnect:e2e"
const EVENT_PREFIX = "educonnect:"

let channel: BroadcastChannel | null = null

function getChannel(): BroadcastChannel | null {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return null
  if (!channel) {
    channel = new BroadcastChannel(CHANNEL_NAME)
    // Re-dispatch cross-tab traffic as a local event, tagged so `emit` can tell
    // the two apart and avoid bouncing the message back out again.
    channel.onmessage = (message: MessageEvent) => {
      const { type, detail } = (message.data ?? {}) as { type?: string; detail?: unknown }
      if (!type) return
      window.dispatchEvent(new CustomEvent(EVENT_PREFIX + type, { detail }))
    }
  }
  return channel
}

/** Fire an application event locally and to every other open tab. */
export function emit<T extends EduEventType>(type: T, detail: EduEventMap[T]): void {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent(EVENT_PREFIX + type, { detail }))
  getChannel()?.postMessage({ type, detail })
}

/** Imperative subscription. Returns its own unsubscribe function. */
export function subscribe<T extends EduEventType>(
  type: T,
  handler: (detail: EduEventMap[T]) => void
): () => void {
  if (typeof window === "undefined") return () => {}

  const listener = (event: Event) => handler((event as CustomEvent).detail as EduEventMap[T])
  window.addEventListener(EVENT_PREFIX + type, listener)
  return () => window.removeEventListener(EVENT_PREFIX + type, listener)
}

/**
 * React binding for {@link subscribe}. The handler is held in a ref, so an
 * inline arrow function does not tear down and rebuild the listener on
 * every render.
 */
export function useEduEvent<T extends EduEventType>(
  type: T,
  handler: (detail: EduEventMap[T]) => void
): void {
  const saved = useRef(handler)
  saved.current = handler

  useEffect(() => subscribe(type, detail => saved.current(detail)), [type])
}

// ---------------------------------------------------------------------------
// Realtime notifications -> toasts
// ---------------------------------------------------------------------------

type Tone = "success" | "error" | "warning" | "info" | "live"

interface Presentation {
  tone: Tone
  icon: typeof BellRing
  /** Deep link offered as the toast's action button. */
  href?: (role: Role | null) => string
  actionLabel?: string
}

/**
 * One row per notification type: how it looks, and where it takes you. The
 * `NotificationDrawer` and the toast both read from here, so an alert that
 * appears as a green badge in the drawer is a green toast on arrival.
 */
export const NOTIFICATION_PRESENTATION: Record<NotificationType, Presentation> = {
  NEW_POST: {
    tone: "info",
    icon: Megaphone,
    href: role => `${dashboardHome(role ?? "STUDENT")}/feed`,
    actionLabel: "View post",
  },
  LIVE_CLASS_STARTING: {
    tone: "live",
    icon: Radio,
    href: role => `${dashboardHome(role ?? "STUDENT")}/calendar`,
    actionLabel: "Join now",
  },
  CLASS_SCHEDULED: {
    tone: "info",
    icon: CalendarClock,
    href: role => `${dashboardHome(role ?? "STUDENT")}/calendar`,
    actionLabel: "Open calendar",
  },
  ASSIGNMENT_DUE: {
    tone: "warning",
    icon: FileText,
    href: () => "/dashboard/student/exams",
    actionLabel: "Open",
  },
  GRADE_RELEASED: {
    tone: "success",
    icon: Award,
    href: () => "/dashboard/student/gradebook",
    actionLabel: "See result",
  },
  ACCOUNT_APPROVED: { tone: "success", icon: ShieldCheck },
  EXAM_PUBLISHED: {
    tone: "info",
    icon: FileText,
    href: () => "/dashboard/student/exams",
    actionLabel: "View exam",
  },
  EXAM_SUBMITTED: {
    tone: "info",
    icon: FileCheck2,
    href: () => "/dashboard/teacher/grading",
    actionLabel: "Grade now",
  },
  ACCOUNT_REJECTED: { tone: "error", icon: ShieldX },
  ACCOUNT_SUSPENDED: { tone: "error", icon: UserX },
  ACCOUNT_REINSTATED: { tone: "success", icon: UserCheck },
  ROLE_CHANGED: { tone: "info", icon: ShieldCheck },
  PLATFORM_BROADCAST: { tone: "warning", icon: BellRing },
}

/**
 * Renders an incoming realtime notification as a toast and republishes it on
 * the bus, which is what lets an open feed prepend the new post without the
 * student refreshing.
 *
 * @param navigate Router push from the calling component. Omit it and the
 *                 toast simply renders without an action button, rather than
 *                 forcing a full page load.
 */
export function toastFromNotification(
  notification: EduNotification,
  options: { role?: Role | null; navigate?: (href: string) => void } = {}
): void {
  const { role = recallRole(), navigate } = options
  const preset = NOTIFICATION_PRESENTATION[notification.type] ?? {
    tone: "info" as const,
    icon: BellRing,
  }

  const href = preset.href?.(role ?? null)

  notify[preset.tone](notification.title, notification.message, {
    icon: createElement(preset.icon, { className: "w-[18px] h-[18px]" }),
    action:
      href && navigate
        ? { label: preset.actionLabel ?? "View", onClick: () => navigate(href) }
        : undefined,
  })

  emit("notification:received", notification)
}

// ---------------------------------------------------------------------------
// Trigger catalog — one entry per platform action
// ---------------------------------------------------------------------------

const icon = (glyph: typeof BellRing) =>
  createElement(glyph, { className: "w-[18px] h-[18px]" })

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`

export const triggers = {
  // -- Module 1: authentication ------------------------------------------
  auth: {
    loggedIn(name: string, role: Role) {
      rememberRole(role)
      notify.success("Logged in successfully", `Welcome back, ${name}.`)
    },
    studentRegistered(name: string) {
      rememberRole("STUDENT")
      notify.success("Account created", `You're all set, ${name}. Jump into your feed.`)
    },
    teacherApplicationSubmitted() {
      rememberRole("TEACHER")
      notify.info(
        "Teacher application submitted for admin review",
        "We'll email you the moment an admin verifies your credentials.",
        { icon: icon(ShieldCheck), duration: 7000 }
      )
    },
    failed(message = "Check your email and password, then try again.") {
      notify.error("Sign-in failed", message)
    },
    loggedOut() {
      notify.info("Signed out", "See you next class.")
    },
  },

  // -- Module 2: feed & announcements ------------------------------------
  feed: {
    published(postId: string, authorName: string, content: string, notifiedCount?: number) {
      notify.success(
        "Announcement published & students notified",
        typeof notifiedCount === "number"
          ? `${plural(notifiedCount, "student")} received an alert.`
          : "Every enrolled student has been alerted.",
        { icon: icon(Megaphone) }
      )
      emit("post:published", {
        postId,
        authorName,
        excerpt: content.slice(0, 120),
      })
    },
    publishFailed(message = "Your draft is safe — try publishing again.") {
      notify.error("Could not publish announcement", message)
    },
    commentPosted(postId: string) {
      notify.success("Comment posted", "Your classmates can see it now.")
      emit("comment:posted", { postId })
    },
    incomingPost(authorName: string, onView?: () => void) {
      notify.info("New announcement", `${authorName} just posted to your feed.`, {
        icon: icon(Megaphone),
        action: onView ? { label: "Read it", onClick: onView } : undefined,
      })
    },
  },

  // -- Module 3: live room ------------------------------------------------
  live: {
    joined(title: string) {
      notify.live("You're in the room", `Connected to "${title}".`)
    },
    mutedByHost() {
      notify.warning("You were muted by host", "Raise your hand to request the mic.", {
        icon: icon(MicOff),
        duration: 6000,
      })
    },
    removedByHost() {
      notify.error("You were removed from the stream", "Contact your teacher if this looks wrong.", {
        icon: icon(UserMinus),
        duration: 8000,
      })
    },
    participantMuted(name: string) {
      notify.success(`${name} was muted`, undefined, { icon: icon(MicOff) })
    },
    participantRemoved(name: string) {
      notify.success(`Student ${name} removed from stream`, undefined, { icon: icon(UserX) })
    },
    allMuted(count?: number) {
      notify.success(
        "All students muted",
        typeof count === "number" ? `${plural(count, "microphone")} turned off.` : undefined,
        { icon: icon(MicOff) }
      )
    },
    roomEnded(roomId: string) {
      notify.success("Room ended for all", "Every participant has been disconnected.")
      emit("class:ended", { roomId })
    },
    hostEndedRoom() {
      notify.info("The host ended this class", "Returning you to your dashboard.")
    },
    controlFailed(action: string) {
      notify.error(`Could not ${action}`, "The live server did not accept that command.")
    },
  },

  // -- Module 4: schedules ------------------------------------------------
  schedules: {
    created(event: CalendarEvent, notifiedCount: number) {
      const when = new Date(event.startsAt).toLocaleString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
      notify.success(
        `New live class scheduled for ${when}`,
        `"${event.title}" — ${plural(notifiedCount, "student")} notified.`,
        { icon: icon(CalendarClock), duration: 6000 }
      )
      emit("class:scheduled", {
        roomId: event.roomId ?? event.id,
        title: event.title,
        startsAt: event.startsAt,
      })
    },
    createFailed(message: string) {
      notify.error("Could not schedule the class", message)
    },
    /** Fired by {@link useLiveClassWatcher} as a class enters its join window. */
    startingSoon(event: CalendarEvent, minutesUntil: number, onJoin?: () => void) {
      notify.live(
        minutesUntil <= 0 ? `"${event.title}" is live now` : `"${event.title}" starts in ${minutesUntil} min`,
        "The Join Live button is now active on your calendar.",
        {
          id: `class-soon-${event.id}`,
          duration: 10000,
          action: onJoin ? { label: "Join Live", onClick: onJoin } : undefined,
        }
      )
      emit("class:starting", {
        roomId: event.roomId ?? event.id,
        title: event.title,
        minutesUntil,
      })
    },
  },

  // -- Module 5: exams ----------------------------------------------------
  exams: {
    started(title: string) {
      notify.warning("Exam started — Fullscreen active", `"${title}" is now locked down.`, {
        icon: icon(ShieldCheck),
        duration: 6000,
      })
    },
    submitted(examId: string, title: string, score: number | null, pendingManual: number) {
      const graded = score !== null
      notify.success(
        graded ? `Exam submitted! Score: ${score}%` : "Exam submitted!",
        pendingManual > 0
          ? `${plural(pendingManual, "written answer")} awaiting your teacher's review.`
          : "Your result is already in your gradebook.",
        { icon: icon(FileCheck2), duration: 8000 }
      )
      emit("exam:submitted", { examId, title, score })
    },
    autoSubmitted(title: string) {
      notify.warning("Time's up — exam auto-submitted", `"${title}" was submitted for you.`, {
        duration: 9000,
      })
    },
    submitFailed(message = "Your answers are cached locally. Try submitting again.") {
      notify.error("Submission failed", message)
    },
    tabSwitchLogged(count: number) {
      notifyIntegrity(
        "Warning: Tab switch logged!",
        `${plural(count, "violation")} recorded. Your teacher sees this on your submission.`
      )
    },
    published(title: string, notifiedCount: number) {
      notify.success("Exam published", `"${title}" — ${plural(notifiedCount, "student")} notified.`, {
        icon: icon(FileText),
      })
    },
    newSubmission(studentName: string, examTitle: string, onGrade?: () => void) {
      notify.info("New submission", `${studentName} submitted "${examTitle}".`, {
        icon: icon(FileCheck2),
        action: onGrade ? { label: "Grade now", onClick: onGrade } : undefined,
        duration: 8000,
      })
    },
    feedbackReleased(submissionId: string, studentName: string, examTitle: string, score: number) {
      notify.success("Feedback released", `${studentName} can now see their ${score}% result.`, {
        icon: icon(Award),
      })
      emit("grade:released", { submissionId, examTitle })
    },
  },

  // -- Module 6: admin governance ----------------------------------------
  admin: {
    teacherApproved(name: string) {
      notify.success("Teacher approved successfully", `${name} can now host live rooms.`, {
        icon: icon(ShieldCheck),
      })
    },
    teacherRejected(name: string) {
      notify.warning("Application rejected", `${name} has been notified.`, { icon: icon(ShieldX) })
    },
    userStatusUpdated(name: string, detail: string) {
      notify.success("User status updated", `${name} — ${detail}`, { icon: icon(UserCheck) })
    },
    broadcastSent(recipients: number) {
      notify.success("Broadcast sent", `${plural(recipients, "user")} will see your notice.`, {
        icon: icon(BellRing),
      })
    },
    actionFailed(message: string) {
      notify.error("Action failed", message)
    },
  },
} as const

// ---------------------------------------------------------------------------
// Workflow 2: "Join Live" lights up 15 minutes before the start time
// ---------------------------------------------------------------------------

/**
 * Watches a set of calendar events and raises a toast the moment one crosses
 * into its {@link JOIN_WINDOW_MIN}-minute join window.
 *
 * The calendar already derives the *button* state from `isJoinable()` on each
 * render; this closes the other half of the loop by nudging a student who is
 * sitting on another page when the window opens. Each room fires at most once
 * per mount, tracked in a ref, so the 30-second tick does not re-toast.
 */
export function useLiveClassWatcher(
  events: CalendarEvent[],
  options: { enabled?: boolean; onJoin?: (event: CalendarEvent) => void } = {}
): void {
  const { enabled = true, onJoin } = options

  const announced = useRef<Set<string>>(new Set())
  const onJoinRef = useRef(onJoin)
  onJoinRef.current = onJoin

  useEffect(() => {
    if (!enabled || events.length === 0) return

    const check = () => {
      const now = new Date()

      for (const event of events) {
        if (event.type !== "LIVE_CLASS" || !event.roomId) continue
        if (announced.current.has(event.id)) continue
        if (!isJoinable(event, now)) continue

        const minutesUntil = Math.max(
          0,
          Math.round((new Date(event.startsAt).getTime() - now.getTime()) / 60000)
        )

        announced.current.add(event.id)
        const handler = onJoinRef.current
        triggers.schedules.startingSoon(
          event,
          minutesUntil,
          handler ? () => handler(event) : undefined
        )
      }
    }

    check()
    const timer = setInterval(check, 30_000)
    return () => clearInterval(timer)
  }, [events, enabled])
}
