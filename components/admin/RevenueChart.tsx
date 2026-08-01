"use client"

import { useMemo, useState } from "react"
import { Table2 } from "lucide-react"
import { formatMoney, type RevenuePoint } from "@/lib/admin"

interface RevenueChartProps {
  data: RevenuePoint[]
  /** Rendered as the chart's caption. */
  title?: string
  subtitle?: string
}

/**
 * Monthly platform earnings, as a stacked column chart.
 *
 * Why stacked and not two lines: commission and payout are **parts of one
 * whole** — they sum to gross by construction — so the stack encodes the split
 * and the total in a single mark. Two measures on one axis is only legitimate
 * because both are dollars; a second y-scale would not be.
 *
 * Palette: indigo #4F46E5 / teal #0D9488, validated for CVD separation against
 * a white surface (worst-pair ΔE 10.7 protan, 27.1 normal — both clear).
 * Identity never rests on hue alone: a legend is always present, the newest
 * column is directly labelled, and the data table below is one click away.
 */

const SERIES = {
  commission: { color: "#4F46E5", label: "Platform commission" },
  payout: { color: "#0D9488", label: "Teacher payouts" },
} as const

// Chart coordinate space. The SVG scales to its container, so these are
// aspect-ratio units rather than pixels.
const VIEW_W = 760
const VIEW_H = 280
const PAD = { top: 28, right: 16, bottom: 34, left: 62 }

const PLOT_W = VIEW_W - PAD.left - PAD.right
const PLOT_H = VIEW_H - PAD.top - PAD.bottom

const MAX_BAR_W = 24
const SEGMENT_GAP = 2 // the surface gap that separates stacked segments
const CORNER = 4

/** Round a maximum up to a clean axis top: 1 / 2 / 5 × 10ⁿ. */
function niceMax(value: number): number {
  if (value <= 0) return 100
  const magnitude = 10 ** Math.floor(Math.log10(value))
  const normalized = value / magnitude
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10
  return step * magnitude
}

/** A rect with rounded top corners and a square base, per the mark spec. */
function topRoundedPath(x: number, y: number, w: number, h: number, r: number): string {
  const radius = Math.min(r, h, w / 2)
  return [
    `M ${x} ${y + h}`,
    `L ${x} ${y + radius}`,
    `Q ${x} ${y} ${x + radius} ${y}`,
    `L ${x + w - radius} ${y}`,
    `Q ${x + w} ${y} ${x + w} ${y + radius}`,
    `L ${x + w} ${y + h}`,
    "Z",
  ].join(" ")
}

