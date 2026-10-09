"use client"

import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, Radio } from "lucide-react"
import {
  buildMonthGrid,
  buildWeekGrid,
  dayKey,
  EVENT_STYLES,
  groupEventsByDay,
  isJoinable,
  isSameDay,
  monthLabel,
  toLocalTime,
  WEEKDAY_LABELS,
  type CalendarEvent,
} from "@/lib/calendar"

export type CalendarViewMode = "month" | "week"

interface ScheduleCalendarProps {
  events: CalendarEvent[]
  /** Highlight colour family — teacher pages are emerald, student indigo. */
  accent?: "indigo" | "emerald"
  /** Clicking a day cell (teachers use this to pre-fill the new-class date). */
  onSelectDate?: (date: Date) => void
  onSelectEvent?: (event: CalendarEvent) => void
  /** Extra controls rendered in the header, e.g. a "Schedule New Class" button. */
  headerAction?: React.ReactNode
  loading?: boolean
}

const ACCENTS = {
  indigo: {
    todayRing: "ring-[#d4af37]",
    todayBadge: "bg-gradient-to-r from-[#d4af37] to-[#e6ca65] text-[#050505] font-bold shadow-sm",
    selected: "bg-[rgba(212,175,55,0.12)] border-[rgba(212,175,55,0.4)]",
    button: "hover:bg-white/[0.06] hover:text-[#d4af37] text-[#9d9b95]",
  },
  emerald: {
    todayRing: "ring-[#d4af37]",
    todayBadge: "bg-gradient-to-r from-[#d4af37] to-[#e6ca65] text-[#050505] font-bold shadow-sm",
    selected: "bg-[rgba(212,175,55,0.12)] border-[rgba(212,175,55,0.4)]",
    button: "hover:bg-white/[0.06] hover:text-[#d4af37] text-[#9d9b95]",
  },
}

