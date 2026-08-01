"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { AlertTriangle, Eye, ShieldAlert, X } from "lucide-react"
import {
  countsAgainstBudget,
  VIOLATION_LABEL,
  type ExamAntiCheatConfig,
  type ViolationEvent,
  type ViolationType,
} from "@/lib/exams"

/**
 * Phase 5 — the lockdown listener.
 *
 * Renders nothing but a toast stack; its job is to watch the exam surface and
 * report. Every event is reported upward and re-verified server-side at submit
 * time — this layer raises the cost of casual cheating and creates an audit
 * trail, it is not a security boundary on its own. A determined student with
 * devtools can silence it, which is exactly why the score, the clock and the
 * violation tally are all recomputed on the server.
 */

interface AntiCheatGuardProps {
  config: ExamAntiCheatConfig
  /** Pauses every listener once the paper is submitted. */
  active: boolean
  /** Fires for each detected event; the parent owns the violation log. */
  onViolation: (event: ViolationEvent) => void
  /** Counted violations so far, for the warning copy. */
  tabSwitches: number
}

interface Toast {
  id: number
  type: ViolationType
  message: string
  severity: "warn" | "danger"
}

/** Debounce window — a tab switch fires both `visibilitychange` and `blur`. */
const DEDUPE_MS = 1_200

export default function AntiCheatGuard({
  config,
  active,
  onViolation,
  tabSwitches,
}: AntiCheatGuardProps) {
  const [toasts, setToasts] = useState<Toast[]>([])

  // Refs keep the listeners stable — re-binding them on every render would
  // drop events during the swap.
  const lastEventAt = useRef<Record<string, number>>({})
  const toastId = useRef(0)
  const onViolationRef = useRef(onViolation)
  const activeRef = useRef(active)
  const configRef = useRef(config)
  const tabSwitchesRef = useRef(tabSwitches)

  useEffect(() => {
    onViolationRef.current = onViolation
    activeRef.current = active
    configRef.current = config
    tabSwitchesRef.current = tabSwitches
  }, [onViolation, active, config, tabSwitches])

  const pushToast = useCallback((type: ViolationType, message: string, severity: Toast["severity"]) => {
    const id = ++toastId.current
    setToasts(prev => [...prev.slice(-2), { id, type, message, severity }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5_000)
  }, [])

  const report = useCallback(
    (type: ViolationType, detail?: string) => {
      if (!activeRef.current) return

      // Collapse the burst of events a single tab switch produces.
      const now = Date.now()
      const key = countsAgainstBudget(type) ? "focus-loss" : type
      if (now - (lastEventAt.current[key] ?? 0) < DEDUPE_MS) return
      lastEventAt.current[key] = now

      onViolationRef.current({ type, at: new Date().toISOString(), detail })

      if (countsAgainstBudget(type)) {
        const next = tabSwitchesRef.current + 1
        const budget = configRef.current.maxTabSwitches
        pushToast(
          type,
          next > budget
            ? `${VIOLATION_LABEL[type]}. That is ${next} of ${budget} allowed — this paper is now flagged for your teacher.`
            : `${VIOLATION_LABEL[type]}. Logged ${next} of ${budget} allowed switches.`,
          next > budget ? "danger" : "warn"
        )
      } else {
        pushToast(type, `${VIOLATION_LABEL[type]} — blocked and logged.`, "warn")
      }
    },
    [pushToast]
  )

  // --- Focus / visibility tracking -----------------------------------------
  useEffect(() => {
    if (!active || !config.trackTabSwitches) return

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") report("TAB_SWITCH")
    }
    const onBlur = () => report("WINDOW_BLUR")
    const onFullscreenChange = () => {
      // Only a departure counts; entering full-screen is the happy path.
      if (!document.fullscreenElement && configRef.current.forceFullscreen) {
        report("FULLSCREEN_EXIT")
      }
    }

    document.addEventListener("visibilitychange", onVisibilityChange)
    window.addEventListener("blur", onBlur)
    document.addEventListener("fullscreenchange", onFullscreenChange)

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange)
      window.removeEventListener("blur", onBlur)
      document.removeEventListener("fullscreenchange", onFullscreenChange)
    }
  }, [active, config.trackTabSwitches, report])

  // --- Copy / paste / right-click / shortcut blocking -----------------------
  useEffect(() => {
    if (!active || !config.blockCopyPaste) return

    const block = (type: ViolationType) => (e: Event) => {
      e.preventDefault()
      report(type)
    }

    const onCopy = block("COPY")
    const onCut = block("COPY")
    const onPaste = block("PASTE")
    const onContextMenu = block("CONTEXT_MENU")

    const onSelectStart = (e: Event) => {
      // Text selection is blocked everywhere except the essay boxes, where
      // the student legitimately needs to edit their own writing.
      const target = e.target as HTMLElement | null
      if (target?.closest("[data-exam-input]")) return
      e.preventDefault()
    }

    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      const mod = e.ctrlKey || e.metaKey

      // Devtools: F12, Ctrl/Cmd+Shift+I/J/C, Ctrl/Cmd+U (view source).
      if (
        e.key === "F12" ||
        (mod && e.shiftKey && ["i", "j", "c"].includes(key)) ||
        (mod && key === "u")
      ) {
        e.preventDefault()
        report("DEVTOOLS")
        return
      }

      // Clipboard and print shortcuts.
      if (mod && ["c", "v", "x", "a", "p", "s"].includes(key)) {
        e.preventDefault()
        report(key === "v" ? "PASTE" : "COPY")
      }
    }

    document.addEventListener("copy", onCopy)
    document.addEventListener("cut", onCut)
    document.addEventListener("paste", onPaste)
    document.addEventListener("contextmenu", onContextMenu)
    document.addEventListener("selectstart", onSelectStart)
    document.addEventListener("keydown", onKeyDown)

    return () => {
      document.removeEventListener("copy", onCopy)
      document.removeEventListener("cut", onCut)
      document.removeEventListener("paste", onPaste)
      document.removeEventListener("contextmenu", onContextMenu)
      document.removeEventListener("selectstart", onSelectStart)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [active, config.blockCopyPaste, report])

  // --- Leave-the-page confirmation -----------------------------------------
  useEffect(() => {
    if (!active) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ""
    }
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => window.removeEventListener("beforeunload", onBeforeUnload)
  }, [active])

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-20 right-6 z-[60] flex flex-col gap-2 w-[340px] pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          role="alert"
          className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg border animate-slide-in-right ${
            toast.severity === "danger"
              ? "bg-red-600 border-red-700 text-white"
              : "bg-amber-50 border-amber-300 text-amber-900"
          }`}
        >
          {toast.severity === "danger" ? (
            <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
          )}

          <div className="flex-1 min-w-0">
            <div
              className={`text-xs font-bold uppercase tracking-wide mb-0.5 ${
                toast.severity === "danger" ? "text-red-100" : "text-amber-700"
              }`}
            >
              <Eye className="w-3 h-3 inline mr-1 -mt-0.5" />
              Secure Guard
            </div>
            <p className="text-sm leading-snug font-medium">{toast.message}</p>
          </div>

          <button
            onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
            aria-label="Dismiss warning"
            className={`p-0.5 rounded transition-colors ${
              toast.severity === "danger" ? "hover:bg-red-500" : "hover:bg-amber-200"
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
