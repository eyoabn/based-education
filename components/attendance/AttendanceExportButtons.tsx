"use client"

import { useState } from "react"
import { Check, Download, Printer } from "lucide-react"
import { buildAttendanceCsv, type AttendanceReport } from "@/lib/attendance"

interface AttendanceExportButtonsProps {
  report: AttendanceReport
}

/** `"Physics 101"` + a date -> `"physics-101-2026-08-01-attendance.csv"`. */
function buildFilename(report: AttendanceReport): string {
  const slug = report.room.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50)
  const date = new Date(report.room.scheduledAt).toISOString().slice(0, 10)
  return `${slug || "class"}-${date}-attendance.csv`
}

export default function AttendanceExportButtons({ report }: AttendanceExportButtonsProps) {
  const [downloaded, setDownloaded] = useState(false)

  const handleExportCsv = () => {
    const csv = buildAttendanceCsv(report)

    // BOM so Excel opens UTF-8 names (accents, non-Latin scripts) correctly.
    const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)

    const link = document.createElement("a")
    link.href = url
    link.download = buildFilename(report)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    // Revoking immediately can cancel the download in some browsers.
    setTimeout(() => URL.revokeObjectURL(url), 1000)

    setDownloaded(true)
    setTimeout(() => setDownloaded(false), 2000)
  }

  // The print stylesheet in globals.css hides `.no-print` chrome and expands
  // `.print-container`, so the browser's "Save as PDF" produces a clean report.
  const handlePrint = () => window.print()

  const disabled = report.rows.length === 0

  return (
    <div className="no-print flex items-center gap-2">
      <button
        onClick={handleExportCsv}
        disabled={disabled}
        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
      >
        {downloaded ? (
          <>
            <Check className="w-4 h-4 text-emerald-600" />
            Downloaded
          </>
        ) : (
          <>
            <Download className="w-4 h-4" />
            Export to CSV
          </>
        )}
      </button>

      <button
        onClick={handlePrint}
        disabled={disabled}
        className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
      >
        <Printer className="w-4 h-4" />
        Print / Export PDF
      </button>
    </div>
  )
}