/** Compact event chip shown inside a month-grid cell. */
function EventChip({
  event,
  onClick,
  now,
}: {
  event: CalendarEvent
  onClick?: () => void
  now: Date
}) {
  const style = EVENT_STYLES[event.type]
  const joinable = isJoinable(event, now)

  return (
    <button
      onClick={e => {
        e.stopPropagation()
        onClick?.()
      }}
      className={`w-full flex items-center gap-1.5 px-2 py-1 rounded-lg text-left text-[11px] leading-tight transition-all ${style.chip} hover:brightness-110 ${
        joinable ? "font-bold shadow-xs shadow-emerald-500/20" : "font-medium"
      }`}
      title={`${event.title} — ${toLocalTime(event.startsAt)}`}
    >
      {joinable ? (
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 animate-pulse-dot" />
      ) : (
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`} />
      )}
      <span className="tabular-nums opacity-75 shrink-0">{toLocalTime(event.startsAt)}</span>
      <span className="truncate">{event.title}</span>
    </button>
  )
}

export default function ScheduleCalendar({
  events,
  accent = "indigo",
  onSelectDate,
  onSelectEvent,
  headerAction,
  loading = false,
}: ScheduleCalendarProps) {
  const [anchor, setAnchor] = useState<Date>(() => new Date())
  const [view, setView] = useState<CalendarViewMode>("month")
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  // A single "now" per render keeps every cell's live/joinable check consistent.
  const now = useMemo(() => new Date(), [events])
  const theme = ACCENTS[accent]

  const cells = useMemo(
    () => (view === "month" ? buildMonthGrid(anchor, now) : buildWeekGrid(anchor, now)),
    [anchor, view, now]
  )

  const eventsByDay = useMemo(() => groupEventsByDay(events), [events])

  const shift = (direction: -1 | 1) => {
    setAnchor(prev => {
      const next = new Date(prev)
      if (view === "month") next.setMonth(prev.getMonth() + direction)
      else next.setDate(prev.getDate() + direction * 7)
      return next
    })
  }

  const handleDayClick = (date: Date) => {
    setSelectedDate(date)
    onSelectDate?.(date)
  }

  const headerLabel =
    view === "month"
      ? monthLabel(anchor)
      : `${cells[0].date.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${cells[6].date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`

  return (
    <div className="bg-[#111110] rounded-2xl border border-white/[0.08] shadow-xl shadow-black/40 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-3 sm:px-4 py-3.5 border-b border-white/[0.08] bg-[#181817]/60">
        <div className="flex items-center justify-between sm:justify-start gap-2">
          <div className="flex items-center gap-1">
            <button
              onClick={() => shift(-1)}
              aria-label="Previous"
              className={`p-1.5 rounded-lg transition-colors ${theme.button}`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => shift(1)}
              aria-label="Next"
              className={`p-1.5 rounded-lg transition-colors ${theme.button}`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setAnchor(new Date())}
              className="ml-1 px-3 py-1.5 rounded-xl border border-white/[0.08] bg-[#141413] text-xs font-semibold text-[#f7f3e8] hover:border-[rgba(212,175,55,0.3)] hover:text-[#d4af37] transition-all"
            >
              Today
            </button>
          </div>

          <h2 className="text-sm sm:text-base font-bold text-[#f7f3e8] tracking-tight">{headerLabel}</h2>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2">
          {/* Month / Week toggle */}
          <div className="flex items-center bg-[#141413] border border-white/[0.08] rounded-xl p-0.5">
            {(["month", "week"] as CalendarViewMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setView(mode)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                  view === mode
                    ? "bg-gradient-to-r from-[#d4af37] to-[#e6ca65] text-[#050505] font-bold shadow-sm"
                    : "text-[#9d9b95] hover:text-[#f7f3e8]"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
          {headerAction}
        </div>
      </div>

      {/* Calendar Grid — responsive, no forced min-width */}
      <div>
        {/* Weekday header */}
        <div className="grid grid-cols-7 border-b border-white/[0.08] bg-[#141413]">
          {WEEKDAY_LABELS.map(day => (
            <div
              key={day}
              className="px-0 py-2.5 text-center text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#9d9b95]"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Grid cells */}
        <div
          className={`grid grid-cols-7 ${loading ? "opacity-50 pointer-events-none" : ""}`}
        >
          {cells.map(cell => {
            const dayEvents = eventsByDay.get(dayKey(cell.date)) ?? []
            const isSelected = selectedDate ? isSameDay(cell.date, selectedDate) : false
            const hasJoinable = dayEvents.some(e => isJoinable(e, now))

            return (
              <div
                key={cell.date.toISOString()}
                onClick={() => handleDayClick(cell.date)}
                className={`border-b border-r border-white/[0.06] cursor-pointer transition-colors ${
                  cell.inCurrentMonth ? "bg-[#111110]" : "bg-[#0b0b0a]/70"
                } ${isSelected ? theme.selected : "hover:bg-[#181817]/70"}`}
                style={{ minHeight: view === "month" ? undefined : "180px" }}
              >
                {/* Day number area */}
                <div className="flex items-center justify-between p-1.5 sm:p-2 mb-0.5">
                  <span
                    className={`inline-flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full text-[11px] sm:text-xs font-semibold shrink-0 ${
                      cell.isToday
                        ? theme.todayBadge
                        : cell.inCurrentMonth
                          ? "text-[#f7f3e8]"
                          : "text-[#9d9b95]/35"
                    }`}
                  >
                    {cell.date.getDate()}
                  </span>
                  {hasJoinable && (
                    <Radio className="w-3 h-3 text-emerald-400 animate-pulse shrink-0" aria-label="Live soon" />
                  )}
                </div>

                {/* Event chips — only shown on sm+ screens or week view */}
                <div className="hidden sm:flex flex-col gap-0.5 pb-1.5 px-1">
                  {dayEvents.slice(0, view === "month" ? 3 : 8).map(event => (
                    <EventChip
                      key={event.id}
                      event={event}
                      now={now}
                      onClick={() => onSelectEvent?.(event)}
                    />
                  ))}
                  {dayEvents.length > (view === "month" ? 3 : 8) && (
                    <span className="text-[10px] font-semibold text-[#d4af37] pl-1.5">
                      +{dayEvents.length - (view === "month" ? 3 : 8)} more
                    </span>
                  )}
                </div>

                {/* Mobile: just show dot indicators */}
                <div className="sm:hidden flex items-center justify-center flex-wrap gap-0.5 pb-1.5 px-0.5">
                  {dayEvents.slice(0, 3).map(event => {
                    const style = EVENT_STYLES[event.type]
                    const joinable = isJoinable(event, now)
                    return (
                      <span
                        key={event.id}
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${joinable ? "bg-emerald-400" : style.dot}`}
                      />
                    )
                  })}
                  {dayEvents.length > 3 && (
                    <span className="text-[9px] font-bold text-[#d4af37]">+{dayEvents.length - 3}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Selected Day Agenda View */}
      {selectedDate && (
        <div className="p-3 sm:p-5 border-t border-white/[0.08] bg-[#181817]/50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#d4af37]">
              Schedule for {selectedDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </h3>
            <span className="text-[11px] font-semibold text-[#9d9b95]">
              {(eventsByDay.get(dayKey(selectedDate)) ?? []).length} session(s)
            </span>
          </div>
          {(eventsByDay.get(dayKey(selectedDate)) ?? []).length === 0 ? (
            <p className="text-xs text-[#9d9b95] py-2 italic">No classes or assessments scheduled for this day.</p>
          ) : (
            <div className="space-y-2 pt-1">
              {(eventsByDay.get(dayKey(selectedDate)) ?? []).map(event => {
                const joinable = isJoinable(event, now)
                const style = EVENT_STYLES[event.type]
                return (
                  <div
                    key={event.id}
                    onClick={() => onSelectEvent?.(event)}
                    className="p-3.5 bg-[#141413] rounded-xl border border-white/[0.08] flex items-center justify-between gap-3 cursor-pointer hover:border-[rgba(212,175,55,0.3)] hover:bg-[#1a1a19] transition-all"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${joinable ? "bg-emerald-400 animate-pulse-dot" : style.dot}`} />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#f7f3e8] truncate">{event.title}</div>
                        <div className="text-[11px] text-[#9d9b95]">
                          {toLocalTime(event.startsAt)}
                          {event.endsAt ? ` – ${toLocalTime(event.endsAt)}` : ""}
                          {event.courseTitle ? ` · ${event.courseTitle}` : ""}
                        </div>
                      </div>
                    </div>
                    {joinable ? (
                      <span className="px-3 py-1 rounded-full bg-emerald-500 text-[#050505] text-[11px] font-bold shrink-0 animate-pulse">
                        Join Live
                      </span>
                    ) : (
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${style.chip}`}>
                        {style.label}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 sm:gap-4 px-3 sm:px-4 py-3 border-t border-white/[0.08] bg-[#141413] text-xs text-[#9d9b95]">
        {(Object.keys(EVENT_STYLES) as (keyof typeof EVENT_STYLES)[]).map(type => (
          <div key={type} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${EVENT_STYLES[type].dot}`} />
            <span>{EVENT_STYLES[type].label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 sm:ml-auto">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-dot" />
          <span className="text-[#f7f3e8]">Joinable now</span>
        </div>
      </div>
    </div>
  )
}
