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
    todayRing: "ring-indigo-500",
    todayBadge: "bg-indigo-600",
    selected: "bg-indigo-50 border-indigo-300",
    button: "hover:bg-indigo-50 hover:text-indigo-700",
  },
  emerald: {
    todayRing: "ring-emerald-500",
    todayBadge: "bg-emerald-600",
    selected: "bg-emerald-50 border-emerald-300",
    button: "hover:bg-emerald-50 hover:text-emerald-700",
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
      className={`w-full flex items-center gap-1.5 px-1.5 py-1 rounded text-left text-[11px] leading-tight transition-colors ${style.chip} ring-1 ring-inset hover:brightness-95 ${
        joinable ? "font-bold" : "font-medium"
      }`}
      title={`${event.title} — ${toLocalTime(event.startsAt)}`}
    >
      {joinable ? (
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 animate-pulse-dot" />
      ) : (
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`} />
      )}
      <span className="tabular-nums opacity-70 shrink-0">{toLocalTime(event.startsAt)}</span>
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
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-3 sm:px-4 py-3 border-b border-slate-200 bg-slate-50/60">
        <div className="flex items-center justify-between sm:justify-start gap-2">
          <div className="flex items-center gap-1">
            <button
              onClick={() => shift(-1)}
              aria-label="Previous"
              className={`p-1.5 rounded-lg text-slate-500 transition-colors ${theme.button}`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => shift(1)}
              aria-label="Next"
              className={`p-1.5 rounded-lg text-slate-500 transition-colors ${theme.button}`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setAnchor(new Date())}
              className="ml-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200/70 transition-colors"
            >
              Today
            </button>
          </div>

          <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">{headerLabel}</h2>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2">
          {/* Month / Week toggle */}
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5">
            {(["month", "week"] as CalendarViewMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setView(mode)}
                className={`px-2.5 sm:px-3 py-1 rounded-md text-xs font-semibold capitalize transition-colors ${
                  view === mode
                    ? "bg-slate-900 text-white"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
          {headerAction}
        </div>
      </div>

      {/* Calendar Grid Container with Horizontal Scroll on Narrow Viewports */}
      <div className="overflow-x-auto">
        <div className="min-w-[620px] sm:min-w-0">
          {/* Weekday header */}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-white">
            {WEEKDAY_LABELS.map(day => (
              <div
                key={day}
                className="px-2 py-2 text-center text-[11px] font-bold uppercase tracking-wide text-slate-400"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Grid */}
          <div
            className={`grid grid-cols-7 ${loading ? "opacity-50 pointer-events-none" : ""}`}
            style={{ gridAutoRows: view === "month" ? "minmax(100px, auto)" : "minmax(220px, auto)" }}
          >
            {cells.map(cell => {
              const dayEvents = eventsByDay.get(dayKey(cell.date)) ?? []
              const isSelected = selectedDate ? isSameDay(cell.date, selectedDate) : false
              const hasJoinable = dayEvents.some(e => isJoinable(e, now))

              return (
                <div
                  key={cell.date.toISOString()}
                  onClick={() => handleDayClick(cell.date)}
                  className={`border-b border-r border-slate-100 p-1.5 flex flex-col gap-1 cursor-pointer transition-colors ${
                    cell.inCurrentMonth ? "bg-white" : "bg-slate-50/50"
                  } ${isSelected ? theme.selected : "hover:bg-slate-50"}`}
                >
                  {/* Day number */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold ${
                        cell.isToday
                          ? `${theme.todayBadge} text-white`
                          : cell.inCurrentMonth
                            ? "text-slate-700"
                            : "text-slate-300"
                      }`}
                    >
                      {cell.date.getDate()}
                    </span>
                    {hasJoinable && (
                      <Radio className="w-3 h-3 text-emerald-500 animate-pulse" aria-label="Live soon" />
                    )}
                  </div>

                  {/* Events */}
                  <div className="flex flex-col gap-1 overflow-hidden">
                    {dayEvents.slice(0, view === "month" ? 3 : 8).map(event => (
                      <EventChip
                        key={event.id}
                        event={event}
                        now={now}
                        onClick={() => onSelectEvent?.(event)}
                      />
                    ))}
                    {dayEvents.length > (view === "month" ? 3 : 8) && (
                      <span className="text-[10px] font-semibold text-slate-400 pl-1.5">
                        +{dayEvents.length - (view === "month" ? 3 : 8)} more
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Selected Day Agenda View */}
      {selectedDate && (
        <div className="p-3 sm:p-4 border-t border-slate-200 bg-slate-50/50">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Schedule for {selectedDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </h3>
            <span className="text-[11px] font-semibold text-slate-400">
              {(eventsByDay.get(dayKey(selectedDate)) ?? []).length} session(s)
            </span>
          </div>
          {(eventsByDay.get(dayKey(selectedDate)) ?? []).length === 0 ? (
            <p className="text-xs text-slate-400 py-2 italic">No classes or tasks scheduled for this day.</p>
          ) : (
            <div className="space-y-2 pt-1">
              {(eventsByDay.get(dayKey(selectedDate)) ?? []).map(event => {
                const joinable = isJoinable(event, now)
                const style = EVENT_STYLES[event.type]
                return (
                  <div
                    key={event.id}
                    onClick={() => onSelectEvent?.(event)}
                    className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-3 cursor-pointer hover:border-slate-300 transition-all"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${joinable ? "bg-emerald-500 animate-pulse-dot" : style.dot}`} />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate">{event.title}</div>
                        <div className="text-[11px] text-slate-500">
                          {toLocalTime(event.startsAt)}
                          {event.endsAt ? ` – ${toLocalTime(event.endsAt)}` : ""}
                          {event.courseTitle ? ` · ${event.courseTitle}` : ""}
                        </div>
                      </div>
                    </div>
                    {joinable ? (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500 text-white text-[11px] font-bold shrink-0 animate-pulse">
                        Join Live
                      </span>
                    ) : (
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold shrink-0 ${style.chip}`}>
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
      <div className="flex flex-wrap items-center gap-3 sm:gap-4 px-3 sm:px-4 py-2.5 border-t border-slate-200 bg-slate-50/60 text-xs text-slate-500">
        {(Object.keys(EVENT_STYLES) as (keyof typeof EVENT_STYLES)[]).map(type => (
          <div key={type} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${EVENT_STYLES[type].dot}`} />
            {EVENT_STYLES[type].label}
          </div>
        ))}
        <div className="flex items-center gap-1.5 sm:ml-auto">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-dot" />
          Joinable now
        </div>
      </div>
    </div>
  )
}