export default function RevenueChart({
  data,
  title = "Monthly earnings",
  subtitle,
}: RevenueChartProps) {
  const [hovered, setHovered] = useState<number | null>(null)
  const [showTable, setShowTable] = useState(false)

  const { max, ticks, band, barW } = useMemo(() => {
    const peak = data.reduce((highest, point) => Math.max(highest, point.grossCents), 0)
    const max = niceMax(peak)
    const band = data.length ? PLOT_W / data.length : PLOT_W
    return {
      max,
      ticks: [0, 0.25, 0.5, 0.75, 1].map(fraction => max * fraction),
      band,
      barW: Math.min(MAX_BAR_W, band * 0.55),
    }
  }, [data])

  const hasRevenue = data.some(point => point.grossCents > 0)
  const yOf = (cents: number) => PAD.top + PLOT_H - (cents / max) * PLOT_H
  const centerOf = (index: number) => PAD.left + band * index + band / 2

  const active = hovered !== null ? data[hovered] : null

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      {/* Header + legend */}
      <div className="px-5 pt-5 pb-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-slate-900">{title}</h3>
          {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-4">
          {/* Legend — always present, because two series must never be
              distinguished by colour alone. */}
          <div className="flex items-center gap-3">
            {(Object.keys(SERIES) as (keyof typeof SERIES)[]).map(key => (
              <span key={key} className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                <span
                  className="w-2.5 h-2.5 rounded-sm"
                  style={{ backgroundColor: SERIES[key].color }}
                />
                {SERIES[key].label}
              </span>
            ))}
          </div>

          <button
            onClick={() => setShowTable(prev => !prev)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <Table2 className="w-3.5 h-3.5" />
            {showTable ? "Hide table" : "Data table"}
          </button>
        </div>
      </div>

      {/* Plot */}
      <div className="relative px-2 pb-3">
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="w-full h-auto"
          role="img"
          aria-label={`${title}: platform commission and teacher payouts by month`}
          onMouseLeave={() => setHovered(null)}
        >
          {/* Gridlines + y ticks */}
          {ticks.map(tick => (
            <g key={tick}>
              <line
                x1={PAD.left}
                x2={VIEW_W - PAD.right}
                y1={yOf(tick)}
                y2={yOf(tick)}
                stroke="#E2E8F0"
                strokeWidth={1}
              />
              <text
                x={PAD.left - 10}
                y={yOf(tick) + 4}
                textAnchor="end"
                className="fill-slate-400"
                style={{ fontSize: 11, fontVariantNumeric: "tabular-nums" }}
              >
                {formatMoney(tick, { compact: true })}
              </text>
            </g>
          ))}

          {data.map((point, index) => {
            const center = centerOf(index)
            const x = center - barW / 2
            const isHovered = hovered === index
            const isLast = index === data.length - 1

            const commissionH = (point.commissionCents / max) * PLOT_H
            const payoutH = (point.payoutCents / max) * PLOT_H
            const commissionY = PAD.top + PLOT_H - commissionH
            // The gap between segments is carved out of the upper one, so the
            // stack still tops out at the true gross.
            const payoutH2 = Math.max(payoutH - SEGMENT_GAP, 0)
            const payoutY = commissionY - SEGMENT_GAP - payoutH2

            return (
              <g key={point.month} opacity={hovered === null || isHovered ? 1 : 0.55}>
                {/* Commission — bottom of the stack, square at the baseline */}
                {commissionH > 0 && (
                  <path
                    d={
                      payoutH2 > 0
                        ? `M ${x} ${commissionY} h ${barW} v ${commissionH} h ${-barW} Z`
                        : topRoundedPath(x, commissionY, barW, commissionH, CORNER)
                    }
                    fill={SERIES.commission.color}
                  />
                )}

                {/* Payout — the rounded data-end */}
                {payoutH2 > 0 && (
                  <path
                    d={topRoundedPath(x, payoutY, barW, payoutH2, CORNER)}
                    fill={SERIES.payout.color}
                  />
                )}

                {/* Direct label on the newest column only — sparing, so it works */}
                {isLast && point.grossCents > 0 && (
                  <text
                    x={center}
                    y={Math.min(payoutY, commissionY) - 8}
                    textAnchor="middle"
                    className="fill-slate-700"
                    style={{ fontSize: 11, fontWeight: 700 }}
                  >
                    {formatMoney(point.grossCents, { compact: true })}
                  </text>
                )}

                {/* X tick */}
                <text
                  x={center}
                  y={VIEW_H - 12}
                  textAnchor="middle"
                  className={isHovered ? "fill-slate-700" : "fill-slate-400"}
                  style={{ fontSize: 11, fontWeight: isHovered ? 600 : 400 }}
                >
                  {point.label}
                </text>

                {/* Hit target — the full band, so hovering never needs precision */}
                <rect
                  x={PAD.left + band * index}
                  y={PAD.top}
                  width={band}
                  height={PLOT_H}
                  fill="transparent"
                  onMouseEnter={() => setHovered(index)}
                />
              </g>
            )
          })}

          {/* Baseline */}
          <line
            x1={PAD.left}
            x2={VIEW_W - PAD.right}
            y1={PAD.top + PLOT_H}
            y2={PAD.top + PLOT_H}
            stroke="#CBD5E1"
            strokeWidth={1}
          />
        </svg>

        {/* Tooltip — positioned in percentages so it tracks the scaled SVG */}
        {active && (
          <div
            className="absolute pointer-events-none z-10 -translate-x-1/2 -translate-y-full"
            style={{
              left: `${(centerOf(hovered!) / VIEW_W) * 100}%`,
              top: `${(yOf(active.grossCents) / VIEW_H) * 100}%`,
            }}
          >
            <div className="mb-2 px-3 py-2 rounded-lg bg-slate-900 text-white shadow-lg min-w-[172px]">
              <div className="text-[11px] font-semibold text-slate-300 mb-1.5">{active.label}</div>
              <div className="flex items-center justify-between gap-4 text-xs mb-1">
                <span className="inline-flex items-center gap-1.5 text-slate-300">
                  <span
                    className="w-2 h-2 rounded-sm"
                    style={{ backgroundColor: SERIES.commission.color }}
                  />
                  Commission
                </span>
                <span className="font-semibold tabular-nums">
                  {formatMoney(active.commissionCents)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 text-xs mb-1.5">
                <span className="inline-flex items-center gap-1.5 text-slate-300">
                  <span
                    className="w-2 h-2 rounded-sm"
                    style={{ backgroundColor: SERIES.payout.color }}
                  />
                  Payouts
                </span>
                <span className="font-semibold tabular-nums">{formatMoney(active.payoutCents)}</span>
              </div>
              <div className="flex items-center justify-between gap-4 text-xs pt-1.5 border-t border-white/15">
                <span className="text-slate-300">
                  Gross · {active.paymentCount} payment{active.paymentCount === 1 ? "" : "s"}
                </span>
                <span className="font-bold tabular-nums">{formatMoney(active.grossCents)}</span>
              </div>
            </div>
          </div>
        )}

        {!hasRevenue && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="px-4 py-2 rounded-lg bg-white/90 border border-slate-200 text-sm text-slate-500">
              No payments recorded in this window yet.
            </div>
          </div>
        )}
      </div>

      {/* Table view — the non-visual path to the same numbers */}
      {showTable && (
        <div className="border-t border-slate-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                  Month
                </th>
                <th className="text-right px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                  Commission
                </th>
                <th className="text-right px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                  Payouts
                </th>
                <th className="text-right px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                  Gross
                </th>
                <th className="text-right px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                  Payments
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map(point => (
                <tr key={point.month} className="hover:bg-slate-50">
                  <td className="px-5 py-2 text-slate-600">{point.month}</td>
                  <td className="px-5 py-2 text-right text-slate-700 tabular-nums">
                    {formatMoney(point.commissionCents)}
                  </td>
                  <td className="px-5 py-2 text-right text-slate-700 tabular-nums">
                    {formatMoney(point.payoutCents)}
                  </td>
                  <td className="px-5 py-2 text-right font-semibold text-slate-800 tabular-nums">
                    {formatMoney(point.grossCents)}
                  </td>
                  <td className="px-5 py-2 text-right text-slate-500 tabular-nums">
                    {point.paymentCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
