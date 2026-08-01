"use client"

import { AlertTriangle, X } from "lucide-react"

interface ShutdownModalProps {
  onConfirm: () => void
  onCancel: () => void
}

export default function ShutdownModal({ onConfirm, onCancel }: ShutdownModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />

      {/* Modal */}
      <div className="relative bg-[#0e1525] border border-red-500/30 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl shadow-black/50">
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 p-1 rounded-lg hover:bg-white/5 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon */}
        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 mb-5 mx-auto">
          <AlertTriangle className="w-8 h-8 text-red-400" />
        </div>

        <h2 className="text-xl font-bold text-white text-center mb-2">End Class for Everyone?</h2>
        <p className="text-slate-400 text-center text-sm mb-8 leading-relaxed">
          This will immediately disconnect <strong className="text-slate-200">all participants</strong> from the
          live session. This action cannot be undone.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-300 font-semibold hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <AlertTriangle className="w-4 h-4" />
            End for All
          </button>
        </div>
      </div>
    </div>
  )
}
